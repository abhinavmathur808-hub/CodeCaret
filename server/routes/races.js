const express = require("express");
const authenticate = require("../middleware/auth");
const { cacheUserProfile } = require("../utils/userProfile");
const User = require("../models/User");
const Snippet = require("../models/Snippet");
const {
  raceStatsUpdate,
  streakUpdate,
  eloUpdate,
} = require("../utils/raceStats");
const { rateRace, pickTarget, MIN_RATING, MAX_RATING } = require("../utils/elo");
const { dayKeys } = require("../utils/streak");
const { verifyRun } = require("../utils/antiCheat");
const { recordTrackBest, trackBoard } = require("../utils/trackBoard");
const rateLimit = require("../middleware/rateLimit");
const { qualifyingTrophies, newTrophies } = require("../utils/trophies");

const router = express.Router();

/* Every other write endpoint is throttled and this one was not, even
   though it is the only route that mutates aggregates, ratings and
   the public record board. Generous enough that it cannot be reached
   by racing — the shortest snippet still takes seconds — but it
   stops a script replaying submissions as fast as the network
   allows. */
const raceLimiter = rateLimit({
  name: "races",
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many races submitted. Please slow down.",
});

/* Catalogue ids are client-supplied, so they are constrained rather
   than trusted: without this, anything could be written as a key and
   the collection would fill with junk documents. Matches the shape
   the snippet dataset actually uses ("cpp-s-1", "js-m-14"). */
const CATALOG_ID = /^[a-z0-9][a-z0-9-]{0,39}$/i;

/**
 * Settle a completed lap against its track's leaderboard.
 *
 * Banks the lap as the racer's best on the track if it is one, then
 * reads the board back to say where they now stand.
 *
 * ── The track record is P1 ────────────────────────────────────
 * The record used to be a separate pair of fields on the snippet,
 * claimed by its own comparison — WPM only. With a board that breaks
 * WPM ties on accuracy, that would name a different holder from the
 * podium the moment two racers tied, so the record is now simply
 * whoever stands first. The snippet's record fields are kept only as
 * a cache of P1, because the Elo ghost reads them before a race; they
 * are written FROM the board, never compared on their own.
 *
 * "New track record" means this lap is what P1 now holds: it beat
 * the racer's own best AND that best is first. Improving a record
 * you already held counts — the record moved — while a slower lap by
 * the current holder does not.
 *
 * @returns {Promise<{ trackRecord: object, trackStanding: object }>}
 */
async function settleTrack({ catalogId, userId, wpm, accuracy, timeElapsed, at, language, times }) {
  const { isPersonalBest } = await recordTrackBest({
    catalogId,
    userId,
    wpm,
    accuracy,
    timeElapsed,
    at,
    times,
  });

  const board = await trackBoard(catalogId, userId);
  const top = board.podium[0] ?? null;

  if (top) {
    /* Best-effort: the cache only steers the Elo ghost on the next
       race, and the board itself is already right. A plain update
       rather than a pipeline, so a row minted here gets the schema's
       defaults (see the field-average note below). */
    await Snippet.updateOne(
      { catalogId },
      {
        $set: {
          recordWpm: top.wpm,
          recordHolder: top.username,
          recordHolderId: top.userId,
          recordAt: top.achievedAt,
        },
        $setOnInsert: { language },
      },
      { upsert: true }
    ).catch((err) => console.warn("Record cache sync failed:", err.message));
  }

  return {
    trackRecord: {
      isRecord: Boolean(isPersonalBest && top && top.userId === String(userId)),
      recordWpm: top?.wpm ?? 0,
      recordAccuracy: top?.accuracy ?? null,
      recordHolder: top?.username ?? "None",
    },
    trackStanding: { ...board, isPersonalBest },
  };
}


/** Upper bound on a single race, in seconds (3 hours). */
const MAX_TIME_ELAPSED = 60 * 60 * 3;
const MAX_WPM = 500;
const MAX_HISTORY = 200;

/** Languages we accept on a submitted race. */
const ALLOWED_LANGUAGES = new Set([
  "javascript",
  "typescript",
  "python",
  "cpp",
  "c++",
  "c",
  "java",
  "sql",
  "css",
  "json",
  "bash",
  "english",
]);

/**
 * Languages raced only as a warm-up: plain-English passages, picked in
 * the race setup to loosen up before racing code.
 *
 * Prose is typed far faster than code, so these laps are kept out of
 * everything that compares racers across the whole site. They change
 * neither the rating (the Elo opponent is built from a field's WPM, and
 * a prose field would inflate it) nor the counters the global
 * leaderboard ranks by — peakWpm, averageWpm and totalRaces. They still
 * land in the racer's own history, keep the daily streak alive, and go
 * on their own passage's podium, which only ever holds English laps.
 */
const WARMUP_LANGUAGES = new Set(["english"]);

/**
 * POST /api/races
 * Submit race results for the authenticated user.
 * Protected by JWT middleware.
 *
 * Body: { wpm: Number, accuracy: Number, timeElapsed: Number, language: String }
 */
router.post("/", authenticate, raceLimiter, async (req, res) => {
  try {
    const {
      wpm,
      accuracy,
      timeElapsed,
      language,
      snippetId,
      completed,
      keystrokeTimestamps,
      correctKeystrokes,
      /* How long the client measured the lap as running. Needed
         because the keystroke span alone is not the lap's length on
         a run that timed out — see utils/antiCheat.js. */
      durationMs,
      timeLimit,
      /* IANA zone from the browser, so the streak turns over at the
         racer's midnight rather than UTC's. */
      timeZone,
    } = req.body;

    /* The race's own limit, used to sanity-check how long the
       telemetry spans. Absent or malformed means "no limit". */
    const timeLimitSeconds =
      Number.isFinite(timeLimit) && timeLimit > 0 ? timeLimit : 0;

    // ── Validation ─────────────────────────────────────────
    if (wpm == null || accuracy == null || timeElapsed == null) {
      return res
        .status(400)
        .json({ error: "wpm, accuracy, and timeElapsed are required" });
    }

    if (!Number.isFinite(wpm) || wpm < 0 || wpm > MAX_WPM) {
      return res.status(400).json({ error: "Invalid wpm value" });
    }
    if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100) {
      return res.status(400).json({ error: "Invalid accuracy value" });
    }
    if (
      !Number.isFinite(timeElapsed) ||
      timeElapsed < 0 ||
      timeElapsed > MAX_TIME_ELAPSED
    ) {
      return res.status(400).json({ error: "Invalid timeElapsed value" });
    }

    const raceLanguage = String(language || "javascript").toLowerCase();
    if (!ALLOWED_LANGUAGES.has(raceLanguage)) {
      return res.status(400).json({ error: "Unsupported language" });
    }
    const warmup = WARMUP_LANGUAGES.has(raceLanguage);

    /* Optional: a race from a custom snippet has no catalogue id, and
       one that fails the shape check is dropped rather than rejected —
       the lap is still a real lap and should still be recorded, it
       just cannot claim a track record. */
    const rawId = typeof snippetId === "string" ? snippetId.trim() : "";
    const catalogId = CATALOG_ID.test(rawId) ? rawId : null;

    /* ── Telemetry verification ─────────────────────────────
       Runs BEFORE anything is written. `wpm` above is a claim by the
       client; this re-derives it from the keystroke timings and
       refuses the submission when the two disagree, or when the
       timings are not shaped like human typing.

       Rejecting here means no history row, no aggregate update and
       no track record — a failed check leaves the account exactly as
       it was. */
    const verdict = verifyRun(wpm, keystrokeTimestamps, timeLimitSeconds, Boolean(completed), {
      correctKeystrokes,
      /* Bounded here as well as inside the check: everything else on
         this route is range-checked before it is used, and a figure
         that feeds the WPM recomputation should not be the
         exception. */
      durationMs:
        Number.isFinite(durationMs) &&
        durationMs > 0 &&
        durationMs <= MAX_TIME_ELAPSED * 1000
          ? durationMs
          : undefined,
    });

    if (!verdict.valid) {
      /* Logged with the numbers, because a false positive here throws
         away somebody's real lap and the only way to find that out is
         to be able to see why a run was refused. */
      console.warn(
        `🚫 Telemetry rejected for ${req.user.username}: ${verdict.reason}`,
        verdict.details
      );
      return res.status(400).json({
        error: "Telemetry verification failed.",
        reason: verdict.reason,
      });
    }

    /* A warm-up is never rated: no opponent is read and the rating
       is left exactly where it was. */
    let elo = { delta: 0, rated: false, targetWpm: null, source: null };
    if (!warmup) {
      /* ── Asynchronous opponent ────────────────────────────
         Read BEFORE this race is folded in, so the racer is measured
         against the field as it stood — not against an average their
         own lap has already moved. */
      let target = { targetWpm: null, source: null };
      if (catalogId) {
        const snippetDoc = await Snippet.findOne({ catalogId })
          .select("+wpmSum +raceCount +recordHolderId avgWpm recordWpm")
          .lean()
          .catch(() => null);
        target = pickTarget(snippetDoc, req.user.id);
      }

      /* The rating is read here and the DELTA is applied in the update
         below, so concurrent races stack rather than overwrite. */
      const rater = await User.findById(req.user.id).select("eloRating").lean();
      elo = rateRace({
        rating: rater?.eloRating,
        wpm,
        targetWpm: target.targetWpm,
        source: target.source,
      });
    }

    /* ── Streak ─────────────────────────────────────────────
       Decided in the racer's own zone. An invalid or missing zone
       falls back to UTC rather than failing the submission — losing
       a streak day is bad, losing the whole race is worse. */
    const now = new Date();
    const keys = dayKeys(now, timeZone);

    /* The lap joins the racer's history, capped in the same
       operation. */
    const history = {
      raceHistory: {
        $slice: [
          {
            $concatArrays: [
              { $ifNull: ["$raceHistory", []] },
              [
                {
                  wpm,
                  accuracy,
                  timeElapsed,
                  language: raceLanguage,
                  createdAt: now,
                },
              ],
            ],
          },
          -MAX_HISTORY,
        ],
      },
    };

    /* ── Update aggregates atomically ───────────────────────
       One pipeline update rather than read-modify-write, so two
       races finishing at once cannot clobber each other's counters.
       A warm-up writes its history row and nothing the leaderboard
       ranks by. */
    const user = await User.findByIdAndUpdate(
      req.user.id,
      [
        ...(warmup ? [{ $set: history }] : raceStatsUpdate(wpm, history)),
        /* Streak and rating ride along in the SAME pipeline. That is
           what makes a double submission safe: the streak decision
           reads `lastRaceDay` inside the update, so a second request
           for the same day sees the day already recorded and leaves
           the count alone. */
        ...streakUpdate(keys, now),
        ...(warmup ? [] : eloUpdate(elo.delta, { min: MIN_RATING, max: MAX_RATING })),
      ],
      // Mongoose requires an explicit opt-in before it will send an
      // aggregation pipeline as the update document.
      { new: true, updatePipeline: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ── Update Redis cache ─────────────────────────────────
    const redis = req.app.locals.redis;
    /* Reuse the shared cache writer so the cached profile always has
       the same shape as the API responses. */
    await cacheUserProfile(redis, user);

    /* ── Track leaderboard ──────────────────────────────────
       Only a completed lap goes on a track's board. A race cut short
       by the time limit still posts a genuine WPM, but it is a WPM
       over part of the snippet — ranking it against laps that typed
       the whole thing would mean the board is won by whoever picks
       the shortest timer.

       Failure here must not fail the submission: the race itself is
       already banked, and a missed board update is a far smaller
       problem than telling the racer their lap did not count. */
    let trackRecord = null;
    let trackStanding = null;
    if (catalogId && completed) {
      try {
        ({ trackRecord, trackStanding } = await settleTrack({
          catalogId,
          userId: req.user.id,
          wpm,
          accuracy,
          timeElapsed,
          at: now,
          language: raceLanguage,
          /* Verified above, so a lap's ghost is exactly the telemetry
             it was accepted on. */
          times: keystrokeTimestamps,
        }));
      } catch (err) {
        console.error("Track leaderboard update failed:", err.message);
      }
    }

    /* Fold this lap into the snippet's field average, AFTER it was
       read for the rating above. Not for a warm-up: the average only
       exists to pick rating opponents, and warm-ups are never rated.

       Awaited, not fire-and-forget. The next race to arrive reads
       this value to pick its opponent, and leaving the write in
       flight made that a race condition: a second lap on the same
       snippet could read a stale zero, fall through to the ghost
       branch, find only its own record there and come back unrated.
       One indexed upsert is not worth that. Still non-fatal — the
       race itself is already saved either way. */
    if (catalogId && !warmup) {
      /* try/catch as well as .catch(): Mongoose validates the update
         shape SYNCHRONOUSLY, so a malformed one throws before any
         promise exists and would escape a lone .catch() straight
         into the request handler — turning a best-effort statistic
         into a 500 on a race that was already saved. */
      try {
        /* ── Make sure the row exists, FIRST and separately ──────
           An aggregation-pipeline update applies no schema defaults
           and no timestamps, so upserting one into existence wrote a
           document holding nothing but catalogId, wpmSum, raceCount
           and updatedAt. No recordWpm above all — which, back when the
           record was claimed by comparing against that field, made the
           snippet's track record unclaimable for good.

           A plain update does get Mongoose's defaults, so the row is
           minted here and the pipeline below is left to do only the
           arithmetic. That keeps one definition of a well-formed
           catalogue row — the schema — rather than a second copy of
           every default hand-written into a pipeline stage. */
        await Snippet.updateOne(
          { catalogId },
          { $setOnInsert: { catalogId, language: raceLanguage } },
          { upsert: true }
        );

        /* `upsert: false` deliberately: the row is guaranteed above,
           and if that somehow failed, skipping a best-effort average
           is better than re-creating the malformed document this
           whole change exists to stop writing. */
        await Snippet.updateOne(
          { catalogId },
          [
            {
              $set: {
                wpmSum: { $add: [{ $ifNull: ["$wpmSum", 0] }, wpm] },
                raceCount: { $add: [{ $ifNull: ["$raceCount", 0] }, 1] },
              },
            },
            {
              $set: {
                avgWpm: {
                  $round: [{ $divide: ["$wpmSum", "$raceCount"] }, 0],
                },
              },
            },
          ],
          // Required before Mongoose will send an array as a pipeline.
          { updatePipeline: true }
        );
      } catch (err) {
        console.warn("Field-average update failed:", err.message);
      }
    }

    /* ── Trophies ───────────────────────────────────────────
       Decided from the account as this race left it. The filter on
       the push makes a double submission harmless: the second one
       finds the trophies already there and adds nothing. */
    let earned = [];
    try {
      earned = newTrophies(
        user.trophies,
        qualifyingTrophies({
          user,
          race: { wpm, accuracy, completed: Boolean(completed), warmup, catalogId },
          trackRecord,
          trackStanding,
        })
      );
      if (earned.length > 0) {
        await User.updateOne(
          { _id: user._id, "trophies.id": { $nin: earned } },
          { $push: { trophies: { $each: earned.map((id) => ({ id, at: now })) } } }
        );
      }
    } catch (err) {
      console.warn("Trophy update failed:", err.message);
      earned = [];
    }

    res.status(201).json({
      message: "Race recorded",
      /* Trophies this lap earned for the first time. */
      trophies: earned,
      /* True for a warm-up lap: it counted for history, streak and its
         passage's podium only. */
      warmup,
      stats: {
        totalRaces: user.totalRaces,
        peakWpm: user.peakWpm,
        averageWpm: user.averageWpm,
      },
      trackRecord,
      /* The track's board as it stands after this lap — podium, racer
         count and the racer's own position — so the results screen
         can say where they placed without a second request. Null for
         a lap that cannot go on a board (custom code, or cut short). */
      trackStanding,
      /* Read back from the updated document rather than echoing what
         was computed: the pipeline is the authority, and on a double
         submission the streak it reports is the real one. */
      streak: {
        current: user.currentStreak,
        max: user.maxStreak,
        timeZone: keys.zone,
      },
      elo: {
        rating: user.eloRating,
        delta: elo.delta,
        rated: elo.rated,
        targetWpm: elo.targetWpm,
        source: elo.source,
      },
      /* Flat aliases, because the results screen wants exactly these
         three and should not have to know the shape above. */
      currentStreak: user.currentStreak,
      eloRating: user.eloRating,
      eloDelta: elo.delta,
    });
  } catch (err) {
    console.error("POST /api/races error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/races/history ───────────────────────────────────
// Returns the authenticated user's race stats + history.
router.get("/history", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("username totalRaces peakWpm averageWpm raceHistory")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return history newest-first
    const history = [...(user.raceHistory || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      stats: {
        totalRaces: user.totalRaces ?? 0,
        peakWpm: user.peakWpm ?? 0,
        averageWpm: user.averageWpm ?? 0,
      },
      history,
    });
  } catch (err) {
    console.error("GET /api/races/history error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
