import { describe, expect, it } from "vitest";
import {
  CATALOGUE,
  CODE_LANGUAGES,
  WARMUP_LANGUAGE,
  exclusiveLanguages,
  formatRaceTime,
  pickSnippet,
  poolFor,
  topicLabelOf,
} from "./snippetPool";

/* The server's own shape check for a catalogue id (CATALOG_ID in
   server/routes/races.js) — an id it refuses can never hold a record. */
const SERVER_ID = /^[a-z0-9][a-z0-9-]{0,39}$/i;

describe("catalogue", () => {
  it("gives every track a unique id the server will accept", () => {
    const ids = CATALOGUE.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(SERVER_ID);
  });

  it("files every track under a known language and length", () => {
    for (const s of CATALOGUE) {
      expect([...CODE_LANGUAGES, WARMUP_LANGUAGE]).toContain(s.language);
      expect(["short", "medium", "long"]).toContain(s.length);
      expect(s.code.trim().length).toBeGreaterThan(0);
    }
  });

  it("only asks for characters a keyboard can type in the warm-up", () => {
    for (const s of CATALOGUE.filter((x) => x.language === WARMUP_LANGUAGE)) {
      expect(s.code, s.id).toMatch(/^[\x20-\x7e]+$/);
      expect(s.code, s.id).not.toMatch(/ {2}/);
    }
  });
});

describe("poolFor", () => {
  it("never draws a language that was not picked", () => {
    for (const lang of CODE_LANGUAGES) {
      const pool = poolFor([lang], "medium");
      expect(pool.length).toBeGreaterThan(0);
      expect(pool.every((s) => s.language === lang)).toBe(true);
    }
  });

  it("keeps English out of a code pool", () => {
    const pool = poolFor(CODE_LANGUAGES, "short", "any", "any");
    expect(pool.some((s) => s.language === WARMUP_LANGUAGE)).toBe(false);
  });

  it("ignores the code-only filters for the warm-up", () => {
    const plain = poolFor([WARMUP_LANGUAGE], "short");
    const filtered = poolFor([WARMUP_LANGUAGE], "short", "heavy", "graphs");
    expect(filtered).toEqual(plain);
    expect(plain.every((s) => s.language === WARMUP_LANGUAGE && s.length === "short")).toBe(true);
  });

  it("yields length before topic when both cannot hold", () => {
    /* Every topic that exists for C++ must survive any length choice:
       the picker relaxes length first. */
    const topics = new Set(poolFor(["C++"], "short").concat(poolFor(["C++"], "long")).map((s) => s.topic));
    for (const topic of topics) {
      for (const length of ["short", "medium", "long"]) {
        const pool = poolFor(["C++"], length, "any", topic);
        expect(pool.every((s) => s.topic === topic), `${topic}/${length}`).toBe(true);
      }
    }
  });
});

describe("pickSnippet", () => {
  it("does not hand back the track just raced while others remain", () => {
    const pool = poolFor(["Python"], "short");
    const current = pool[0].id;
    for (let i = 0; i < 60; i++) {
      expect(pickSnippet(["Python"], "short", "any", "any", current).id).not.toBe(current);
    }
  });

  it("returns null when nothing matches at all", () => {
    expect(pickSnippet(["Klingon"], "short")).toBeNull();
  });
});

describe("helpers", () => {
  it("drops English from a list that mixes it with code", () => {
    expect(exclusiveLanguages(["English", "C++"])).toEqual(["C++"]);
    expect(exclusiveLanguages(["English"])).toEqual(["English"]);
    expect(exclusiveLanguages(["C++", "Python"])).toEqual(["C++", "Python"]);
  });

  it("formats race time as M:SS.mmm", () => {
    expect(formatRaceTime(2405)).toBe("0:02.405");
    expect(formatRaceTime(61840)).toBe("1:01.840");
    expect(formatRaceTime(0)).toBe("0:00.000");
  });

  it("labels every warm-up passage as one", () => {
    expect(topicLabelOf({ language: WARMUP_LANGUAGE, topic: "warm-up" })).toBe("Warm-up");
    expect(topicLabelOf({ language: "C++", topic: "dp" })).toBe("DP");
    expect(topicLabelOf({ language: "C++", topic: "nope" })).toBeNull();
  });
});
