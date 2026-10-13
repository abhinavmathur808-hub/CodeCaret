const User = require("./User");
const Snippet = require("./Snippet");

/* ══════════════════════════════════════════════════════════════
   Stale index cleanup.

   Mongo keeps an index until it is explicitly dropped, so one left
   behind by a removed feature costs every write to its collection a
   B-tree update for a query nothing runs any more. These were:

     users     eloRating_-1             the old head-to-head Elo
                                        system's ranking
               phone_1                  a phone-number field the
                                        account no longer has
     snippets  category_1,              the seeded-snippet picker
               category_1_difficulty_1, (GET /api/snippets/random),
               language_1_difficulty_1  removed with its dataset

   Called once from the boot sequence rather than at module load —
   importing a model should not touch the database, and this way a
   failure is reported next to the other startup lines instead of
   from inside a require.

   Idempotent: a missing index is the expected steady state, and
   `IndexNotFound` is swallowed as success.
   ══════════════════════════════════════════════════════════════ */
const STALE_INDEXES = [
  [User, ["eloRating_-1", "phone_1"]],
  [Snippet, ["category_1", "category_1_difficulty_1", "language_1_difficulty_1"]],
];

async function dropStaleIndexes() {
  for (const [Model, names] of STALE_INDEXES) {
    for (const name of names) {
      try {
        await Model.collection.dropIndex(name);
        console.log(`🧹 Dropped stale index ${name} on ${Model.collection.name}`);
      } catch (err) {
        /* 27 = IndexNotFound, 26 = NamespaceNotFound (fresh database).
           Both mean there is nothing to clean up. */
        if (err.code === 27 || err.code === 26) continue;
        console.warn(`⚠️  Could not drop index ${name}:`, err.message);
      }
    }
  }
}

module.exports = { dropStaleIndexes };
