/* ══════════════════════════════════════════════════════════════
   safeStorage — reading a preference must never take the app down.

   Settings are seeded into useState initialisers, which run during
   render. Two things can throw there and both did:

     • localStorage.getItem itself, when storage is unavailable —
       a private window, blocked third-party data, some enterprise
       policies. The app already handles this correctly in
       readStoredLanguages, readStore and readStats; the two dozen
       initialisers in the sandbox did not.

     • JSON.parse, on a value that is not valid JSON. A half-written
       key, a value from an older build, a browser extension — it
       does not matter which, because a throw during render has no
       recovery path. The whole app white-screens, and because the
       bad value is still in storage, so does every reload after it.

   The fallback is always taken on failure, so a corrupt preference
   costs you that preference and nothing else.
   ══════════════════════════════════════════════════════════════ */

/** Raw string, or `fallback` when absent or unreadable. */
export function readString(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

/** JSON value, or `fallback` when absent, unreadable or malformed. */
export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    /* `null` round-trips through JSON but is almost never a
       meaningful setting value, and every caller here wants a
       boolean or an array. Treat it as absent. */
    return parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/**
 * Finite number, or `fallback`.
 *
 * @param {object}  [opts]
 * @param {number}  [opts.min]  Reject anything below this.
 * @param {number}  [opts.max]  Reject anything above this.
 */
export function readNumber(key, fallback, { min = -Infinity, max = Infinity } = {}) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === "") return fallback;
    const n = Number(raw);
    /* Number("") is 0 and Number("abc") is NaN — both have to be
       rejected, or a blank key reads as a real zero and a corrupt
       one poisons every calculation downstream of it. */
    if (!Number.isFinite(n) || n < min || n > max) return fallback;
    return n;
  } catch {
    return fallback;
  }
}

/** One of `allowed`, or `fallback`. */
export function readEnum(key, fallback, allowed) {
  const value = readString(key, fallback);
  return allowed.includes(value) ? value : fallback;
}

/** Write, ignoring an unavailable or full store. */
export function write(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
