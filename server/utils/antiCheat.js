/**
 * Anti-cheat telemetry verification for CodeCaret races.
 *
 * Analyzes keystroke data and final WPM to detect automated scripts,
 * macros, and copy-paste bots before race results are committed.
 */

/** Minimum standard deviation (ms) of keystroke deltas.
 *  Real humans produce high-variance typing with bursts and
 *  micro-pauses; bots and macros produce eerily consistent deltas. */
const MIN_DELTA_STDDEV = 12;

/** Absolute maximum WPM for code syntax — beyond human capability.
 *  Enforced in verifyRun below. It previously lived only in a
 *  verifyTelemetry() that nothing ever called, so the "biological
 *  limit" was documented but never applied: the only ceiling a
 *  submission actually met was the route's MAX_WPM of 500. */
const WPM_BIOLOGICAL_LIMIT = 300;

/* ══════════════════════════════════════════════════════════════
   verifyRun — the check that actually guards POST /api/races.

   The client reports its own WPM, so on its own that number is a
   claim, not a measurement. This re-derives it from the keystroke
   timings the client also sends and refuses the submission when the
   two disagree. Forging a record now means forging a self-consistent
   timing array of the right length and human-looking distribution,
   rather than editing one integer.

   ── On the shape of `timestamps` ─────────────────────────────
   The array is the ghost-lap recording: ONE ENTRY PER CHARACTER,
   holding the elapsed ms at which the caret passed that character —
   not one entry per keypress.

   That distinction drives two things that would otherwise be wrong:

   1. Characters the engine auto-advances through (a Tab covering an
      indent run, the whitespace skipped after Enter) all carry the
      SAME timestamp, because one key moved the caret several places.
      Consecutive equal timestamps are therefore normal typing, not
      evidence of a macro. Treating a 0 ms delta as cheating would
      fail nearly every indented snippet — the measured false-
      positive rate on real laps was 100%. So deltas are computed
      between PRESS EVENTS (runs of equal timestamps collapsed to
      one), which is what a human actually did.

   2. `timestamps.length` counts characters, while the reported WPM
      counts CORRECT keystrokes. They differ by the auto-advanced
      characters and by every mistake. Deriving WPM from the array
      length alone therefore overstates it on any real lap, so the
      recomputation uses the correct-keystroke count and the array is
      used to bound it: you cannot have typed more correct characters
      than the caret passed.

   ── On the denominator ───────────────────────────────────────
   The span between the first and last keystroke is NOT how long
   the race took. On a lap that ran out of time, the racer may have
   stopped typing well before the clock did, and every second of
   that tail belongs in the denominator — the client's own WPM is
   computed over it.

   Measuring only the span made the two disagree by exactly the
   length of the pause: a 30s lap whose last keystroke landed at 28s
   came out 6.7% fast here, over the 5% tolerance, and a genuine run
   was refused for stopping to think. Anything beyond about a second
   and a half of hesitation was rejected.

   So the client also reports the duration it divided by, and the
   larger of the two is used. Taking the LARGER is what keeps this
   safe to accept from the client: a bigger denominator can only
   lower the recomputed WPM, so overstating it refuses your own run
   and understating it is ignored in favour of the span the
   telemetry itself proves.
   ══════════════════════════════════════════════════════════════ */

/** Reported WPM may drift this much from the recomputed figure. */
const WPM_TOLERANCE = 0.05;

/** Below this many press events, timing statistics mean nothing. */
const MIN_PRESSES_FOR_TIMING = 12;

/**
 * Press-to-press gaps at or under this are treated as inhuman. 1 ms
 * apart is roughly 6000 WPM instantaneous; the fastest recorded
 * humans sit near 40 ms between keys.
 */
const INHUMAN_DELTA_MS = 1;

/** How many inhuman gaps are tolerated before the run is refused. */
const MAX_INHUMAN_DELTAS = 3;

/** Hard ceiling on array size, so telemetry cannot be a DoS vector. */
const MAX_TIMESTAMPS = 20000;

/**
 * Collapse a per-character timing array into per-press timings.
 *
 * A run of identical timestamps is one keypress that moved the caret
 * several characters. Returns the distinct press times in order.
 */
function toPressEvents(timestamps) {
  const presses = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (i === 0 || timestamps[i] !== timestamps[i - 1]) {
      presses.push(timestamps[i]);
    }
  }
  return presses;
}

/**
 * Verify a submitted run against its own telemetry.
 *
 * @param {number}  clientWpm  WPM as reported by the client.
 * @param {number[]} timestamps Per-character elapsed times (ms).
 * @param {number}  timeLimit  Race time limit in seconds, 0 for none.
 * @param {boolean} completed  Whether the whole snippet was typed.
 * @param {object}  [opts]
 * @param {number}  [opts.correctKeystrokes] Correct presses, as counted
 *        by the client. The WPM formula's numerator; bounded against
 *        the telemetry rather than trusted.
 * @param {number}  [opts.durationMs] How long the client measured the
 *        lap as running, in ms — the denominator its own WPM came
 *        from. Only ever used when it is LONGER than the keystroke
 *        span; see the note on the denominator above. Absent (an
 *        older client) falls back to the span alone.
 * @returns {{ valid: boolean, reason: string|null, details: object }}
 */
function verifyRun(clientWpm, timestamps, timeLimit, completed, opts = {}) {
  const details = {
    clientWpm,
    serverWpm: null,
    characters: Array.isArray(timestamps) ? timestamps.length : 0,
    presses: 0,
    spanMs: null,
    durationMs: null,
    drift: null,
    inhumanDeltas: 0,
    deltaStdDev: null,
  };

  // ── Validation 1: telemetry must exist for a completed lap ──
  if (!Array.isArray(timestamps) || timestamps.length === 0) {
    /* An incomplete run that never got going has nothing to verify
       and nothing to gain — it cannot take a record or a personal
       best. Refusing it would break the ordinary "start a race, walk
       away" path. A COMPLETED lap with no telemetry is different:
       that is the shape a forged submission takes. */
    if (completed) {
      return {
        valid: false,
        reason: "Completed run carried no keystroke telemetry",
        details,
      };
    }
    return { valid: true, reason: null, details };
  }

  if (timestamps.length > MAX_TIMESTAMPS) {
    return {
      valid: false,
      reason: `Telemetry of ${timestamps.length} entries exceeds the ${MAX_TIMESTAMPS} limit`,
      details,
    };
  }

  // Every entry must be a finite, non-negative number.
  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    if (typeof t !== "number" || !Number.isFinite(t) || t < 0) {
      return {
        valid: false,
        reason: `Telemetry entry ${i} is not a valid elapsed time`,
        details,
      };
    }
    // The caret only moves forward, so arrival times never regress.
    if (i > 0 && t < timestamps[i - 1]) {
      return {
        valid: false,
        reason: `Telemetry goes backwards at entry ${i}`,
        details,
      };
    }
  }

  const presses = toPressEvents(timestamps);
  details.presses = presses.length;

  const spanMs = timestamps[timestamps.length - 1] - timestamps[0];

  // ── Validation 2: recompute the WPM ────────────────────────
  /* Numerator is the correct-keystroke count, not the array length:
     the array counts characters the caret passed, which includes
     auto-advanced runs and mistakes. Bounded by the telemetry so the
     client cannot simply inflate it. */
  const claimedCorrect = Number.isFinite(opts.correctKeystrokes)
    ? opts.correctKeystrokes
    : timestamps.length;

  if (claimedCorrect < 0 || claimedCorrect > timestamps.length) {
    return {
      valid: false,
      reason: `Reported ${claimedCorrect} correct keystrokes across only ${timestamps.length} characters`,
      details,
    };
  }

  if (spanMs <= 0) {
    /* Every character at the same instant is a paste, not a lap.
       Deliberately tested on the span and not on the duration below:
       a paste dressed up with a plausible duration is still a paste,
       and the timings are the part that cannot be faked cheaply. */
    return {
      valid: false,
      reason: "Telemetry spans no time at all",
      details,
    };
  }

  /* The lap's real length: the keystroke span, or the client's own
     measurement when it is longer because the racer stopped typing
     before the clock ran out. Larger-of-the-two only ever lowers the
     recomputed WPM — see the note on the denominator above. */
  const reportedMs = Number.isFinite(opts.durationMs) ? opts.durationMs : 0;
  const effectiveMs = Math.max(spanMs, reportedMs > 0 ? reportedMs : 0);

  details.spanMs = Math.round(spanMs);
  details.durationMs = reportedMs > 0 ? Math.round(reportedMs) : null;

  const serverWpm = claimedCorrect / 5 / (effectiveMs / 60000);
  details.serverWpm = Math.round(serverWpm * 100) / 100;

  /* No human types code this fast, whatever the telemetry says. The
     drift check below only asks whether the claim is CONSISTENT with
     the timings — a forged array and a matching WPM agree perfectly
     with each other — so without an absolute ceiling the only cap a
     submission met was the route's MAX_WPM of 500, well past
     anything a person has done. */
  if (serverWpm > WPM_BIOLOGICAL_LIMIT || clientWpm > WPM_BIOLOGICAL_LIMIT) {
    return {
      valid: false,
      reason: `${Math.round(Math.max(serverWpm, clientWpm))} WPM exceeds the ${WPM_BIOLOGICAL_LIMIT} WPM human limit`,
      details,
    };
  }

  // ── Validation 3: tolerance ────────────────────────────────
  /* Relative to the larger of the two so a tiny reported value
     cannot make a huge absolute gap look proportionally small. */
  const scale = Math.max(Math.abs(clientWpm), Math.abs(serverWpm), 1);
  const drift = Math.abs(serverWpm - clientWpm) / scale;
  details.drift = Math.round(drift * 1000) / 1000;

  if (drift > WPM_TOLERANCE) {
    return {
      valid: false,
      reason: `Reported ${clientWpm} WPM but telemetry gives ${details.serverWpm} (${(drift * 100).toFixed(1)}% drift)`,
      details,
    };
  }

  /* The lap cannot outlast the race's own limit. Generous slack: the
     limit is enforced client-side by a timer that fires on a frame
     boundary, and the last keystroke can legitimately land just after
     it.

     Checked against the effective duration rather than the span, so
     the reported figure is bounded too — otherwise it would be the
     one input to the WPM recomputation with no ceiling on it. */
  if (timeLimit > 0 && effectiveMs > timeLimit * 1000 + 2000) {
    return {
      valid: false,
      reason: `Telemetry spans ${Math.round(effectiveMs / 1000)}s under a ${timeLimit}s limit`,
      details,
    };
  }

  // ── Validation 4: bot detection ────────────────────────────
  if (presses.length < MIN_PRESSES_FOR_TIMING) {
    /* Too short to say anything statistically. The WPM cross-check
       above already applied, which is the part that matters. */
    return { valid: true, reason: null, details };
  }

  const deltas = [];
  let inhuman = 0;
  for (let i = 1; i < presses.length; i++) {
    const d = presses[i] - presses[i - 1];
    deltas.push(d);
    if (d <= INHUMAN_DELTA_MS) inhuman++;
  }
  details.inhumanDeltas = inhuman;

  if (inhuman > MAX_INHUMAN_DELTAS) {
    return {
      valid: false,
      reason: `${inhuman} keystrokes landed within ${INHUMAN_DELTA_MS}ms of each other`,
      details,
    };
  }

  const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  const variance =
    deltas.reduce((s, d) => s + (d - mean) ** 2, 0) / deltas.length;
  const stdDev = Math.sqrt(variance);
  details.deltaStdDev = Math.round(stdDev * 100) / 100;

  /* Humans burst and hesitate. A macro replays one interval. This
     threshold is deliberately low — the cost of a false positive here
     is a real lap thrown away, which is worse than a forged one
     getting through a check that is only one of four. */
  if (stdDev < MIN_DELTA_STDDEV) {
    return {
      valid: false,
      reason: `Keystroke intervals are unnaturally uniform (std-dev ${details.deltaStdDev}ms, mean ${Math.round(mean)}ms)`,
      details,
    };
  }

  return { valid: true, reason: null, details };
}

module.exports = {
  verifyRun,
  toPressEvents,
  WPM_TOLERANCE,
  MIN_DELTA_STDDEV,
  INHUMAN_DELTA_MS,
  MAX_TIMESTAMPS,
  WPM_BIOLOGICAL_LIMIT,
};
