/* Unit tests for the pure rules behind a race: rating, streak and the
   telemetry check. No database, no server — `npm test`. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { rateRace, pickTarget, wpmToRating } = require("../utils/elo");
const { dayKeys, nextStreak } = require("../utils/streak");
const { verifyRun, toPressEvents } = require("../utils/antiCheat");

/* A lap typed like a person: uneven gaps between keys. */
function humanRun(chars, meanGapMs, seed = 7) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out = [];
  let t = 0;
  for (let i = 0; i < chars; i++) {
    t += meanGapMs * (0.45 + rand() * 1.1);
    out.push(Math.round(t));
  }
  return out;
}
const wpmOf = (timestamps) => Math.round(timestamps.length / 5 / (timestamps[timestamps.length - 1] / 60000));

test("a 50 WPM field is an even match for a new account", () => {
  assert.equal(wpmToRating(50), 1200);
});

test("an unraced snippet is unrated", () => {
  const r = rateRace({ rating: 1300, wpm: 80, targetWpm: null });
  assert.equal(r.rated, false);
  assert.equal(r.delta, 0);
  assert.equal(r.rating, 1300);
});

test("beating the field gains rating, losing to it costs some", () => {
  const up = rateRace({ rating: 1200, wpm: 90, targetWpm: 60 });
  const down = rateRace({ rating: 1200, wpm: 30, targetWpm: 60 });
  assert.ok(up.rated && up.delta > 0, `up ${up.delta}`);
  assert.ok(down.delta < 0, `down ${down.delta}`);
});

test("the reported delta is always the change actually applied, within the caps", () => {
  for (const start of [100, 101, 150, 1200, 2950, 2999, 3000]) {
    for (const [wpm, targetWpm] of [[300, 40], [5, 120], [60, 60], [120, 300], [20, 20]]) {
      const r = rateRace({ rating: start, wpm, targetWpm });
      assert.equal(r.rating - start, r.delta, `${start} ${wpm}/${targetWpm}`);
      assert.ok(r.rating >= 100 && r.rating <= 3000);
    }
  }
});

test("your own record is never your opponent", () => {
  const snippet = { avgWpm: 0, recordWpm: 80, recordHolderId: "me" };
  assert.equal(pickTarget(snippet, "me").targetWpm, null);
});

test("streak: same day holds, next day grows, a gap restarts", () => {
  const keys = { today: "2026-10-10", yesterday: "2026-10-09" };
  assert.equal(nextStreak("2026-10-10", 4, keys), 4);
  assert.equal(nextStreak("2026-10-09", 4, keys), 5);
  assert.equal(nextStreak("2026-10-01", 4, keys), 1);
  assert.equal(nextStreak(null, 0, keys), 1);
});

test("streak days follow the racer's zone, and a bad zone falls back to UTC", () => {
  const now = new Date("2026-10-10T23:30:00Z");
  assert.equal(dayKeys(now, "Asia/Kolkata").today, "2026-10-11");
  assert.equal(dayKeys(now, "UTC").today, "2026-10-10");
  assert.equal(dayKeys(now, "Not/AZone").zone, "UTC");
});

test("a human-shaped lap passes the telemetry check", () => {
  const ts = humanRun(240, 180);
  const v = verifyRun(wpmOf(ts), ts, 0, true, { correctKeystrokes: ts.length });
  assert.equal(v.valid, true, v.reason);
});

test("a lap claiming more WPM than its timings support is refused", () => {
  const ts = humanRun(240, 180);
  const v = verifyRun(wpmOf(ts) * 2, ts, 0, true, { correctKeystrokes: ts.length });
  assert.equal(v.valid, false);
});

test("machine-even key intervals are refused", () => {
  const ts = Array.from({ length: 240 }, (_, i) => (i + 1) * 120);
  const v = verifyRun(wpmOf(ts), ts, 0, true, { correctKeystrokes: ts.length });
  assert.equal(v.valid, false);
  assert.match(v.reason, /uniform/);
});

test("telemetry that runs backwards is refused", () => {
  const ts = humanRun(60, 150);
  ts[30] = ts[29] - 5;
  assert.equal(verifyRun(50, ts, 0, true, { correctKeystrokes: ts.length }).valid, false);
});

test("one Tab press covering an indent counts as one press", () => {
  assert.deepEqual(toPressEvents([100, 250, 250, 250, 400]), [100, 250, 400]);
});

test("a lap's ghost timings are kept whole, ordered and in whole ms", () => {
  const { cleanTimes } = require("../utils/trackBoard");
  assert.deepEqual(cleanTimes([0, 120.4, 120.4, 250.6]), [0, 120, 120, 251]);
  assert.equal(cleanTimes([0, 300, 200]), null);
  assert.equal(cleanTimes([0, NaN, 400]), null);
  assert.equal(cleanTimes([]), null);
  assert.equal(cleanTimes("0,1,2"), null);
});

test("trophies follow the account, and warm-ups earn only streak ones", () => {
  const { qualifyingTrophies, newTrophies } = require("../utils/trophies");
  const user = {
    currentStreak: 7,
    totalRaces: 50,
    peakWpm: 104,
    raceHistory: [{ language: "c++" }, { language: "python" }, { language: "javascript" }],
  };
  const race = { wpm: 104, accuracy: 100, completed: true, warmup: false, catalogId: "daily-2026-10-10" };
  const all = qualifyingTrophies({
    user,
    race,
    trackRecord: { isRecord: true },
    trackStanding: { you: { position: 1 } },
  });
  for (const id of ["first-lap", "streak-3", "streak-7", "daily", "races-50", "wpm-60", "wpm-100", "flawless", "podium", "record", "polyglot"]) {
    assert.ok(all.includes(id), id);
  }
  assert.ok(!all.includes("streak-30"));

  const warm = qualifyingTrophies({ user, race: { ...race, warmup: true, catalogId: "en-s-1" }, trackRecord: { isRecord: true } });
  assert.deepEqual(warm.sort(), ["first-lap", "streak-3", "streak-7"]);

  assert.deepEqual(newTrophies([{ id: "first-lap" }], ["first-lap", "podium", "podium"]), ["podium"]);
});

test("the weekly board starts on Monday 00:00 UTC", () => {
  const { weekStart } = require("../routes/leaderboard");
  assert.equal(weekStart(new Date("2026-10-10T15:00:00Z")).toISOString(), "2026-10-05T00:00:00.000Z");
  assert.equal(weekStart(new Date("2026-10-05T00:00:00Z")).toISOString(), "2026-10-05T00:00:00.000Z");
  assert.equal(weekStart(new Date("2026-10-11T23:59:59Z")).toISOString(), "2026-10-05T00:00:00.000Z");
});

test("one password policy for sign-up, reset and change", () => {
  const { passwordProblem } = require("../utils/userProfile");
  assert.equal(passwordProblem("Lap$Record9"), null);
  for (const weak of ["nouppercase1!", "NoDigits!!", "NoSymbol123", undefined, 12345678]) {
    assert.ok(passwordProblem(weak), String(weak));
  }
  assert.ok(passwordProblem("Aa1!"));
});

test("production refuses weak or missing settings, development does not", () => {
  const { checkEnv } = require("../config/env");
  const base = { JWT_SECRET: "x".repeat(40), MONGODB_URI: "mongodb://db/codecaret" };

  assert.deepEqual(checkEnv({ ...base, JWT_SECRET: "short" }).errors, []);
  assert.match(checkEnv({}).errors.join(" "), /JWT_SECRET is required.*MONGODB_URI is required/);

  const prod = { ...base, NODE_ENV: "production", CLIENT_URL: "https://codecaret.app", REDIS_URL: "redis://r", SMTP_HOST: "smtp" };
  assert.deepEqual(checkEnv(prod), { errors: [], warnings: [] });
  assert.match(checkEnv({ ...prod, JWT_SECRET: "short" }).errors[0], /at least 32/);
  assert.match(checkEnv({ ...prod, CLIENT_URL: undefined }).errors[0], /CLIENT_URL is required/);
  assert.match(checkEnv({ ...prod, CLIENT_URL: "codecaret.app" }).errors[0], /full http\(s\) origin/);
  assert.equal(checkEnv({ ...prod, REDIS_URL: undefined, SMTP_HOST: undefined }).warnings.length, 2);
});
