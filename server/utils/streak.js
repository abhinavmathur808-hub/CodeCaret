/* ══════════════════════════════════════════════════════════════
   streak — daily practice streaks in the racer's own timezone.

   A streak is about days as the person experiences them. Deciding
   it in UTC means someone in Auckland loses their streak at
   lunchtime and someone in Los Angeles gets an extra evening, which
   makes the number feel arbitrary and unfair in opposite
   directions.

   So the client sends its IANA zone and every comparison happens
   there. Nothing here reads the server's own clock zone.
   ══════════════════════════════════════════════════════════════ */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whether a string is a zone this runtime actually knows.
 *
 * Validated rather than trusted: the value comes from the client,
 * and an unknown zone makes Intl throw. A sign-in should not be
 * able to 500 the race endpoint by sending "Mars/Olympus".
 */
function isValidTimeZone(tz) {
  if (!tz || typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * The calendar date in `timeZone`, as "YYYY-MM-DD".
 *
 * en-CA because its short date format IS ISO order — building the
 * string from formatToParts or from getFullYear/getMonth would
 * either be longer or silently use the server's zone.
 */
function localDayKey(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Day keys for today and yesterday in the racer's zone.
 *
 * Yesterday is derived by stepping back 24h and re-formatting, not
 * by subtracting one from the day number — that would break on the
 * 1st of the month, and across a DST boundary the 24h step still
 * lands on the previous calendar date once formatted in-zone.
 */
function dayKeys(now, timeZone) {
  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  return {
    zone,
    today: localDayKey(now, zone),
    yesterday: localDayKey(new Date(now.getTime() - MS_PER_DAY), zone),
  };
}

/**
 * The streak after a race, given the day the last one landed on.
 *
 * Pure, so the rules can be tested without a database. The route
 * applies the same three cases atomically in an aggregation
 * pipeline; this is the reference they are checked against.
 *
 * @param {string|null} lastDay  Previous race's local day key.
 * @param {number}      current  Streak before this race.
 * @param {{today: string, yesterday: string}} keys
 */
function nextStreak(lastDay, current, keys) {
  // Already raced today — the streak is already counted.
  if (lastDay === keys.today) return current > 0 ? current : 1;

  // Raced yesterday — the chain continues.
  if (lastDay === keys.yesterday) return (current || 0) + 1;

  // First race ever, or a gap of more than a day — start again at 1.
  return 1;
}

module.exports = {
  isValidTimeZone,
  localDayKey,
  dayKeys,
  nextStreak,
  MS_PER_DAY,
};
