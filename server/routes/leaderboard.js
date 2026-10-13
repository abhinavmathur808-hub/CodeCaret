const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

/* CodeCaret is single-player, so standing is measured by the only
   thing a solo racer can actually move: peak speed. */

/* On the board: raced code at least once, at a real pace. A lap
   force-finished before its first key posts 0 WPM, and a driver
   whose only laps were those has nothing to rank. */
const ON_BOARD = { totalRaces: { $gt: 0 }, peakWpm: { $gt: 0 } };

/** Top 50 racers by peak WPM. */
async function topByWpm() {
  const users = await User.find(ON_BOARD)
    .sort({ peakWpm: -1 })
    .limit(50)
    .select("username peakWpm averageWpm totalRaces")
    .lean();

  return users.map((u, i) => ({
    rank: i + 1,
    username: u.username,
    peakWpm: u.peakWpm,
    averageWpm: u.averageWpm,
    totalRaces: u.totalRaces,
  }));
}

// ── GET /api/leaderboard/global ──────────────────────────────
router.get("/global", async (_req, res) => {
  try {
    res.json(await topByWpm());
  } catch (err) {
    console.error("❌ Leaderboard error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ══════════════════════════════════════════════════════════════
   GET /api/leaderboard/standings?board=peak|rating|weekly

   The standings page: the top 50 on one of three boards, and — with
   a session — the caller's own row, so a driver outside the top 50
   still sees where they are.

     peak    best single lap (then average pace)
     rating  Elo rating (then peak)
     weekly  best lap since Monday 00:00 UTC (then that week's
             average), code laps only

   Warm-up laps never reach the first two (the race route keeps them
   out of peakWpm, averageWpm, totalRaces and the rating) and are
   filtered out of the third here.
   ══════════════════════════════════════════════════════════════ */

const BOARD_SIZE = 50;

const BOARDS = {
  peak: {
    sort: { peakWpm: -1, averageWpm: -1, _id: 1 },
    fields: ["peakWpm", "averageWpm"],
  },
  rating: {
    sort: { eloRating: -1, peakWpm: -1, _id: 1 },
    fields: ["eloRating", "peakWpm"],
  },
};

const ROW_FIELDS = "username peakWpm averageWpm totalRaces eloRating currentStreak";

const row = (u, rank) => ({
  rank,
  username: u.username,
  peakWpm: u.peakWpm ?? 0,
  averageWpm: u.averageWpm ?? 0,
  totalRaces: u.totalRaces ?? 0,
  eloRating: u.eloRating ?? 1200,
  currentStreak: u.currentStreak ?? 0,
});

/** Monday 00:00 UTC of the current week. */
function weekStart(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

/** Position under a two-key ranking: everyone strictly ahead, plus one. */
async function positionOf(me, { fields: [a, b] }) {
  const ahead = await User.countDocuments({
    ...ON_BOARD,
    $or: [
      { [a]: { $gt: me[a] } },
      { [a]: me[a], [b]: { $gt: me[b] } },
      { [a]: me[a], [b]: me[b], _id: { $lt: me._id } },
    ],
  });
  return ahead + 1;
}

async function rankedBoard(name, viewerId) {
  const spec = BOARDS[name];
  const users = await User.find(ON_BOARD).sort(spec.sort).limit(BOARD_SIZE).select(ROW_FIELDS).lean();
  const rows = users.map((u, i) => row(u, i + 1));

  let you = null;
  if (viewerId) {
    const inTop = rows.find((r, i) => String(users[i]._id) === viewerId);
    if (inTop) you = inTop;
    else {
      const me = await User.findOne({ _id: viewerId, ...ON_BOARD }).select(ROW_FIELDS).lean();
      if (me) you = row(me, await positionOf(me, spec));
    }
  }
  return { rows, you };
}

async function weeklyBoard(viewerId) {
  const since = weekStart();
  const ranked = await User.aggregate([
    { $match: { "raceHistory.createdAt": { $gte: since } } },
    {
      $project: {
        username: 1,
        peakWpm: 1,
        averageWpm: 1,
        totalRaces: 1,
        eloRating: 1,
        currentStreak: 1,
        week: {
          $filter: {
            input: "$raceHistory",
            as: "r",
            cond: {
              $and: [
                { $gte: ["$$r.createdAt", since] },
                { $ne: [{ $toLower: "$$r.language" }, "english"] },
                { $gt: ["$$r.wpm", 0] },
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        peakWpm: 1,
        averageWpm: 1,
        totalRaces: 1,
        eloRating: 1,
        currentStreak: 1,
        weekBest: { $max: "$week.wpm" },
        weekAverage: { $round: [{ $avg: "$week.wpm" }, 0] },
        weekRaces: { $size: "$week" },
      },
    },
    { $match: { weekRaces: { $gt: 0 } } },
    { $sort: { weekBest: -1, weekAverage: -1, _id: 1 } },
  ]);

  const toRow = (u, i) => ({
    ...row(u, i + 1),
    weekBest: u.weekBest,
    weekAverage: u.weekAverage,
    weekRaces: u.weekRaces,
  });
  const rows = ranked.slice(0, BOARD_SIZE).map(toRow);
  const at = viewerId ? ranked.findIndex((u) => String(u._id) === viewerId) : -1;
  return { rows, you: at >= 0 ? toRow(ranked[at], at) : null, since };
}

router.get("/standings", optionalAuth, async (req, res) => {
  try {
    const board = ["peak", "rating", "weekly"].includes(req.query.board) ? req.query.board : "peak";
    const viewerId =
      req.user?.id && mongoose.isValidObjectId(req.user.id) ? String(req.user.id) : null;
    const result = board === "weekly" ? await weeklyBoard(viewerId) : await rankedBoard(board, viewerId);
    res.json({ board, ...result });
  } catch (err) {
    console.error("❌ Standings error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
module.exports.weekStart = weekStart;
