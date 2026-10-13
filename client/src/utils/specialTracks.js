/* ══════════════════════════════════════════════════════════════
   specialTracks — races opened from a link rather than drawn.

   Two kinds, both carried in /test?track=…:

   • A challenge: a shared lap's exact track, with the sharer's pace
     as the target — /test?track=cpp-s-12&vs=87&by=abhinav.

   • The track of the day: one code snippet for everyone, picked from
     the UTC date, raced on its own board — /test?track=daily-2026-10-10.
     The board id is new every day, so the daily podium starts empty
     at midnight UTC without the server having to know about days; the
     snippet behind it is just a catalogue track.

   Pure functions, so the unit tests can pin them down.
   ══════════════════════════════════════════════════════════════ */

import { CATALOGUE, CODE_LANGUAGES } from "./snippetPool";
import { isSymbolKey, keyOf } from "./lapAnalysis";
import { pickDrillSnippet } from "./symbolDrill";

const DAILY_PREFIX = "daily-";
const USERNAME = /^[a-z0-9_.-]{1,24}$/i;
const MAX_VS_WPM = 300;

/** Today's key, in UTC so everyone races the same track. */
export function dailyKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/* FNV-1a: a small, stable hash, so a day maps to the same track on
   every device. */
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/* Medium code tracks: long enough to be a real lap, short enough for a
   quick daily. English is a warm-up and never the track of the day. */
const DAILY_POOL = CATALOGUE.filter((s) => CODE_LANGUAGES.includes(s.language) && s.length === "medium");

/** The track of the day for a YYYY-MM-DD key. */
export function dailyTrack(key = dailyKey()) {
  const snippet = DAILY_POOL[hash(`codecaret:${key}`) % DAILY_POOL.length];
  return { kind: "daily", key, boardId: `${DAILY_PREFIX}${key}`, snippet };
}

function isDayKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = new Date(`${key}T00:00:00Z`);
  /* A real date, and not one in the future. */
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key && key <= dailyKey();
}

/**
 * The race a /test URL asks for, or null for an ordinary draw.
 * @param {URLSearchParams} params
 */
export function readSpecialTrack(params) {
  const id = (params.get("track") || "").trim();
  if (!id) return null;

  const vsRaw = Number(params.get("vs"));
  const vsWpm = Number.isInteger(vsRaw) && vsRaw > 0 && vsRaw <= MAX_VS_WPM ? vsRaw : null;
  const byRaw = (params.get("by") || "").trim();
  const by = USERNAME.test(byRaw) ? byRaw : null;
  const target = vsWpm ? { vsWpm, by } : {};

  if (id === "daily" || id.startsWith(DAILY_PREFIX)) {
    const key = id === "daily" ? dailyKey() : id.slice(DAILY_PREFIX.length);
    return isDayKey(key) ? { ...dailyTrack(key), ...target } : null;
  }

  const snippet = CATALOGUE.find((s) => s.id === id);
  return snippet ? { kind: "challenge", boardId: snippet.id, snippet, ...target } : null;
}

/**
 * A symbol drill asked for by link — /test?drill={;( from the profile's
 * symbol fluency card: a track in your setup dense in those symbols.
 * Only symbols count; anything else in the parameter is dropped.
 */
export function readDrillLink(params, languages, codeLength) {
  const raw = params.get("drill");
  if (!raw) return null;
  const keys = [...new Set(Array.from(raw).filter((ch) => isSymbolKey(keyOf(ch))))].slice(0, 5);
  if (keys.length === 0) return null;
  const snippet = pickDrillSnippet(languages, codeLength, keys);
  return snippet ? { kind: "drill", boardId: snippet.id, snippet, keys } : null;
}

/** The link that races this exact track against this lap. */
export function challengeLink(origin, boardId, wpm, username) {
  const params = new URLSearchParams({ track: boardId });
  if (Number.isFinite(wpm) && wpm > 0) params.set("vs", String(Math.round(wpm)));
  if (username && USERNAME.test(username)) params.set("by", username);
  return `${origin}/test?${params}`;
}
