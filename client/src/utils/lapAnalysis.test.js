import { describe, expect, it } from "vitest";
import {
  charDurations,
  foldLap,
  keyOf,
  lapHeat,
  lapSymbols,
  symbolProfile,
} from "./lapAnalysis";
import { drillScore, pickDrillSnippet } from "./symbolDrill";

/* A lap typed at an even 100 ms a key, with chosen keys held up. */
function lap(text, slow = {}, step = 100) {
  const times = [];
  let t = 0;
  Array.from(text).forEach((ch, i) => {
    if (i > 0) t += slow[ch] ?? step;
    times.push(t);
  });
  return times;
}

describe("timings", () => {
  it("measures each key from the one before it", () => {
    expect(charDurations([0, 120, 250, 250, 400])).toEqual([null, 120, 130, null, 150]);
  });

  it("groups letters and digits but keeps symbols apart", () => {
    expect([keyOf("q"), keyOf("Q"), keyOf("7"), keyOf("{"), keyOf(" "), keyOf("\n")]).toEqual([
      "lower",
      "upper",
      "digit",
      "{",
      null,
      null,
    ]);
  });
});

describe("symbol fluency for a lap", () => {
  const text = "if (a) { b; } if (c) { d; } if (e) { f; }";

  it("names the symbols slower than your letters, slowest first", () => {
    const report = lapSymbols(text, lap(text, { "{": 400, ";": 250 }));
    expect(report.baselineMs).toBe(100);
    expect(report.slow.map((r) => r.key)).toEqual(["{", ";"]);
    expect(report.slow[0].ratio).toBeCloseTo(4);
  });

  it("calls nothing out on an even lap", () => {
    expect(lapSymbols(text, lap(text)).slow).toEqual([]);
  });

  it("counts mistakes on symbols", () => {
    const misses = Array.from(text).map((ch) => (ch === ";" ? 1 : 0));
    const report = lapSymbols(text, lap(text), misses);
    expect(report.missed[0]).toMatchObject({ key: ";", misses: 3 });
  });

  it("reads only the part of a lap that was typed", () => {
    const times = lap(text).slice(0, 10);
    expect(() => lapSymbols(text, times)).not.toThrow();
    expect(lapHeat(text, times).filter((c) => c.typed)).toHaveLength(10);
  });
});

describe("lap heat", () => {
  it("runs from quick to slow against your usual key", () => {
    const text = "abcdefgh{";
    const heat = lapHeat(text, lap(text, { "{": 500 }));
    expect(heat[0].level).toBeNull();
    expect(heat[3].level).toBe(1);
    expect(heat[8].level).toBe(4);
  });
});

describe("symbol fluency across laps", () => {
  it("adds laps up and ranks symbols against letters", () => {
    const text = "x = (a + b) * (c + d); y = (e + f);";
    let stats = null;
    for (let i = 0; i < 3; i++) stats = foldLap(stats, text, lap(text, { "(": 300, ")": 120 }));
    const profile = symbolProfile(stats);
    expect(profile.laps).toBe(3);
    expect(profile.rows[0].key).toBe("(");
    expect(profile.rows[0].ratio).toBeCloseTo(3);
  });

  it("caps a long pause so one hesitation cannot decide it", () => {
    const text = "abc;abc;abc;";
    const stats = foldLap(null, text, lap(text, { ";": 60000 }));
    expect(stats.keys[";"].ms / stats.keys[";"].n).toBeLessThanOrEqual(2000);
  });
});

describe("drills", () => {
  it("scores code by how much of it is the wanted symbols", () => {
    expect(drillScore("{ } ab", ["{", "}"])).toBeCloseTo(0.5);
  });

  it("picks a track in your setup that has the symbols", () => {
    const s = pickDrillSnippet(["Python"], "short", ["(", ")"]);
    expect(s.language).toBe("Python");
    expect(drillScore(s.code, ["(", ")"])).toBeGreaterThan(0);
  });
});

describe("thin laps", () => {
  it("calls out a lone symbol only when it is plainly slow", () => {
    const text = "abcdefgh(ijklmnop;qrst";
    expect(lapSymbols(text, lap(text, { "(": 180 })).slow).toEqual([]);
    expect(lapSymbols(text, lap(text, { "(": 400 })).slow.map((r) => r.key)).toEqual(["("]);
  });

  it("says when there was too little to judge", () => {
    expect(lapSymbols("abc(def)", lap("abc(def)")).thin).toBe(true);
  });
});
