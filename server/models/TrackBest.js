const mongoose = require("mongoose");

/* ══════════════════════════════════════════════════════════════
   TrackBest — one racer's best completed lap on one track.

   Every catalogue snippet has its own leaderboard, and this is what
   it is built from: exactly one document per (track, racer), holding
   that racer's best lap. The board is "everyone who has finished
   this track, best lap each", so storing every attempt would only
   make the read collapse them back down again.

   ── Ranking ─────────────────────────────────────────────────────
     1. wpm        — higher first
     2. accuracy   — higher first, when wpm is level
     3. achievedAt — EARLIER first, when both are level: whoever set
                     a time first keeps the place, which is how every
                     timing board settles an exact tie.

   ── Completed laps only ─────────────────────────────────────────
   Nothing here is written for a lap the time limit cut short. A
   partial lap posts a real WPM over part of the code; ranking it
   against laps that typed the whole thing would let the board be
   won by whoever picks the shortest timer.

   The username is NOT stored. Boards are read with a join on users,
   so a rename shows up everywhere at once instead of leaving the old
   name on every podium until each lap is beaten.
   ══════════════════════════════════════════════════════════════ */

const trackBestSchema = new mongoose.Schema(
  {
    /* The client's catalogue id ("cpp-s-1") — the only identity a
       snippet has; the typing corpus lives in the client bundle. */
    catalogId: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    wpm: {
      type: Number,
      required: true,
      min: 0,
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    /** Seconds the lap took — shown on the board, not ranked on. */
    timeElapsed: {
      type: Number,
      min: 0,
      default: null,
    },
    /** When this best was set. The final tie-break, so it moves only
        when the best itself improves. */
    achievedAt: {
      type: Date,
      required: true,
    },
    /** The lap itself: elapsed ms at which the caret passed each
        character — the telemetry the lap was verified on, and what a
        ghost of it replays. Left out of ordinary reads; only the ghost
        endpoint asks for it. Absent on laps set before it was kept. */
    times: {
      type: [Number],
      default: undefined,
      select: false,
    },
  },
  { timestamps: true }
);

/* One best per racer per track. Also what makes the personal-best
   write safe to race: two submissions cannot both insert. */
trackBestSchema.index({ catalogId: 1, user: 1 }, { unique: true });

/* The board read, in ranking order, so "top 3" is an index walk of
   three entries rather than a sort of everyone who ever finished. */
trackBestSchema.index({ catalogId: 1, wpm: -1, accuracy: -1, achievedAt: 1 });

module.exports = mongoose.model("TrackBest", trackBestSchema);
