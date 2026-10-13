/* ══════════════════════════════════════════════════════════════
   trophies — milestones a racer earns once and keeps.

   Decided on the server, from the account as the race left it, so a
   trophy means the same thing on every device and cannot be granted
   by editing local storage. Stored on the user as { id, at }; the
   client owns how each one looks.

   A warm-up lap (English) still keeps a streak alive, so it can earn
   the streak trophies, but nothing that measures speed or accuracy:
   prose is easier to type than code, and those trophies are about
   code.
   ══════════════════════════════════════════════════════════════ */

/* Code languages as the race route stores them (lowercased). */
const POLYGLOT = [["c++", "cpp"], ["python"], ["javascript"]];

/**
 * Every trophy this race qualifies the racer for, earned already or
 * not; the caller keeps only the new ones.
 *
 * @param {object} p
 * @param {object} p.user          The account after this race was applied.
 * @param {object} p.race          { wpm, accuracy, completed, warmup, catalogId }
 * @param {object?} p.trackRecord  The board's verdict on this lap, if any.
 * @param {object?} p.trackStanding
 * @returns {string[]}
 */
function qualifyingTrophies({ user, race, trackRecord, trackStanding }) {
  const ids = [];
  const streak = user.currentStreak ?? 0;
  if (race.completed) ids.push("first-lap");
  if (streak >= 3) ids.push("streak-3");
  if (streak >= 7) ids.push("streak-7");
  if (streak >= 30) ids.push("streak-30");
  if (race.completed && typeof race.catalogId === "string" && race.catalogId.startsWith("daily-")) {
    ids.push("daily");
  }

  if (race.warmup) return ids;

  if ((user.totalRaces ?? 0) >= 50) ids.push("races-50");
  if ((user.peakWpm ?? 0) >= 60) ids.push("wpm-60");
  if ((user.peakWpm ?? 0) >= 100) ids.push("wpm-100");
  if (race.completed && race.accuracy === 100) ids.push("flawless");
  const position = trackStanding?.you?.position;
  if (race.completed && Number.isFinite(position) && position <= 3) ids.push("podium");
  if (trackRecord?.isRecord) ids.push("record");

  const raced = new Set((user.raceHistory ?? []).map((r) => String(r.language).toLowerCase()));
  if (POLYGLOT.every((names) => names.some((n) => raced.has(n)))) ids.push("polyglot");
  return ids;
}

/** The ids in `candidates` the racer does not hold yet. */
function newTrophies(held, candidates) {
  const have = new Set((held ?? []).map((t) => t.id));
  return [...new Set(candidates)].filter((id) => !have.has(id));
}

module.exports = { qualifyingTrophies, newTrophies };
