/**
 * Shared aggregate-stat update for a completed race.
 *
 * Returns a MongoDB aggregation-pipeline update, so the whole thing
 * is one atomic, read-free operation.
 *
 * Counters:
 *   totalRaces — every completed race.
 *   wpmRaces   — races that produced a WPM figure. Used as the
 *                average's divisor so an abandoned run (no WPM)
 *                cannot drag someone's average down.
 *   wpmSum     — running total of WPM. Deriving the average from this
 *                avoids the drift of the old recurrence, which fed an
 *                already-rounded average back into itself every race.
 *
 * Documents written before these fields existed are backfilled on
 * first write from their stored average and race count.
 *
 * @param {number} wpm     WPM for the race just finished (validated).
 * @param {object} [extra] Additional $set fields.
 */
function raceStatsUpdate(wpm, extra = {}) {
  const priorWpmRaces = {
    $ifNull: ["$wpmRaces", { $ifNull: ["$totalRaces", 0] }],
  };

  return [
    {
      $set: {
        ...extra,
        peakWpm: { $max: [{ $ifNull: ["$peakWpm", 0] }, wpm] },
        totalRaces: { $add: [{ $ifNull: ["$totalRaces", 0] }, 1] },
        wpmRaces: { $add: [priorWpmRaces, 1] },
        wpmSum: {
          $add: [
            {
              $ifNull: [
                "$wpmSum",
                { $multiply: [{ $ifNull: ["$averageWpm", 0] }, priorWpmRaces] },
              ],
            },
            wpm,
          ],
        },
      },
    },
    {
      $set: {
        averageWpm: {
          $cond: [
            { $gt: ["$wpmRaces", 0] },
            { $round: [{ $divide: ["$wpmSum", "$wpmRaces"] }, 0] },
            0,
          ],
        },
      },
    },
  ];
}

/**
 * Pipeline stages that advance the daily streak.
 *
 * Appended to the stats pipeline so the whole race — counters,
 * streak and rating — commits in ONE update. The alternative is
 * read-then-write, and a racer double-submitting (a rapid refresh,
 * a retried request) could then read the same "yesterday" twice and
 * increment the streak twice for one day.
 *
 * The three cases are decided in Mongo against the stored day key,
 * which is what makes a repeat submission on the same day a no-op
 * rather than an increment.
 *
 * @param {{today: string, yesterday: string}} keys Local day keys.
 * @param {Date} at When the race finished.
 */
function streakUpdate(keys, at) {
  /* The day already on record, or today's if there is none yet. */
  const storedDay = { $ifNull: ["$lastRaceDay", keys.today] };

  /* Today, as claimed, is BEFORE the day already recorded.
     ── Why this case exists ─────────────────────────────────────
     The zone comes from the client, and the client can send any
     zone it likes. Racing in Pacific/Kiritimati (UTC+14) records
     day N; switching to Pacific/Niue (UTC-11) makes "today" N-1,
     which used to overwrite lastRaceDay with the earlier day; a
     third race back in UTC+14 then saw lastRaceDay == yesterday
     and incremented. Two streak days for one real day, repeatable
     indefinitely.

     A real traveller crossing the date line westward produces the
     same shape, so this is not treated as cheating — it simply
     earns nothing. The day stands, the streak holds. */
  const movedBackwards = { $lt: [keys.today, { $ifNull: ["$lastRaceDay", ""] }] };

  return [
    {
      $set: {
        currentStreak: {
          $switch: {
            branches: [
              {
                // A day earlier than one already counted — no change.
                case: movedBackwards,
                then: { $max: [{ $ifNull: ["$currentStreak", 0] }, 1] },
              },
              {
                // Already raced today — the day is already counted.
                case: { $eq: ["$lastRaceDay", keys.today] },
                then: { $max: [{ $ifNull: ["$currentStreak", 0] }, 1] },
              },
              {
                // Raced yesterday — the chain continues.
                case: { $eq: ["$lastRaceDay", keys.yesterday] },
                then: { $add: [{ $ifNull: ["$currentStreak", 0] }, 1] },
              },
            ],
            // First race, or a gap of more than a day.
            default: 1,
          },
        },
        /* Monotonic. "YYYY-MM-DD" sorts chronologically as a string,
           so $max is literally "the later of the two days" — and a
           recorded day that can only move forward is what closes the
           loop above. */
        lastRaceDay: { $max: [storedDay, keys.today] },
        lastRaceDate: at,
      },
    },
    {
      /* A separate stage because a $set cannot read a field it is
         writing in the same stage — maxStreak needs the NEW
         currentStreak, not the old one. */
      $set: {
        maxStreak: {
          $max: [{ $ifNull: ["$maxStreak", 0] }, "$currentStreak"],
        },
      },
    },
  ];
}

/**
 * Pipeline stage that applies an Elo delta.
 *
 * `$add` against the stored value rather than writing a rating
 * computed in JS: two races finishing together would otherwise both
 * read the same starting rating and the second would overwrite the
 * first's change instead of stacking on it.
 *
 * The bounds are re-applied HERE as well as in utils/elo, and that
 * is the whole point of doing it in the pipeline. elo.js clamps
 * against the rating it read; two races finishing together both read
 * the same value, so near a boundary their deltas stacked straight
 * through it and the stored rating ended up outside the range the
 * rest of the system assumes — and `publicUser` hands that raw
 * number to the client.
 *
 * @param {number} delta Signed change, already clamped by utils/elo.
 * @param {{min: number, max: number}} bounds
 */
function eloUpdate(delta, bounds) {
  if (!delta) return [];
  return [
    {
      $set: {
        eloRating: {
          $min: [
            bounds.max,
            {
              $max: [
                bounds.min,
                { $add: [{ $ifNull: ["$eloRating", 1200] }, delta] },
              ],
            },
          ],
        },
      },
    },
  ];
}

module.exports = {
  raceStatsUpdate,
  streakUpdate,
  eloUpdate,
};
