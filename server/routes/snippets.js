const express = require("express");
const { optionalAuth } = require("../middleware/auth");
const { trackBoard, trackGhost } = require("../utils/trackBoard");

const router = express.Router();

/* `:id` on every route here is the client's own catalogue id
   ("cpp-s-1", "daily-2026-10-10"), not a Mongo _id: the typing corpus
   is static data in the client bundle, so that string is the only
   identifier a track has. Constrained to the shape the catalogue
   uses, the same check POST /api/races applies. */
const CATALOG_ID = /^[a-z0-9][a-z0-9-]{0,39}$/i;

/* ── GET /api/snippets/:id/leaderboard ───────────────────────
   The track's own board: a podium of the three fastest completed
   laps (one per racer, ties broken on accuracy) and how many racers
   have finished the track at all. Its P1 is the track record.

   Public. With a valid session it also reports the caller's own
   position, so a racer outside the top three can see how far off
   the podium they are — the board itself stays at three rows.

   A track nobody has completed yet is not an error: it answers an
   empty podium, the same shape as a real board, so the client needs
   no special case. */
router.get("/:id/leaderboard", optionalAuth, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!CATALOG_ID.test(id)) {
      return res.status(400).json({ error: "Invalid snippet id" });
    }

    res.json(await trackBoard(id, req.user?.id ?? null));
  } catch (err) {
    console.error("❌ GET /api/snippets/:id/leaderboard error:", err.message);
    res.status(500).json({ error: "Failed to fetch track leaderboard" });
  }
});

/* ── GET /api/snippets/:id/ghost ─────────────────────────────
   The fastest lap on the track that can be replayed: who set it, its
   pace, and its per-character timings, so the race screen can put
   the record holder's caret on the track beside yours. Public, like
   the board it comes from. `ghost` is null until a lap with timings
   exists. */
router.get("/:id/ghost", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!CATALOG_ID.test(id)) {
      return res.status(400).json({ error: "Invalid snippet id" });
    }
    res.json({ snippetId: id, ghost: await trackGhost(id) });
  } catch (err) {
    console.error("❌ GET /api/snippets/:id/ghost error:", err.message);
    res.status(500).json({ error: "Failed to fetch track ghost" });
  }
});

module.exports = router;
