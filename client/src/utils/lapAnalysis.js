/* ══════════════════════════════════════════════════════════════
   lapAnalysis — what a finished lap's timings say about the racer.

   The engine records, for every character, the elapsed ms at which
   the caret passed it (the same array that drives the ghost and that
   the server verifies), plus how many wrong keys were pressed on it.
   From those two arrays this works out:

   • a heat map of the lap — which characters took longest — for the
     lap review on the results screen;
   • symbol fluency — which symbols cost you time or accuracy, measured
     against how fast you type plain lowercase letters in the same lap,
     so the figure means the same thing at 40 WPM as at 120;
   • a running total of that across laps, kept in this browser, which
     the profile reads;
   The drill — the track densest in the symbols slowing you down — is
   in symbolDrill.js, which needs the snippet catalogue; this file does
   not, so the profile can read your symbol totals without loading
   every track.

   Pure functions apart from the storage helpers, so the unit tests can
   pin them down.
   ══════════════════════════════════════════════════════════════ */

export const SYMBOL_STATS_KEY = "cc_symbol_stats";

/* A key held up longer than this was a pause to read ahead or think,
   not a slow reach, and would swamp everything else on that symbol. */
const SAMPLE_CAP_MS = 2000;

/* Letters and digits are grouped: what matters is the symbols, and
   "you are slow on q" is noise next to "you are slow on {". */
const CLASS_LABELS = { lower: "a–z", upper: "A–Z", digit: "0–9" };

/* Too few samples and one hesitation decides the verdict — unless
   that one key was so slow it is plainly not noise. */
const MIN_LAP_SAMPLES = 2;
const LONE_SAMPLE_RATIO = 2.5;
const MIN_TOTAL_SAMPLES = 6;

/* Fewer timed symbols than this and a lap cannot say much either way. */
const THIN_LAP_SYMBOLS = 6;

/* Slower than letters by at least this much before it is called out. */
const SLOW_RATIO = 1.3;

/** The group a character is measured in, or null for whitespace. */
export function keyOf(ch) {
  if (ch === " " || ch === "\n" || ch === "\t" || ch === "\r") return null;
  if (ch >= "a" && ch <= "z") return "lower";
  if (ch >= "A" && ch <= "Z") return "upper";
  if (ch >= "0" && ch <= "9") return "digit";
  return ch;
}

export const labelOf = (key) => CLASS_LABELS[key] ?? key;
export const isSymbolKey = (key) => key != null && !(key in CLASS_LABELS);

function median(values) {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * How long each character took to type, in ms, or null where that is
 * unknown: the first character (the clock starts on it) and anything
 * the engine stepped over for you — an indent run under one Tab, the
 * whitespace skipped after Enter — which all share one timestamp.
 */
export function charDurations(times) {
  const out = new Array(times.length).fill(null);
  for (let i = 1; i < times.length; i++) {
    const dt = times[i] - times[i - 1];
    if (Number.isFinite(dt) && dt > 0) out[i] = dt;
  }
  return out;
}

/** Per-group samples for one lap: the shared walk behind both reports. */
function groupLap(text, times, misses = []) {
  const chars = Array.from(text);
  const dts = charDurations(times);
  const groups = new Map();
  const end = Math.min(times.length, chars.length);
  for (let i = 0; i < end; i++) {
    const key = keyOf(chars[i]);
    if (!key) continue;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { key, count: 0, misses: 0, samples: [] }));
    g.count++;
    g.misses += misses[i] > 0 ? misses[i] : 0;
    if (dts[i] != null) g.samples.push(Math.min(dts[i], SAMPLE_CAP_MS));
  }
  return groups;
}

/**
 * Symbol fluency for one lap.
 *
 * @returns {{ baselineMs: number|null, slow: object[], missed: object[], thin: boolean }}
 *   `slow`: symbols that took at least 1.3× your letter pace, slowest
 *   first. `missed`: symbols you mistyped, most often first. `thin`:
 *   the lap had too few timed symbols to judge by.
 */
export function lapSymbols(text, times, misses = []) {
  const groups = groupLap(text, times, misses);
  const baselineMs = median(groups.get("lower")?.samples ?? []);

  const rows = [...groups.values()].map((g) => {
    const ms = median(g.samples);
    return {
      key: g.key,
      label: labelOf(g.key),
      count: g.count,
      misses: g.misses,
      samples: g.samples.length,
      ms,
      ratio: baselineMs && ms ? ms / baselineMs : null,
    };
  });

  const symbols = rows.filter((r) => isSymbolKey(r.key));
  return {
    baselineMs,
    thin: symbols.reduce((n, r) => n + r.samples, 0) < THIN_LAP_SYMBOLS,
    slow: symbols
      .filter(
        (r) =>
          r.ratio >= SLOW_RATIO &&
          (r.samples >= MIN_LAP_SAMPLES || (r.samples === 1 && r.ratio >= LONE_SAMPLE_RATIO))
      )
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 4),
    missed: symbols
      .filter((r) => r.misses > 0)
      .sort((a, b) => b.misses - a.misses || (b.ratio ?? 0) - (a.ratio ?? 0))
      .slice(0, 4),
  };
}

/**
 * Every character of the lap with how it went, for the lap review.
 * `level` runs 0 (quicker than your usual key) to 4 (three times as
 * slow or worse); null where there is no timing to judge.
 */
export function lapHeat(text, times, misses = []) {
  const dts = charDurations(times);
  const usual = median(dts.filter((v) => v != null)) || 1;
  return Array.from(text).map((ch, i) => {
    const dt = dts[i] ?? null;
    let level = null;
    if (dt != null) {
      const r = dt / usual;
      level = r < 0.8 ? 0 : r < 1.3 ? 1 : r < 2 ? 2 : r < 3 ? 3 : 4;
    }
    return { ch, dt, level, missed: misses[i] > 0, typed: i < times.length };
  });
}

/* ── Across laps ───────────────────────────────────────────────
   Sums rather than samples, so the store stays a few hundred bytes
   however many laps it has seen. Means of capped samples rather than
   medians as a result — the cap is what keeps those honest. */

const emptyStats = () => ({ v: 1, laps: 0, keys: {} });

/** Fold one lap into the running totals. Returns a new object. */
export function foldLap(stats, text, times, misses = []) {
  const next = { v: 1, laps: (stats?.laps ?? 0) + 1, keys: { ...(stats?.keys ?? {}) } };
  for (const g of groupLap(text, times, misses).values()) {
    const prev = next.keys[g.key] ?? { n: 0, ms: 0, hits: 0, misses: 0 };
    next.keys[g.key] = {
      n: prev.n + g.samples.length,
      ms: prev.ms + g.samples.reduce((a, b) => a + b, 0),
      hits: prev.hits + g.count,
      misses: prev.misses + g.misses,
    };
  }
  return next;
}

/**
 * Long-run fluency from the stored totals: every symbol with enough
 * samples, its pace against your letters, and how often you miss it.
 */
export function symbolProfile(stats) {
  const keys = stats?.keys ?? {};
  const lower = keys.lower;
  const baselineMs = lower?.n ? lower.ms / lower.n : null;
  const rows = Object.entries(keys)
    .filter(([key, v]) => isSymbolKey(key) && v.n >= MIN_TOTAL_SAMPLES)
    .map(([key, v]) => {
      const ms = v.ms / v.n;
      return {
        key,
        label: labelOf(key),
        ms,
        ratio: baselineMs ? ms / baselineMs : null,
        hits: v.hits,
        missRate: v.hits ? v.misses / v.hits : 0,
      };
    });
  return {
    laps: stats?.laps ?? 0,
    baselineMs,
    rows: rows.sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0)),
  };
}

export function readSymbolStats() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SYMBOL_STATS_KEY) || "null");
    return parsed && parsed.v === 1 && parsed.keys ? parsed : emptyStats();
  } catch {
    return emptyStats();
  }
}

/** Bank a lap in this browser's totals. Never throws. */
export function recordSymbolStats(text, times, misses) {
  if (!text || !Array.isArray(times) || times.length < 2) return;
  try {
    localStorage.setItem(SYMBOL_STATS_KEY, JSON.stringify(foldLap(readSymbolStats(), text, times, misses)));
  } catch {
    // Storage full or blocked: the lap review still showed it.
  }
}
