/* ══════════════════════════════════════════════════════════════
   trackBoard — every catalogue track's own leaderboard.

   Two operations, kept side by side because they must agree on what
   "better" means — the write decides whether a lap replaces your
   best, the read decides who stands where, and if those two orders
   ever differed the board would contradict itself:

     wpm desc  →  accuracy desc  →  achievedAt asc (first to set it)

   The board shows a podium of three. The caller's own standing is
   reported separately, so a racer outside the top three still learns
   where they are without the board itself growing past three rows.
   ══════════════════════════════════════════════════════════════ */

const mongoose = require("mongoose");
const TrackBest = require("../models/TrackBest");
const Snippet = require("../models/Snippet");

const PODIUM_SIZE = 3;

/* Fetched past the podium before the user join, so that a lap left
   behind by a deleted account cannot leave an empty step when there
   are real racers below it. */
const PODIUM_OVERFETCH = 10;

/* The ranking order, written once: the board, the ghost and the
   personal-best write must never disagree about who is ahead. */
const RANKING = { wpm: -1, accuracy: -1, achievedAt: 1, _id: 1 };

/* A ghost is one entry per character; the anti-cheat already caps
   telemetry at 20,000 entries, and no catalogue track comes close. */
const MAX_GHOST_LENGTH = 20000;

/** A lap's timings as worth keeping, or null: whole, ordered ms. */
function cleanTimes(times) {
  if (!Array.isArray(times) || times.length === 0 || times.length > MAX_GHOST_LENGTH) {
    return null;
  }
  const out = new Array(times.length);
  let last = 0;
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (!Number.isFinite(t) || t < last) return null;
    out[i] = Math.round(t);
    last = t;
  }
  return out;
}

/** "This lap is better than the stored one", as a query. */
function beatenBy(wpm, accuracy) {
  return {
    $or: [{ wpm: { $lt: wpm } }, { wpm, accuracy: { $lt: accuracy } }],
  };
}

/**
 * Store a completed lap as the racer's best on a track, if it is one.
 *
 * One conditional upsert: the filter only matches a stored best that
 * this lap beats, so the comparison and the write are a single atomic
 * step and two laps landing together cannot overwrite each other.
 *
 * When the stored best is better or equal, the filter matches nothing
 * and the upsert tries to INSERT — colliding with the unique
 * (catalogId, user) index. That duplicate-key error is the ordinary
 * "not a personal best" outcome, not a failure.
 *
 * It is also what a racer's FIRST two laps produce when they land at
 * the same instant: both see no document and both try to insert. The
 * loser of that race retries as a plain update, which then compares
 * against the winner's lap like any other — so the better of the two
 * is kept, whichever arrived first.
 *
 * @returns {Promise<{ isPersonalBest: boolean }>}
 */
async function recordTrackBest({ catalogId, userId, wpm, accuracy, timeElapsed, at, times }) {
  const filter = { catalogId, user: userId, ...beatenBy(wpm, accuracy) };
  /* A new best replaces the stored timings too, or drops them when
     this lap came without any: a ghost must always be the lap the
     board shows, never an older, slower one. */
  const lap = cleanTimes(times);
  const update = {
    $set: {
      wpm,
      accuracy,
      timeElapsed: Number.isFinite(timeElapsed) ? timeElapsed : null,
      achievedAt: at,
      ...(lap ? { times: lap } : {}),
    },
    ...(lap ? {} : { $unset: { times: "" } }),
  };

  try {
    const res = await TrackBest.updateOne(filter, update, { upsert: true });
    return { isPersonalBest: res.upsertedCount > 0 || res.modifiedCount > 0 };
  } catch (err) {
    if (err.code !== 11000) throw err;
    const res = await TrackBest.updateOne(filter, update);
    return { isPersonalBest: res.modifiedCount > 0 };
  }
}

const asId = (value) => (value == null ? "" : String(value));

/**
 * A track's board: the podium, how many have finished it, and — when
 * a viewer is given — where that viewer stands.
 *
 * @param {string}  catalogId
 * @param {string?} viewerId  Signed-in caller, or null for a public read.
 */
async function trackBoard(catalogId, viewerId = null) {
  const rows = await TrackBest.aggregate([
    { $match: { catalogId } },
    { $sort: RANKING },
    { $limit: PODIUM_OVERFETCH },
    // `select: false` does not reach an aggregate; the board never needs them.
    { $project: { times: 0 } },
    {
      /* Usernames read live rather than copied onto each lap, so a
         rename reaches every podium immediately. */
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "racer",
        pipeline: [{ $project: { username: 1 } }],
      },
    },
    // A lap whose account is gone has no one to credit — skip it.
    { $unwind: "$racer" },
    { $limit: PODIUM_SIZE },
  ]);

  const podium = rows.map((row, i) => ({
    position: i + 1,
    userId: asId(row.user),
    username: row.racer.username,
    wpm: row.wpm,
    accuracy: row.accuracy,
    timeElapsed: row.timeElapsed ?? null,
    achievedAt: row.achievedAt,
  }));

  const racers = await TrackBest.countDocuments({ catalogId });

  let you = null;
  if (viewerId && mongoose.isValidObjectId(viewerId)) {
    const mine = await TrackBest.findOne({ catalogId, user: viewerId }).lean();
    if (mine) {
      /* Position = everyone strictly ahead, plus one. Counted with
         the same three-step order the podium is sorted by, so a
         viewer on the podium gets exactly the position shown on it. */
      const ahead = await TrackBest.countDocuments({
        catalogId,
        $or: [
          { wpm: { $gt: mine.wpm } },
          { wpm: mine.wpm, accuracy: { $gt: mine.accuracy } },
          {
            wpm: mine.wpm,
            accuracy: mine.accuracy,
            achievedAt: { $lt: mine.achievedAt },
          },
        ],
      });

      const third = podium[PODIUM_SIZE - 1];
      you = {
        position: ahead + 1,
        wpm: mine.wpm,
        accuracy: mine.accuracy,
        timeElapsed: mine.timeElapsed ?? null,
        achievedAt: mine.achievedAt,
        onPodium: podium.some((p) => p.userId === asId(viewerId)),
        /* WPM between this racer and the last podium step — the
           "21 wpm off the podium" line. Zero means level on pace and
           behind only on accuracy; null when there is no full podium
           to measure against yet. */
        wpmToPodium:
          third && !podium.some((p) => p.userId === asId(viewerId))
            ? Math.max(0, third.wpm - mine.wpm)
            : null,
      };
    }
  }

  return { catalogId, podium, racers, you };
}

/**
 * The fastest lap on a track that can be raced as a ghost — usually
 * the record itself; a record set before laps were kept has no
 * timings, and then it is the best lap that does.
 *
 * @returns {Promise<object|null>} { username, wpm, accuracy, achievedAt,
 *   times, isRecord } or null when no lap on the track has timings.
 */
async function trackGhost(catalogId) {
  const join = [
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "racer",
        pipeline: [{ $project: { username: 1 } }],
      },
    },
    { $unwind: "$racer" },
  ];

  const [ghost] = await TrackBest.aggregate([
    { $match: { catalogId, "times.0": { $exists: true } } },
    { $sort: RANKING },
    { $limit: PODIUM_OVERFETCH },
    ...join,
    { $limit: 1 },
  ]);
  if (!ghost) return null;

  const [record] = await TrackBest.aggregate([
    { $match: { catalogId } },
    { $sort: RANKING },
    { $limit: PODIUM_OVERFETCH },
    { $project: { times: 0 } },
    ...join,
    { $limit: 1 },
  ]);

  return {
    username: ghost.racer.username,
    wpm: ghost.wpm,
    accuracy: ghost.accuracy,
    achievedAt: ghost.achievedAt,
    times: ghost.times,
    isRecord: Boolean(record && String(record._id) === String(ghost._id)),
  };
}

/**
 * Re-point a track's cached record at whoever is P1 now — after laps
 * were removed from its board, as when an account is deleted. The
 * board is the authority; this only keeps the snippet's copy of P1
 * (which steers the rating opponent) in step with it.
 */
async function refreshRecordCache(catalogId) {
  const { podium } = await trackBoard(catalogId);
  const top = podium[0];
  await Snippet.updateOne(
    { catalogId },
    {
      $set: top
        ? { recordWpm: top.wpm, recordHolder: top.username, recordHolderId: top.userId, recordAt: top.achievedAt }
        : { recordWpm: 0, recordHolder: "None", recordHolderId: null, recordAt: null },
    }
  );
}

/**
 * A racer's standing across every board they are on: how many tracks
 * they hold the record on and how many they are on the podium of.
 */
async function boardSummary(userId) {
  const mine = await TrackBest.find({ user: userId })
    .select("catalogId wpm accuracy achievedAt")
    .sort({ achievedAt: -1 })
    .limit(300)
    .lean();
  const positions = await Promise.all(
    mine.map(async (lap) =>
      1 +
      (await TrackBest.countDocuments({
        catalogId: lap.catalogId,
        $or: [
          { wpm: { $gt: lap.wpm } },
          { wpm: lap.wpm, accuracy: { $gt: lap.accuracy } },
          { wpm: lap.wpm, accuracy: lap.accuracy, achievedAt: { $lt: lap.achievedAt } },
        ],
      }))
    )
  );
  return {
    tracks: mine.length,
    records: positions.filter((p) => p === 1).length,
    podiums: positions.filter((p) => p <= PODIUM_SIZE).length,
  };
}

module.exports = {
  recordTrackBest,
  trackBoard,
  trackGhost,
  refreshRecordCache,
  boardSummary,
  cleanTimes,
  PODIUM_SIZE,
};
