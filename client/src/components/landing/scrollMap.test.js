import { describe, expect, it } from "vitest";
import { SCREENS, progressOfS, sOfProgress } from "./scrollMap";
import { S_POLE, S_STOP } from "./trackLayout";

describe("scroll map", () => {
  it("runs from the pole to the stop", () => {
    expect(sOfProgress(0)).toBeCloseTo(S_POLE, 6);
    expect(sOfProgress(1)).toBeCloseTo(S_STOP, 6);
  });

  it("never moves the car backwards as the page scrolls down", () => {
    let last = -Infinity;
    for (let i = 0; i <= 1000; i++) {
      const s = sOfProgress(i / 1000);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
  });

  it("maps a position back to the scroll it came from", () => {
    for (const p of [0, 0.1, 0.33, 0.5, 0.77, 1]) {
      expect(progressOfS(sOfProgress(p))).toBeCloseTo(p, 4);
    }
  });

  it("clamps out-of-range input", () => {
    expect(sOfProgress(-1)).toBeCloseTo(S_POLE, 6);
    expect(sOfProgress(2)).toBeCloseTo(S_STOP, 6);
  });

  it("makes the page more than one screen tall", () => {
    expect(SCREENS).toBeGreaterThan(1);
  });
});
