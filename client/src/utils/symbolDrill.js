/* ══════════════════════════════════════════════════════════════
   symbolDrill — a track to practise particular symbols on.

   Kept apart from lapAnalysis.js because it needs the snippet
   catalogue, and the profile page, which reads lapAnalysis, should
   not have to load every track to show your symbol totals.
   ══════════════════════════════════════════════════════════════ */

import { CODE_LANGUAGES, poolFor } from "./snippetPool";

/** Share of a snippet's non-space characters that are these symbols. */
export function drillScore(code, keys) {
  const wanted = new Set(keys);
  let solid = 0;
  let hits = 0;
  for (const ch of code) {
    if (/\s/.test(ch)) continue;
    solid++;
    if (wanted.has(ch)) hits++;
  }
  return solid ? hits / solid : 0;
}

/**
 * A track to drill these symbols on: from your languages and length,
 * one of the few densest in them, so a repeat drill still varies.
 * Code only — a warm-up setup drills across every code language.
 */
export function pickDrillSnippet(languages, codeLength, keys, excludeId = null) {
  const code = languages.filter((l) => CODE_LANGUAGES.includes(l));
  const pool = poolFor(code.length > 0 ? code : CODE_LANGUAGES, codeLength).filter(
    (s) => s.id !== excludeId
  );
  const ranked = pool
    .map((s) => ({ s, score: drillScore(s.code, keys) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  if (ranked.length === 0) return null;
  return ranked[Math.floor(Math.random() * ranked.length)].s;
}
