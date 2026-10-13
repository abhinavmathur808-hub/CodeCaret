/* ══════════════════════════════════════════════════════════════
   trophies — what each trophy is called and how it is earned.

   The server decides who has earned what (server/utils/trophies.js)
   and hands back ids; this is the other half: the name, the line on
   the cabinet, and how its badge is drawn. Order here is the order
   on the shelf — the easy ones first.
   ══════════════════════════════════════════════════════════════ */

export const TROPHIES = [
  { id: "first-lap", title: "Lights out", blurb: "Finish your first lap", tier: "bronze", glyph: "flag" },
  { id: "streak-3", title: "Hat-trick", blurb: "Race three days running", tier: "bronze", glyph: "flame", label: "3" },
  { id: "daily", title: "Daily driver", blurb: "Finish a track of the day", tier: "bronze", glyph: "calendar" },
  { id: "polyglot", title: "Polyglot", blurb: "Race C++, Python and JavaScript", tier: "bronze", glyph: "braces" },
  { id: "streak-7", title: "Full week", blurb: "Race seven days running", tier: "silver", glyph: "flame", label: "7" },
  { id: "wpm-60", title: "Sixty club", blurb: "Hit 60 WPM on code", tier: "silver", glyph: "gauge", label: "60" },
  { id: "flawless", title: "Clean lap", blurb: "Finish a code lap at 100% accuracy", tier: "silver", glyph: "diamond" },
  { id: "podium", title: "Podium", blurb: "Finish top three on a track's board", tier: "silver", glyph: "podium" },
  { id: "races-50", title: "Half century", blurb: "Race 50 code laps", tier: "silver", glyph: "laps", label: "50" },
  { id: "wpm-100", title: "Triple digits", blurb: "Hit 100 WPM on code", tier: "gold", glyph: "gauge", label: "100" },
  { id: "record", title: "Track record", blurb: "Hold P1 on a track", tier: "gold", glyph: "crown" },
  { id: "streak-30", title: "Iron driver", blurb: "Race thirty days running", tier: "gold", glyph: "flame", label: "30" },
];

export const trophyById = (id) => TROPHIES.find((t) => t.id === id) ?? null;
