/* ══════════════════════════════════════════════════════════════
   snippetPool — what a race can draw, and how it is drawn.

   The catalogue (code corpus + English warm-up passages), the language,
   topic, symbol-density and length filters, and the picker that relaxes
   them in order. Plain functions with no React in them, so the race
   page imports them and the unit tests exercise them directly.
   ══════════════════════════════════════════════════════════════ */

import codeSnippets from "./codeSnippets";
import englishPassages from "./englishPassages";

/* Dataset language name → Prism grammar key. English has no grammar:
   RaceTrack shows it as plain text. The key also names the language a
   custom paste is filed under in the race log, and "english" is what
   tells the server a lap was a warm-up. */
export const PRISM_LANGUAGE = {
  "C++": "cpp",
  Python: "python",
  JavaScript: "javascript",
  English: "english",
};

/* Code is what CodeCaret races. English is a warm-up: plain prose,
   chosen on its own — it never mixes with code in one session — and
   kept out of the rating and the global leaderboard by the server
   (WARMUP_LANGUAGES in server/routes/races.js). */
export const CODE_LANGUAGES = ["C++", "Python", "JavaScript"];
export const WARMUP_LANGUAGE = "English";
export const LANGUAGES = [...CODE_LANGUAGES, WARMUP_LANGUAGE];
export const isWarmup = (langs) => langs.includes(WARMUP_LANGUAGE);

/* English is exclusive, so a stored list holding it beside code can
   only be stale or hand-edited; the code languages win. */
export function exclusiveLanguages(list) {
  return list.length > 1 && isWarmup(list)
    ? list.filter((l) => l !== WARMUP_LANGUAGE)
    : list;
}

/* Every track a race can draw from: the code corpus, and the warm-up
   passages, which only come up while English is the language. */
export const CATALOGUE = [...codeSnippets, ...englishPassages];

/* Points kept in the telemetry graph. One per second of racing, so
   this is a little over twenty minutes of detail — far beyond any
   timed race, and a bound for the zen mode that has no limit. */
export const MAX_WPM_POINTS = 1400;

/* ── Format race time as M:SS.ms ──────────────────────────────
   At module scope because it closes over nothing: the share card is
   built in a memo above the point where an in-component copy would
   be declared, and calling it there would hit the temporal dead zone. */
export const formatRaceTime = (ms) => {
  /* Whole milliseconds first, then integer arithmetic: going through
     seconds, 2405 ms came out as 2.405 % 1 * 1000 = 404.999… and was
     shown a millisecond short. */
  const total = Math.max(0, Math.floor(ms));
  const m = Math.floor(total / 60000);
  const sec = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${m}:${sec.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
};

/**
 * The language mix, migrating anyone who still has the old
 * single-language `cc_language` key so their existing choice carries
 * over instead of silently resetting to C++.
 */
export function readStoredLanguages() {
  try {
    const raw = localStorage.getItem("cc_languages");
    if (raw) {
      const parsed = JSON.parse(raw);
      const valid = Array.isArray(parsed)
        ? parsed.filter((l) => LANGUAGES.includes(l))
        : [];
      if (valid.length > 0) return exclusiveLanguages(valid);
    }
    const legacy = localStorage.getItem("cc_language");
    if (legacy && LANGUAGES.includes(legacy)) return [legacy];
  } catch {
    // Storage unavailable — fall through to the default.
  }
  return ["C++"];
}

/* ── Symbol density ───────────────────────────────────────────
   The share of non-whitespace characters that are punctuation or
   operators — brackets, semicolons, arrows, comparisons. It is a
   good proxy for "how much of this is reaching for the number row
   and the pinky keys" rather than plain words.

   Thresholds were picked by measuring the whole dataset. At 514
   snippets they split it 186 light / 167 medium / 161 heavy, and
   every one of the 27 language x length x density combinations
   still has snippets in it, so no ordinary filter choice can empty
   the pool. Re-measure if the corpus grows a lot.
   ────────────────────────────────────────────────────────────── */
export const DENSITY_LIGHT_MAX = 0.22;
export const DENSITY_MEDIUM_MAX = 0.27;

export const DENSITY_OPTIONS = [
  { id: "any", label: "Any" },
  { id: "light", label: "Light" },
  { id: "medium", label: "Medium" },
  { id: "heavy", label: "Heavy" },
];

export function symbolDensity(code) {
  const solid = code.replace(/\s/g, "");
  if (solid.length === 0) return 0;
  return (solid.match(/[^\w]/g) || []).length / solid.length;
}

export function densityBand(code) {
  const d = symbolDensity(code);
  if (d < DENSITY_LIGHT_MAX) return "light";
  if (d < DENSITY_MEDIUM_MAX) return "medium";
  return "heavy";
}

/* Computed once — every snippet is a static literal, so the band can
   never change and re-deriving it on each draw would be wasted work. */
export const SNIPPET_BANDS = new WeakMap();
export function bandOf(snippet) {
  let band = SNIPPET_BANDS.get(snippet);
  if (band === undefined) {
    band = densityBand(snippet.code);
    SNIPPET_BANDS.set(snippet, band);
  }
  return band;
}

/* Topic vocabulary, mirroring the labels stamped on the dataset by
   scripts/labelSnippets.cjs. Ordered roughly easiest-first so the
   picker reads as a progression rather than an alphabetical jumble. */
export const TOPIC_OPTIONS = [
  { id: "any", label: "Any" },
  { id: "basics", label: "Basics" },
  { id: "math", label: "Math" },
  { id: "strings", label: "Strings" },
  { id: "arrays", label: "Arrays" },
  { id: "matrix", label: "Matrix" },
  { id: "hashing", label: "Hashing" },
  { id: "searching", label: "Searching" },
  { id: "sorting", label: "Sorting" },
  { id: "stack-queue", label: "Stack/Queue" },
  { id: "linked-list", label: "Linked List" },
  { id: "trees", label: "Trees" },
  { id: "heap", label: "Heaps" },
  { id: "graphs", label: "Graphs" },
  { id: "dp", label: "DP" },
  { id: "recursion", label: "Recursion" },
  { id: "bits", label: "Bits" },
  { id: "functional", label: "Functional" },
  { id: "oop", label: "OOP" },
  { id: "async", label: "Async" },
];

/** The topic a track is shown under; every warm-up passage is "Warm-up". */
export const topicLabelOf = (snippet) =>
  snippet.language === WARMUP_LANGUAGE
    ? "Warm-up"
    : TOPIC_OPTIONS.find((t) => t.id === snippet.topic)?.label ?? null;

/**
 * Pick a random snippet matching the selected languages, length,
 * topic and symbol density.
 *
 * Filters are relaxed in reverse order of how much you probably
 * care: density first, then length, then topic. Someone who asked
 * for "graphs" wants a graph snippet far more than they want a
 * short one, so length yields before topic does. Language is never
 * relaxed — a race in a language you did not pick is useless.
 */
/**
 * Every snippet the current filters resolve to. Shared by the picker
 * and by the UI that reports how many tracks are available, so the
 * number on screen can never disagree with what actually gets drawn.
 */
export function poolFor(languages, codeLength, density = "any", topic = "any") {
  const langs = Array.isArray(languages) ? languages : [languages];
  const byLanguage = CATALOGUE.filter((s) => langs.includes(s.language));
  if (byLanguage.length === 0) return [];

  /* Topic and symbol density describe code; a warm-up ignores both,
     so a stored code topic cannot narrow the passages it draws. */
  const prose = isWarmup(langs);
  const byTopic =
    topic === "any" || prose ? byLanguage : byLanguage.filter((s) => s.topic === topic);
  const topicPool = byTopic.length > 0 ? byTopic : byLanguage;

  const byLength = topicPool.filter((s) => s.length === codeLength);
  const lengthPool = byLength.length > 0 ? byLength : topicPool;

  const byDensity =
    density === "any" || prose
      ? lengthPool
      : lengthPool.filter((s) => bandOf(s) === density);

  return byDensity.length > 0 ? byDensity : lengthPool;
}

export function pickSnippet(
  languages,
  codeLength,
  density = "any",
  topic = "any",
  excludeId = null
) {
  let pool = poolFor(languages, codeLength, density, topic);
  if (pool.length === 0) return null;

  /* "Next track" handing back the track you just finished reads as a
     broken button. Drop the current one — but only while something
     else remains, since narrow filters legitimately resolve to a
     single snippet and repeating it beats showing nothing. */
  if (excludeId && pool.length > 1) {
    const fresh = pool.filter((s) => s.id !== excludeId);
    if (fresh.length > 0) pool = fresh;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * pickSnippet, but never empty-handed: the race page always needs a
 * track on screen. Every stored language list is validated on the way
 * in, so the fallback only covers the impossible case — and being a
 * real catalogue track, it still has an id, a board and a ghost.
 */
export function drawSnippet(...args) {
  return pickSnippet(...args) ?? CATALOGUE[0];
}
