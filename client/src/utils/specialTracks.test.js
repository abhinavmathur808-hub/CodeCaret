import { describe, expect, it } from "vitest";
import { challengeLink, dailyKey, dailyTrack, readSpecialTrack } from "./specialTracks";
import { CODE_LANGUAGES } from "./snippetPool";

const params = (q) => new URLSearchParams(q);

describe("track of the day", () => {
  it("is the same track for everyone on a given day", () => {
    expect(dailyTrack("2026-10-10").snippet.id).toBe(dailyTrack("2026-10-10").snippet.id);
  });

  it("is a medium code track on its own board", () => {
    const t = dailyTrack("2026-10-10");
    expect(CODE_LANGUAGES).toContain(t.snippet.language);
    expect(t.snippet.length).toBe("medium");
    expect(t.boardId).toBe("daily-2026-10-10");
  });

  it("changes from day to day across a month", () => {
    const ids = new Set();
    for (let d = 1; d <= 30; d++) ids.add(dailyTrack(`2026-11-${String(d).padStart(2, "0")}`).snippet.id);
    expect(ids.size).toBeGreaterThan(20);
  });

  it("keys on the UTC date", () => {
    expect(dailyKey(new Date("2026-10-10T23:59:59Z"))).toBe("2026-10-10");
  });
});

describe("reading a /test link", () => {
  it("opens a shared track with its target", () => {
    const t = readSpecialTrack(params("track=cpp-s-1&vs=87&by=abhinav"));
    expect(t).toMatchObject({ kind: "challenge", boardId: "cpp-s-1", vsWpm: 87, by: "abhinav" });
    expect(t.snippet.id).toBe("cpp-s-1");
  });

  it("opens today's track from the short form", () => {
    const t = readSpecialTrack(params("track=daily"));
    expect(t.kind).toBe("daily");
    expect(t.boardId).toBe(`daily-${dailyKey()}`);
  });

  it("ignores what it cannot trust", () => {
    expect(readSpecialTrack(params("track=nope"))).toBeNull();
    expect(readSpecialTrack(params("track=daily-2999-01-01"))).toBeNull();
    expect(readSpecialTrack(params("track=daily-2026-02-31"))).toBeNull();
    const t = readSpecialTrack(params("track=cpp-s-1&vs=9000&by=<script>"));
    expect(t.vsWpm).toBeUndefined();
    expect(t.by).toBeUndefined();
  });

  it("round-trips a challenge link", () => {
    const url = new URL(challengeLink("https://codecaret.app", "py-m-4", 91.6, "speedy_dev"));
    expect(url.pathname).toBe("/test");
    const t = readSpecialTrack(url.searchParams);
    if (t) expect(t).toMatchObject({ vsWpm: 92, by: "speedy_dev" });
    expect(url.searchParams.get("track")).toBe("py-m-4");
  });
});
