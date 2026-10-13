const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [24, "Username must be at most 24 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      /* [^\s@] rather than \S, matching the sign-up form: \S+@\S+\.\S+
         accepts "a@b@c.d", so anything posting straight to the API
         could register an address the form itself rejects. */
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address"],
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: [60, "Name must be at most 60 characters"],
    },
    peakWpm: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRaces: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageWpm: {
      type: Number,
      default: 0,
      min: 0,
    },
    /**
     * Running total of every race's WPM, and the number of races that
     * contributed to it. averageWpm is derived from these rather than
     * from a self-referencing rounded average, which accumulated error
     * on every race. See utils/raceStats.js.
     */
    wpmSum: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
    wpmRaces: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
    /* ── Rating ───────────────────────────────────────────────────
       Elo against an asynchronous target — see utils/elo.js. The
       standings' rating board reads it through the named
       `rating_board` index below. A plain index on this field alone
       must not come back: the old head-to-head system left a stale
       `eloRating_-1`, which models/staleIndexes.js drops, and
       re-creating it under that name would put back exactly what is
       being removed. */
    eloRating: {
      type: Number,
      default: 1200,
    },

    /* ── Daily streak ─────────────────────────────────────────────
       Days are the racer's own local days, so all three of these
       move together in one atomic update — see utils/streak.js. */
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastRaceDate: {
      type: Date,
      default: null,
    },
    /* The local calendar day of the last race, "YYYY-MM-DD" in the
       zone the racer was in.

       Stored alongside lastRaceDate rather than derived from it,
       because the streak decision has to be made INSIDE the atomic
       update: comparing a stored Date against "today in Asia/Kolkata"
       is not something an update pipeline can do, but comparing two
       day strings is. Without it, deciding the streak would need a
       read followed by a write, and a double-submit could increment
       twice. */
    lastRaceDay: {
      type: String,
      default: null,
    },

    /* ── Trophies ─────────────────────────────────────────────────
       Milestones earned once and kept, with when — see
       utils/trophies.js. The client decides how each one looks. */
    trophies: {
      type: [
        {
          _id: false,
          id: { type: String, required: true },
          at: { type: Date, required: true },
        },
      ],
      default: () => [],
    },

    /* ── Password reset ───────────────────────────────────────────
       Only a SHA-256 of the emailed token is kept, so a copy of the
       database cannot be used to reset anyone's password; the token
       itself exists only in the email. One at a time, short-lived,
       cleared on use. */
    resetTokenHash: {
      type: String,
      default: undefined,
      select: false,
    },
    resetTokenExpires: {
      type: Date,
      default: undefined,
      select: false,
    },

    raceHistory: [
      {
        wpm: { type: Number, required: true },
        accuracy: { type: Number, required: true },
        timeElapsed: { type: Number, required: true },
        language: { type: String, default: "javascript" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    /**
     * Client preferences (theme, font, sound, filters…), stored as an
     * opaque blob so adding a setting never needs a migration here.
     *
     * Deliberately schema-less: the client owns what a setting means
     * and validates the keys it accepts on the way back in. The
     * server's job is to keep the bag and hand it to whichever device
     * asks — it has no opinion about what "caretStyle" is.
     */
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    /* ── Sign-in method ───────────────────────────────────────────
       An account is reached by exactly one of: a password, a Google
       identity, or a GitHub identity.

       The provider ids are sparse as well as unique — every
       password account leaves them unset, and a plain unique index
       treats "missing" as null, so the second such account would
       collide with the first.
       ────────────────────────────────────────────────────────────── */
    authProvider: {
      type: String,
      enum: ["email", "google", "github"],
      default: "email",
      index: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
      select: false,
    },
    githubId: {
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
      select: false,
    },

    /* Required only for password accounts. An OAuth user has no
       password to store, and demanding one would mean inventing a
       secret nobody can use — see the note in routes/auth.js on why
       a random filler is worse than an absent field. */
    authHash: {
      type: String,
      required: [
        function () {
          return this.authProvider === "email";
        },
        "Auth hash is required",
      ],
      select: false, // never returned in queries by default
    },
  },
  { timestamps: true }
);

// ── Pre-save hook: auto-hash authHash when modified ──────────
// Mongoose does not pass `next` to async middleware — it awaits the
// returned promise instead. Declaring both threw "next is not a
// function" on every save, which made registration fail with a 500.
userSchema.pre("save", async function () {
  if (!this.isModified("authHash")) return;
  this.authHash = await bcrypt.hash(this.authHash, SALT_ROUNDS);
});

// Index for leaderboard queries
userSchema.index({ peakWpm: -1 });
/* The rating board. Named, so it can never be mistaken for the stale
   `eloRating_-1` that models/staleIndexes.js removes. */
userSchema.index({ eloRating: -1, peakWpm: -1 }, { name: "rating_board" });

module.exports = mongoose.model("User", userSchema);

