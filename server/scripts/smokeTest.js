/**
 * smokeTest.js — End-to-end check of the CodeCaret HTTP API.
 *
 * Usage:  npm run smoke            (server must already be running)
 *         SMOKE_URL=https://... npm run smoke
 *
 * Creates one throwaway account (cc_smoke_<timestamp>) and deletes it
 * again at the end. Point this at a development environment, not
 * production.
 */

require("dotenv").config();

const BASE = (process.env.SMOKE_URL || "http://localhost:5000").replace(/\/+$/, "");

const stamp = Date.now();
const USER = `cc_smoke_${stamp}`;
const EMAIL = `cc_smoke_${stamp}@example.test`;
/* Must satisfy the server's password policy: 8+ chars with an
   uppercase letter, a digit and a special character. */
const PASS = "SmokeTest123!";
/* A catalogue id of its own, so the track-leaderboard checks never
   touch a real track's board. */
const TRACK = `smoke-${stamp}`;

/* Keystroke telemetry the server will accept for a completed lap at
   `wpm`: one arrival time per character, jittered like real typing.
   A completed lap with no telemetry is refused outright. */
function lapBody({ wpm, accuracy, completed = true }) {
  const durationMs = 30000;
  const correct = Math.round((wpm * 5 * durationMs) / 60000);
  const times = [];
  for (let i = 0; i < correct; i++) {
    times.push(Math.max(0, Math.round((i / (correct - 1)) * 29000 + Math.sin(i * 12.9898) * 55)));
  }
  times.sort((a, b) => a - b);
  times[0] = 0;
  return {
    wpm, accuracy, timeElapsed: 30, language: "javascript",
    snippetId: TRACK, completed,
    keystrokeTimestamps: times, correctKeystrokes: correct,
    durationMs, timeLimit: 0, timeZone: "UTC",
  };
}

let pass = 0;
let fail = 0;

const check = (name, ok, detail = "") => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${detail ? "  → " + detail : ""}`);
  }
};

const section = (title) => console.log(`\n── ${title} ` + "─".repeat(Math.max(0, 48 - title.length)));

async function call(path, opts = {}) {
  const res = await fetch(BASE + path, opts);
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, body };
}

const post = (path, data, token) =>
  call(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

const get = (path, token) =>
  call(path, token ? { headers: { Authorization: `Bearer ${token}` } } : {});

/* ── Remove the throwaway account ──────────────────────────── */
async function cleanup() {
  section("Cleanup");
  let mongoose;
  try {
    mongoose = require("mongoose");
    const User = require("../models/User");

    const TrackBest = require("../models/TrackBest");
    const Snippet = require("../models/Snippet");

    await mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 2 });

    /* Board rows first, while the accounts still exist to find them
       by — a lap left behind by a deleted account would sit in every
       racer count for that track. */
    const ids = (await User.find({ username: /^cc_smoke_/ }).select("_id").lean()).map((u) => u._id);
    const laps = await TrackBest.deleteMany({ $or: [{ user: { $in: ids } }, { catalogId: /^smoke-/ }] });
    await Snippet.deleteMany({ catalogId: /^smoke-/ });

    const res = await User.deleteMany({ username: /^cc_smoke_/ });
    console.log(`  🧹 Deleted ${res.deletedCount} smoke account(s) and ${laps.deletedCount} board row(s) from MongoDB`);

  } catch (err) {
    console.log(`  ⚠️  Cleanup incomplete: ${err.message}`);
    console.log(`     Remove users matching /^cc_smoke_/ manually.`);
  } finally {
    if (mongoose) await mongoose.connection.close().catch(() => {});
  }
}

(async () => {
  console.log(`\nCodeCaret smoke test → ${BASE}`);

  section("Health & public reads");
  const health = await get("/health");
  check("GET /health → 200", health.status === 200, `got ${health.status}`);
  check(
    "mongo connected",
    health.body?.services?.mongo === "connected",
    JSON.stringify(health.body?.services)
  );

  const standings = await get("/api/leaderboard/standings?board=peak");
  check("GET /api/leaderboard/standings → 200", standings.status === 200);
  check(
    "standings carry rows and no viewer row when signed out",
    Array.isArray(standings.body?.rows) && standings.body?.you === null,
    JSON.stringify(standings.body).slice(0, 120)
  );

  check("unknown route → 404", (await get("/api/no-such-route")).status === 404);
  check(
    "an invalid track id → 400",
    (await get("/api/snippets/not_a~track/leaderboard")).status === 400
  );

  section("Registration");
  const reg = await post("/api/auth/register", {
    username: USER,
    email: EMAIL,
    password: PASS,
  });
  check("register → 201", reg.status === 201, JSON.stringify(reg.body));
  check("register returns token + user", Boolean(reg.body?.token && reg.body?.user));

  const dupCase = await post("/api/auth/register", {
    username: USER.toUpperCase(),
    email: `other_${stamp}@example.test`,
    password: PASS,
  });
  check("duplicate username, different case → 409", dupCase.status === 409, `got ${dupCase.status}`);

  check(
    "password failing the policy → 400",
    (
      await post("/api/auth/register", {
        username: `weak_${stamp}`,
        email: `weak_${stamp}@example.test`,
        password: "password",
      })
    ).status === 400
  );

  check(
    "username shorter than 3 → 400",
    (
      await post("/api/auth/register", {
        username: "ab",
        email: `short_${stamp}@example.test`,
        password: PASS,
      })
    ).status === 400
  );

  section("Login");
  const login = await post("/api/auth/login", { email: EMAIL, password: PASS });
  check("login with email → 200", login.status === 200, JSON.stringify(login.body));
  const token = login.body?.token;
  check("login returns a token", Boolean(token));

  const badPass = await post("/api/auth/login", { email: EMAIL, password: "wrong-one" });
  const noUser = await post("/api/auth/login", {
    email: `ghost_${stamp}@example.test`,
    password: PASS,
  });
  check("wrong password → 401", badPass.status === 401);
  check("unknown email → 401", noUser.status === 401);
  check(
    "identical error for both (no user enumeration)",
    badPass.body?.error === noUser.body?.error,
    `${badPass.body?.error} vs ${noUser.body?.error}`
  );

  section("Authenticated endpoints");
  const me = await get("/api/users/me", token);
  check("GET /api/users/me → 200", me.status === 200);
  check("returns the right user", me.body?.user?.username === USER);
  check("without token → 401", (await get("/api/users/me")).status === 401);
  check("with junk token → 401", (await get("/api/users/me", "junk")).status === 401);

  section("Race submission & aggregates");
  const r1 = await post(
    "/api/races",
    { wpm: 60, accuracy: 95, timeElapsed: 30, language: "javascript" },
    token
  );
  check("submit race 1 → 201", r1.status === 201, JSON.stringify(r1.body));
  check("totalRaces = 1", r1.body?.stats?.totalRaces === 1);
  check("averageWpm = 60", r1.body?.stats?.averageWpm === 60, `got ${r1.body?.stats?.averageWpm}`);
  check("peakWpm = 60", r1.body?.stats?.peakWpm === 60);

  const r2 = await post(
    "/api/races",
    { wpm: 81, accuracy: 90, timeElapsed: 25, language: "cpp" },
    token
  );
  check("submit race 2 → 201", r2.status === 201);
  check("totalRaces = 2", r2.body?.stats?.totalRaces === 2);
  // (60 + 81) / 2 = 70.5 → 70 ($round is half-to-even). The value is
  // derived from the running sum, not a re-rounded average.
  check("averageWpm = 70", r2.body?.stats?.averageWpm === 70, `got ${r2.body?.stats?.averageWpm}`);
  check("peakWpm = 81", r2.body?.stats?.peakWpm === 81);

  check(
    "wpm above the cap → 400",
    (await post("/api/races", { wpm: 9999, accuracy: 90, timeElapsed: 10 }, token)).status === 400
  );
  check(
    "negative timeElapsed → 400",
    (await post("/api/races", { wpm: 60, accuracy: 90, timeElapsed: -5 }, token)).status === 400
  );
  check(
    "unsupported language → 400",
    (
      await post(
        "/api/races",
        { wpm: 60, accuracy: 90, timeElapsed: 10, language: "not-a-language" },
        token
      )
    ).status === 400
  );

  const hist = await get("/api/races/history", token);
  check("GET /api/races/history → 200", hist.status === 200);
  check("history has 2 entries", hist.body?.history?.length === 2, `got ${hist.body?.history?.length}`);
  check("history is newest-first", hist.body?.history?.[0]?.wpm === 81);

  section("Leaderboards");
  const global = await get("/api/leaderboard/global");
  check("GET /api/leaderboard/global → 200", global.status === 200);
  check(
    "racer appears on the global board",
    Array.isArray(global.body) && global.body.some((e) => e.username === USER)
  );

  const mine = await get("/api/leaderboard/standings?board=peak", token);
  check(
    "a signed-in standings read includes your row",
    mine.body?.you?.username === USER,
    JSON.stringify(mine.body?.you)
  );

  section("Track leaderboard");
  const emptyBoard = await get(`/api/snippets/${TRACK}/leaderboard`);
  check("GET /api/snippets/:id/leaderboard → 200", emptyBoard.status === 200);
  check(
    "an unraced track has an empty podium",
    Array.isArray(emptyBoard.body?.podium) && emptyBoard.body.podium.length === 0
  );

  const partial = await post("/api/races", lapBody({ wpm: 70, accuracy: 96, completed: false }), token);
  check("an incomplete lap is still recorded", partial.status === 201, JSON.stringify(partial.body));
  check("…but stays off the track's board", partial.body?.trackStanding === null);

  const lap1 = await post("/api/races", lapBody({ wpm: 64, accuracy: 95 }), token);
  check("a completed lap → 201", lap1.status === 201, JSON.stringify(lap1.body).slice(0, 200));
  check("…comes back P1 on an empty track", lap1.body?.trackStanding?.you?.position === 1);
  check("…and is reported as the new track record", lap1.body?.trackRecord?.isRecord === true);

  const slower = await post("/api/races", lapBody({ wpm: 60, accuracy: 99 }), token);
  check("a slower lap does not replace the best", slower.body?.trackStanding?.isPersonalBest === false);

  const board = await get(`/api/snippets/${TRACK}/leaderboard`, token);
  check(
    "the board shows the racer's best, once",
    board.body?.racers === 1 &&
      board.body?.podium?.[0]?.username === USER &&
      board.body?.podium?.[0]?.wpm === 64,
    JSON.stringify(board.body?.podium)
  );
  check("a signed-in read includes your standing", board.body?.you?.position === 1);
  check(
    "a public read does not",
    (await get(`/api/snippets/${TRACK}/leaderboard`)).body?.you === null
  );

  await cleanup();

  console.log(`\n════ ${pass} passed, ${fail} failed ════\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (err) => {
  console.error("\n💥 Smoke test crashed:", err.message);
  await cleanup();
  process.exit(1);
});
