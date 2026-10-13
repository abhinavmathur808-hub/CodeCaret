import { S1_END, S2_END, S_POLE, S_FINISH } from "./trackLayout.js";

/* ══════════════════════════════════════════════════════════════
   content — what the home page says, and where on the lap it
   says it.

   Every claim here is a real, shipped CodeCaret feature, and the
   numbers are counted from the code rather than rounded for
   marketing: 514 snippets (174 C++, 170 Python, 170 JavaScript),
   19 topics, 15 themes, 12 fonts, 12 switch sounds, a 300 WPM
   ceiling. If one of those changes, change it here.

   `at` is the stretch of track, in metres along the centreline,
   over which a panel is on screen. The 3D set pieces for each
   section are placed from the same numbers, so copy and scenery
   cannot drift apart.
   ══════════════════════════════════════════════════════════════ */

/** Metres of track over which a panel fades in, and out again. */
export const PANEL_FADE = 26;

export const SECTIONS = [
  {
    id: "grid",
    at: [S_POLE - 10, 118],
    side: "left",
    hero: true,
    kicker: "The typing simulator for code",
    tagline: "Prove your keystrokes.",
    body: "Type real code against the clock. 514 snippets across C++, Python and JavaScript, each one timed and scored like a lap of a Formula 1 circuit.",
  },
  {
    id: "code",
    at: [226, 444],
    side: "right",
    sector: 1,
    tag: "The code",
    title: "Real code.",
    em: "Not lorem ipsum.",
    body: "Every lap is a real snippet — 174 in C++, 170 in Python, 170 in JavaScript — with its real indentation, brackets and operators, typed exactly as written.",
    chips: ["19 topics: DP, graphs, trees, async…", "Short, medium or long", "Symbol-density filter", "Bring your own snippet"],
    stat: ["514", "snippets"],
  },
  {
    id: "telemetry",
    at: [476, S1_END + 4],
    side: "left",
    sector: 1,
    tag: "Telemetry",
    title: "Telemetry on",
    em: "every keystroke.",
    body: "Live WPM and accuracy while you type. Cross the line for the full debrief: peak speed, sector splits for S1 to S3, and a WPM trace of the whole lap.",
    chips: ["Live WPM", "Accuracy", "Sector splits", "WPM trace"],
  },
  {
    id: "ghost",
    at: [752, 1004],
    side: "left",
    sector: 2,
    tag: "Ghost lap",
    title: "Race your",
    em: "best self.",
    body: "Set a personal best and it comes back as a ghost: a second caret that replays your fastest lap's exact keystroke timing, right beside yours.",
    chips: ["A ghost for every snippet", "Keystroke-exact replay"],
  },
  {
    id: "podium",
    at: [1030, 1208],
    side: "right",
    sector: 2,
    tag: "The podium",
    title: "Every snippet has",
    em: "its own podium.",
    body: "Finish a lap and it lands on that snippet's leaderboard. The top three take the podium, equal WPM is settled on accuracy, and you always see your own position and the gap to P3.",
    chips: ["Track records", "Accuracy tie-break", "Your rank, always"],
  },
  {
    id: "championship",
    at: [1228, S2_END + 2],
    side: "left",
    sector: 2,
    tag: "Championship",
    title: "A championship,",
    em: "not a counter.",
    body: "Every race moves your Elo rating against the field. Keep a daily streak that follows your own timezone, set a practice goal of 5, 15, 30 or 60 minutes, and look back on every race from your profile.",
    chips: ["Elo rating", "Global standings", "Daily streaks", "Race history"],
  },
  {
    id: "garage",
    at: [1468, 1632],
    side: "right",
    sector: 3,
    tag: "The garage",
    title: "Set the car up",
    em: "your way.",
    body: "15 colour themes, 12 typing fonts, 12 mechanical switch sounds and three caret styles. Strict, freedom, blind and zen modes, a keyboard that lights the next key, and a race engineer on the radio.",
    chips: ["15 themes", "12 fonts", "12 switch sounds", "Engineer radio"],
  },
  {
    id: "fairplay",
    at: [1652, 1804],
    side: "left",
    sector: 3,
    tag: "Scrutineering",
    title: "Every lap",
    em: "is scrutineered.",
    body: "Results ship with their keystroke telemetry and the server rebuilds the run itself. Anything past 300 WPM, robotic key timing or numbers that don't add up is thrown out, so every board stays honest.",
    chips: ["Server-side replay", "300 WPM ceiling", "Human-timing checks"],
  },
  {
    id: "finish",
    at: [S_FINISH - 34, Infinity],
    side: "center",
    finale: true,
    tag: "Chequered flag",
    title: "Your seat",
    em: "is ready.",
    body: "Practice needs no account — jump straight in. Sign in with Google, GitHub or email to put your laps on the podium, and your settings, streaks and records follow you to every device.",
  },
];

/* Quotes — the big lines between the stops. Each fills a gap between
   two panels (or part of the runs off the grid and to the flag), so a
   quote never shares the screen with copy, and the scroll map gives
   every one its own stretch of scrolling to hold for. `by` is who says
   it, in the logo's lettering. */
export const QUOTES = [
  { id: "type-fast", at: [130, 216], line: "Type fast.", em: "Code faster.", by: "The pit wall" },
  { id: "keystrokes", at: [444, 476], line: "Every keystroke", em: "counts.", by: "Telemetry" },
  { id: "yesterday", at: [1004, 1030], line: "Beat yesterday’s", em: "you.", by: "Your ghost" },
  { id: "accuracy", at: [1208, 1228], line: "Speed wins laps.", em: "Accuracy wins races.", by: "Race engineer" },
  { id: "keyboard", at: [1454, 1468], line: "Your keyboard.", em: "Your car.", by: "The garage" },
  { id: "no-shortcuts", at: [1830, 1990], line: "No shortcuts.", em: "Just speed.", by: "The scrutineers" },
];

/** The quote up at distance s, or null. */
export const quoteAt = (s) => QUOTES.find((q) => s >= q.at[0] && s <= q.at[1]) ?? null;

/* Team radio. These are the race engineer's real lines from the
   typing page (components/useRaceEngineer.js); each plays once per
   visit, when the car first passes `at` going forward. */
export const RADIO = [
  { at: S_POLE + 3, text: "Lights out and away we go!" },
  { at: 560, text: "Purple sector. Keep pushing." },
  { at: 1236, text: "DRS enabled. Go go go!" },
  { at: S_FINISH, text: "Chequered flag! Great drive." },
];

/* Timing-screen sectors, for the HUD and the gantries. */
export const SECTORS = [
  { id: 1, from: S_POLE, to: S1_END },
  { id: 2, from: S1_END, to: S2_END },
  { id: 3, from: S2_END, to: S_FINISH },
];
