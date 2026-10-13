const mongoose = require("mongoose");

/* ══════════════════════════════════════════════════════════════
   Snippet — what the server knows about one catalogue track.

   The typing corpus itself (514 code snippets and 40 warm-up
   passages) is static data in the client bundle, so this collection
   never holds code. A row is created the first time a track is
   raced, keyed by the client's own catalogue id ("cpp-s-1",
   "daily-2026-10-10"), and holds two things:

     • a cache of the track record (P1 on the track's board, see
       utils/trackBoard.js), which the rating reads before a race;
     • the field pace: what everyone averages on the track, which is
       the asynchronous opponent the rating measures a lap against.

   The collection once also held a separate, older set of seeded
   snippets with their code. That dataset and the endpoint that
   served it are gone; models/staleIndexes.js drops the indexes it
   left behind.
   ══════════════════════════════════════════════════════════════ */

const snippetSchema = new mongoose.Schema(
  {
    /* The client's catalogue id — the only identity a track has.

       Still sparse, as it was while seeded rows without one shared
       the collection: changing the options of an existing index
       makes Mongo refuse to build it, and a database that still
       holds such rows would fail a non-sparse unique index. */
    catalogId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      sparse: true,
    },
    /* Lowercased race language, as the race route stores it. */
    language: {
      type: String,
      trim: true,
      lowercase: true,
    },

    /* ── Track record ─────────────────────────────────────────────
       A cache of P1, written FROM the board after every completed
       lap and never compared on its own.

       recordHolder is a denormalised username rather than a user
       ref: all it is ever used for is a name. The board itself joins
       live usernames, so a rename shows there at once.
       ────────────────────────────────────────────────────────────── */
    recordWpm: {
      type: Number,
      default: 0,
      min: 0,
    },
    recordHolder: {
      type: String,
      trim: true,
      default: "None",
    },
    recordAt: {
      type: Date,
      default: null,
    },
    /* The user behind the record, so a racer is not rated against
       their own ghost. Not exposed publicly — recordHolder is the
       name people see. */
    recordHolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },

    /* ── Field pace ───────────────────────────────────────────────
       The asynchronous opponent: what everyone else averages on this
       track. Kept as a running sum and count rather than a rolling
       average, for the same reason User.averageWpm is — feeding a
       rounded average back into itself accumulates error on every
       race. */
    wpmSum: {
      type: Number,
      default: 0,
      select: false,
    },
    raceCount: {
      type: Number,
      default: 0,
      select: false,
    },
    avgWpm: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Snippet", snippetSchema);
