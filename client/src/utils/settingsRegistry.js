/* ══════════════════════════════════════════════════════════════
   settingsRegistry — the one list of what counts as "a setting".

   Every preference is a `cc_*` key in localStorage, written from
   half a dozen places. That was fine while settings only had to
   survive a refresh, but syncing them to an account needs a single
   answer to three questions: which keys are settings, what is each
   one's default, and how does a value round-trip through JSON.

   Deliberately NOT in here: `cc_token`, `cc_user` (credentials, not
   preferences) and `practice_stats` (a record of what you did, not
   a choice you made — syncing it would let a second device
   overwrite a day's practice).
   ══════════════════════════════════════════════════════════════ */

/* value: [storageKey, defaultValue, kind]
   kind decides serialisation: "json" round-trips through JSON,
   "raw" is stored as a bare string, "number" parses back. */
export const SETTINGS = [
  // Race setup
  ["cc_languages", ["C++"], "json"],
  ["cc_codeLength", "short", "raw"],
  ["cc_density", "any", "raw"],
  ["cc_topic", "any", "raw"],
  ["cc_timeLimit", 30, "number"],

  // Custom snippet
  ["cc_customSnippet", "", "raw"],
  ["cc_useCustom", false, "json"],

  // Training
  ["practice_goal_ms", 15 * 60 * 1000, "number"],

  // Typing behaviour
  ["cc_caretStyle", "thin", "raw"],
  ["cc_strictMode", false, "json"],
  ["cc_autoIndent", true, "json"],
  ["cc_freedomMode", false, "json"],
  ["cc_showKeyboard", true, "json"],

  // Focus
  ["cc_zenMode", false, "json"],
  ["cc_hideLiveWpm", false, "json"],
  ["cc_blindMode", false, "json"],
  ["cc_highlightMode", "character", "raw"],
  ["cc_caretBlink", true, "json"],
  ["cc_smoothCaret", true, "json"],
  ["cc_ghostCaret", true, "json"],
  ["cc_ghostSource", "mine", "raw"],

  // Audio
  ["cc_soundProfile", "off", "raw"],
  ["cc_soundVolume", 0.5, "number"],
  ["cc_engineerVerbosity", "full", "raw"],

  // Appearance
  ["cc_globalFont", "Default", "raw"],
  ["cc_fontSize", "2rem", "raw"],
  ["cc_lineHeight", "1.8", "raw"],
  ["cc_theme", "carbon", "raw"],
];

const KIND = new Map(SETTINGS.map(([key, , kind]) => [key, kind]));

function decode(key, raw) {
  const kind = KIND.get(key);
  if (raw === null) return undefined;
  if (kind === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }
  if (kind === "json") {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  return raw;
}

function encode(key, value) {
  const kind = KIND.get(key);
  if (kind === "number") return String(value);
  if (kind === "json") return JSON.stringify(value);
  return String(value);
}

/** Everything currently stored, as a plain object ready to POST. */
export function collectSettings() {
  const out = {};
  for (const [key] of SETTINGS) {
    try {
      const value = decode(key, localStorage.getItem(key));
      if (value !== undefined) out[key] = value;
    } catch {
      // Storage unavailable — skip this key rather than fail the lot.
    }
  }
  return out;
}

/**
 * Write a settings object into localStorage.
 *
 * Unknown keys are ignored: a payload from a newer client version
 * must not be able to write arbitrary keys into storage.
 *
 * @returns {boolean} whether anything actually changed — the caller
 *   uses this to decide if a remount is needed, so a sync that
 *   matches what is already local costs nothing.
 */
export function applySettings(settings) {
  if (!settings || typeof settings !== "object") return false;
  let changed = false;

  for (const [key] of SETTINGS) {
    if (!Object.prototype.hasOwnProperty.call(settings, key)) continue;
    try {
      const next = encode(key, settings[key]);
      if (localStorage.getItem(key) !== next) {
        localStorage.setItem(key, next);
        changed = true;
      }
    } catch {
      // Non-fatal.
    }
  }
  return changed;
}

/**
 * Put every setting back to its default.
 * Credentials and practice history are untouched — see the note at
 * the top of this file.
 */
export function resetSettings() {
  for (const [key, fallback] of SETTINGS) {
    try {
      localStorage.setItem(key, encode(key, fallback));
    } catch {
      // Non-fatal.
    }
  }
  return defaultSettings();
}

export function defaultSettings() {
  const out = {};
  for (const [key, fallback] of SETTINGS) out[key] = fallback;
  return out;
}
