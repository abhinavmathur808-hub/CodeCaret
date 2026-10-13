const express = require("express");
const bcrypt = require("bcrypt");
const authenticate = require("../middleware/auth");
const User = require("../models/User");
const TrackBest = require("../models/TrackBest");
const rateLimit = require("../middleware/rateLimit");
const { signToken } = require("../utils/token");
const {
  exactInsensitive,
  publicUser,
  cacheUserProfile,
  passwordProblem,
  validateUsername,
} = require("../utils/userProfile");
const { revokeSessions } = require("../utils/sessions");
const { boardSummary, refreshRecordCache } = require("../utils/trackBoard");

/* Password checks are guesses at a secret: throttled like sign-in. */
const accountLimiter = rateLimit({
  name: "account",
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many attempts. Please wait a few minutes.",
});

const publicLimiter = rateLimit({
  name: "driver-page",
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many requests. Please slow down.",
});

const router = express.Router();

// ── GET /api/users/me ────────────────────────────────────────
// Returns the authenticated user's profile and stats. Solo race
// history lives on GET /api/races/history.
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("GET /me error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /api/users/me ──────────────────────────────────────
// Updates the parts of a profile the owner is allowed to change.
// Email and password are deliberately excluded: changing either is
// an account-security operation that needs its own flow (re-auth,
// verification), not a field on a profile form.
router.patch("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { fullName, username } = req.body;
    const updates = {};

    if (fullName !== undefined) {
      const clean = String(fullName).trim();
      if (clean.length > 60) {
        return res
          .status(400)
          .json({ error: "Name must be at most 60 characters" });
      }
      // An empty string clears the name rather than failing.
      updates.fullName = clean;
    }

    if (username !== undefined) {
      /* The same rule every route that takes a username applies. */
      const check = validateUsername(username);
      if (!check.ok) return res.status(400).json({ error: check.error });
      const clean = check.value;

      /* Case-insensitive, and excluding this user — otherwise
         re-saving your own name reads as "already taken", and
         "Ana"/"ana" could become two accounts colliding on the
         username-keyed leaderboard. */
      if (clean.toLowerCase() !== user.username.toLowerCase()) {
        const taken = await User.findOne({
          _id: { $ne: user._id },
          username: exactInsensitive(clean),
        });
        if (taken) {
          return res.status(409).json({ error: "Username already taken" });
        }
      }
      updates.username = clean;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    /* Whether the name on the session token is about to go stale.
       Compared before the save, while `user.username` is still the
       old value. */
    const renamed =
      updates.username !== undefined && updates.username !== user.username;

    Object.assign(user, updates);
    await user.save();

    await cacheUserProfile(req.app.locals.redis, user);

    /* ── Re-issue the session on a rename ─────────────────────────
       The JWT carries the username in its payload, and routes read
       it straight off `req.user` rather than looking the account up
       again. POST /api/races is the one that bites: it stamps
       `req.user.username` onto a track record, so after a rename
       every fastest lap was credited to the name the racer had
       just stopped using — and kept being, for the whole seven-day
       life of the old token.

       PUT /api/auth/update-username already did this. This route
       did not, which is the entire difference between renaming from
       the sign-up picker and renaming from the profile dashboard.

       Only on an actual change: a no-op PATCH, or one that touches
       nothing but fullName, has no reason to hand out a new token. */
    res.json({
      user: publicUser(user),
      ...(renamed ? { token: signToken(user) } : {}),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Username already taken" });
    }
    console.error("PATCH /me error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/users/me/settings ───────────────────────────────
// Stores the client's preference blob so it follows the account to
// any device. Separate from PATCH /me because settings are written
// often (every toggle, debounced) while identity changes are rare —
// mixing them would mean a theme flick racing a rename.
router.put("/me/settings", authenticate, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return res.status(400).json({ error: "settings must be an object" });
    }

    /* A cap, because this is a user-controlled blob written straight
       to their document — without it a client could push megabytes
       of junk (the custom snippet field alone is free-form text). */
    const size = Buffer.byteLength(JSON.stringify(settings), "utf8");
    if (size > 32 * 1024) {
      return res.status(413).json({ error: "Settings payload too large" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { settings } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    await cacheUserProfile(req.app.locals.redis, user);
    res.json({ settings: user.settings || {} });
  } catch (err) {
    console.error("PUT /me/settings error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/users/me/password ───────────────────────────────
// Change the password, given the current one. Every other session is
// ended; the device that made the change gets a fresh token. Accounts
// that sign in with Google or GitHub have no password to change.
router.put("/me/password", authenticate, accountLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const user = await User.findById(req.user.id).select("+authHash");
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.authProvider !== "email" || !user.authHash) {
      return res.status(400).json({ error: "This account signs in with Google or GitHub and has no password." });
    }
    if (typeof currentPassword !== "string" || !(await bcrypt.compare(currentPassword, user.authHash))) {
      return res.status(401).json({ error: "Your current password isn't right." });
    }
    const weak = passwordProblem(newPassword);
    if (weak) return res.status(400).json({ error: weak });
    if (await bcrypt.compare(newPassword, user.authHash)) {
      return res.status(400).json({ error: "That is your current password. Pick a new one." });
    }

    user.authHash = newPassword; // the pre-save hook hashes it
    await user.save();
    await revokeSessions(req.app.locals.redis, user._id);
    await cacheUserProfile(req.app.locals.redis, user);
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error("PUT /me/password error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/users/me ─────────────────────────────────────
// Delete the account and everything that names it: its laps on every
// track board, its cached profile, its sessions. Confirmed with the
// password, or — for an account that has none — by typing the
// username. The field averages the laps fed stay; they name nobody.
router.delete("/me", authenticate, accountLimiter, async (req, res) => {
  try {
    const { password, confirmUsername } = req.body || {};
    const user = await User.findById(req.user.id).select("+authHash");
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.authProvider === "email" && user.authHash) {
      if (typeof password !== "string" || !(await bcrypt.compare(password, user.authHash))) {
        return res.status(401).json({ error: "Your password isn't right." });
      }
    } else if (String(confirmUsername || "").trim().toLowerCase() !== user.username.toLowerCase()) {
      return res.status(400).json({ error: "Type your username to confirm." });
    }

    /* The boards first, while the account still exists to name them,
       then each affected track's cached record is pointed at whoever
       now leads it. */
    const tracks = await TrackBest.distinct("catalogId", { user: user._id });
    await TrackBest.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });
    await Promise.all(
      tracks.map((id) =>
        refreshRecordCache(id).catch((err) => console.warn(`Record cache refresh for ${id} failed:`, err.message))
      )
    );

    const redis = req.app.locals.redis;
    await revokeSessions(redis, user._id);
    if (redis?.isReady) await redis.del(`user:${user._id}`).catch(() => {});

    res.json({ message: "Account deleted" });
  } catch (err) {
    console.error("DELETE /me error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* Languages as the race log stores them, grouped the way the app
   names them. */
const LANGUAGE_NAMES = {
  "c++": "C++",
  cpp: "C++",
  python: "Python",
  javascript: "JavaScript",
  english: "English",
};

// ── GET /api/users/:username/public ──────────────────────────
// A driver's public page: stats, trophies, standing on the track
// boards, a year of activity and their recent laps. Nothing private —
// no email, no name, no settings.
router.get("/:username/public", publicLimiter, async (req, res) => {
  try {
    const check = validateUsername(req.params.username);
    if (!check.ok) return res.status(404).json({ error: "No driver by that name" });

    const user = await User.findOne({ username: exactInsensitive(check.value) })
      .select("username peakWpm averageWpm totalRaces eloRating currentStreak maxStreak trophies raceHistory createdAt")
      .lean();
    if (!user) return res.status(404).json({ error: "No driver by that name" });

    const history = [...(user.raceHistory || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    /* Laps per UTC day — the activity calendar. The log keeps the
       last 200 laps, so a very busy year shows its recent part. */
    const activity = {};
    for (const r of history) {
      const day = new Date(r.createdAt).toISOString().slice(0, 10);
      activity[day] = (activity[day] || 0) + 1;
    }

    const byLanguage = {};
    for (const r of history) {
      const name = LANGUAGE_NAMES[String(r.language).toLowerCase()] || r.language;
      const row = (byLanguage[name] ||= { language: name, races: 0, best: 0, sum: 0 });
      row.races++;
      row.best = Math.max(row.best, r.wpm);
      row.sum += r.wpm;
    }

    const [peakRank, board] = await Promise.all([
      user.totalRaces > 0 && user.peakWpm > 0
        ? User.countDocuments({ totalRaces: { $gt: 0 }, peakWpm: { $gt: user.peakWpm } }).then((n) => n + 1)
        : null,
      boardSummary(user._id),
    ]);

    res.json({
      username: user.username,
      joinedAt: user.createdAt,
      peakWpm: user.peakWpm ?? 0,
      averageWpm: user.averageWpm ?? 0,
      totalRaces: user.totalRaces ?? 0,
      eloRating: user.eloRating ?? 1200,
      currentStreak: user.currentStreak ?? 0,
      maxStreak: user.maxStreak ?? 0,
      trophies: user.trophies ?? [],
      peakRank,
      board,
      activity,
      languages: Object.values(byLanguage).map(({ sum, ...row }) => ({
        ...row,
        averageWpm: Math.round(sum / row.races),
        warmup: row.language === "English",
      })),
      recent: history.slice(0, 20).map((r) => ({
        wpm: r.wpm,
        accuracy: r.accuracy,
        timeElapsed: r.timeElapsed,
        language: LANGUAGE_NAMES[String(r.language).toLowerCase()] || r.language,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("GET /:username/public error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
