import { describe, expect, it } from "vitest";
import { PLATFORMS, cardFileName, shareCaption } from "./shareTargets";

const lap = (over = {}) => ({
  wpm: 87,
  accuracy: 98,
  date: new Date(2026, 9, 7, 18, 30),
  track: { title: "Binary search", language: "Python" },
  achievement: null,
  link: { href: "https://codecaret.app/test", label: "codecaret.app/test" },
  ...over,
});

describe("share card file", () => {
  it("is named after the pace and the local day", () => {
    expect(cardFileName(lap())).toBe("codecaret-87wpm-2026-10-07.png");
  });
});

describe("caption", () => {
  it("states the pace and the track", () => {
    expect(shareCaption(lap())).toContain("87 WPM at 98% accuracy on Binary search (Python)");
  });

  it("leads with the achievement when there is one", () => {
    expect(shareCaption(lap({ achievement: { kind: "record" } }))).toMatch(/^🏁 New track record/);
    expect(shareCaption(lap({ achievement: { kind: "pb", delta: 5, previous: 82 } }))).toContain("(+5 WPM)");
    expect(shareCaption(lap({ achievement: { kind: "podium", position: 2 } }))).toMatch(/^🏁 P2 on/);
  });

  it("does not name a custom paste as a track", () => {
    const text = shareCaption(lap({ track: { title: "Custom code", language: "JavaScript", custom: true } }));
    expect(text).toContain("my own JavaScript code");
  });
});

describe("platform links", () => {
  it("carry the caption, encoded, to every composer", () => {
    const caption = shareCaption(lap());
    for (const p of PLATFORMS.filter((x) => x.compose && x.id !== "facebook")) {
      const href = p.compose(caption, "https://codecaret.app/test");
      expect(href.startsWith("https://"), p.id).toBe(true);
      expect(decodeURIComponent(href), p.id).toContain("87 WPM");
      expect(href, p.id).not.toMatch(/\s/);
    }
  });

  it("covers the platforms the dialog promises", () => {
    expect(PLATFORMS.map((p) => p.id)).toEqual(["whatsapp", "x", "linkedin", "instagram", "facebook", "telegram"]);
  });
});
