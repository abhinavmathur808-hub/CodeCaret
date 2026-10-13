/* ══════════════════════════════════════════════════════════════
   elo — rating changes for an asynchronous time trial.

   CodeCaret is single-player. There is no live opponent and no
   matchmaking, so the classical "did you beat the other player"
   term has to come from somewhere else: a target WPM drawn from
   what everyone else has already done on this exact snippet.

   Two things follow from that, and both differ from tournament Elo:

   1. The opponent is a NUMBER, not a rated player. Its rating is
      synthesised from the target WPM, so a hard snippet where the
      field averages 90 WPM is a stronger opponent than an easy one
      where the field averages 45.

   2. The result is CONTINUOUS, not win/draw/loss. Beating the
      target by one word per minute and beating it by forty are not
      the same performance, and a binary score would throw that
      away — which in a time trial is most of the signal.

   Accuracy is deliberately not a separate term: this app's WPM is
   already computed from correct keystrokes only, so a sloppy run
   has a lower WPM by construction. Multiplying by accuracy again
   would penalise the same mistakes twice.
   ══════════════════════════════════════════════════════════════ */

/** Standard Elo K-factor. */
const K_FACTOR = 32;

/** Everyone starts here, and it is the rating a 50 WPM target maps to. */
const DEFAULT_RATING = 1200;

/* Target WPM -> synthetic opponent rating.
   Anchored so BASE + 50 * PER_WPM === DEFAULT_RATING: a snippet the
   field averages 50 WPM on is an exactly even match for a new
   account, which makes the starting rating mean something. */
const RATING_BASE = 800;
const RATING_PER_WPM = 8;

/* How many WPM above the target counts as a decisive win. At one
   spread ahead the score is ~0.76, at two ~0.91 — so there is real
   headroom left for a great run rather than the curve saturating
   the moment you edge in front. */
const WPM_SPREAD = 25;

/* Ratings cannot run away in either direction. The floor stops a
   bad week from digging a hole that takes months to climb out of;
   the ceiling is far above any human typing speed. */
const MIN_RATING = 100;
const MAX_RATING = 3000;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** The rating a given target WPM is treated as. */
function wpmToRating(wpm) {
  return clamp(RATING_BASE + wpm * RATING_PER_WPM, MIN_RATING, MAX_RATING);
}

/**
 * Classical Elo expectation: the share of the point a player of
 * `rating` is predicted to take against `opponentRating`.
 */
function expectedScore(rating, opponentRating) {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

/**
 * What the racer actually scored, 0..1.
 *
 * A logistic on the WPM difference rather than a step at zero, so
 * the reward scales with the margin. Matching the target scores
 * exactly 0.5, which is what makes "no change" the outcome of an
 * average run.
 */
function actualScore(wpm, targetWpm) {
  return 1 / (1 + 10 ** ((targetWpm - wpm) / WPM_SPREAD));
}

/**
 * Rate one completed lap against an asynchronous target.
 *
 * @param {object}  input
 * @param {number}  input.rating     Current rating.
 * @param {number}  input.wpm        WPM just posted.
 * @param {number?} input.targetWpm  The field's pace on this snippet.
 * @param {string?} input.source     Where the target came from, for the
 *                                   client to explain the change.
 * @returns {{ rated: boolean, delta: number, rating: number,
 *             targetWpm: number|null, source: string|null,
 *             expected: number|null, scored: number|null }}
 */
function rateRace({ rating, wpm, targetWpm, source = null }) {
  const current = clamp(
    Number.isFinite(rating) ? rating : DEFAULT_RATING,
    MIN_RATING,
    MAX_RATING
  );

  /* An unraced snippet has no field to measure against. Inventing
     one would hand out ratings based on a number nobody earned, so
     the lap is simply unrated — it still counts for WPM and the
     streak, it just does not move the rating. */
  if (!Number.isFinite(targetWpm) || targetWpm <= 0 || !Number.isFinite(wpm)) {
    return {
      rated: false,
      delta: 0,
      rating: current,
      targetWpm: null,
      source: null,
      expected: null,
      scored: null,
    };
  }

  const opponentRating = wpmToRating(targetWpm);
  const expected = expectedScore(current, opponentRating);
  const scored = actualScore(wpm, targetWpm);

  const delta = Math.round(K_FACTOR * (scored - expected));
  const next = clamp(current + delta, MIN_RATING, MAX_RATING);

  return {
    rated: true,
    /* Report the delta that was actually applied. At the clamp
       boundary the arithmetic delta and the real change differ, and
       showing "+14" while the rating moved by 3 would be a lie. */
    delta: next - current,
    rating: next,
    targetWpm,
    source,
    expected: Math.round(expected * 1000) / 1000,
    scored: Math.round(scored * 1000) / 1000,
  };
}

/**
 * Pick the asynchronous opponent for a snippet.
 *
 * Prefers the field average: it is the most stable measure of how
 * hard the snippet is, and it moves slowly. The record holder's
 * ghost is the fallback for a snippet only one person has raced —
 * a real human's telemetry, just a much harsher yardstick, which is
 * why it is second choice rather than first.
 *
 * A record you set yourself is skipped: racing your own ghost is
 * practice, not competition, and rating it would let anyone farm
 * their own rating on a snippet nobody else has touched.
 *
 * @param {object?} snippet  The catalogue row, if one exists.
 * @param {string}  userId   Who is racing, to exclude their own ghost.
 */
function pickTarget(snippet, userId) {
  if (!snippet) return { targetWpm: null, source: null };

  if (Number.isFinite(snippet.avgWpm) && snippet.avgWpm > 0) {
    return { targetWpm: snippet.avgWpm, source: "field-average" };
  }

  if (
    Number.isFinite(snippet.recordWpm) &&
    snippet.recordWpm > 0 &&
    String(snippet.recordHolderId || "") !== String(userId)
  ) {
    return { targetWpm: snippet.recordWpm, source: "ghost-record" };
  }

  return { targetWpm: null, source: null };
}

module.exports = {
  rateRace,
  pickTarget,
  wpmToRating,
  expectedScore,
  actualScore,
  K_FACTOR,
  DEFAULT_RATING,
  MIN_RATING,
  MAX_RATING,
};
