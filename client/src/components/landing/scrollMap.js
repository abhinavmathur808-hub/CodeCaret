import { S_POLE, S_STOP, smoothstep } from "./trackLayout.js";
import { PANEL_FADE, QUOTES, SECTIONS } from "./content.js";

/* ══════════════════════════════════════════════════════════════
   scrollMap — how far round the lap a scroll position is.

   Not a straight line. While a copy panel is up, each metre of track
   costs DWELL times the scrolling it costs between panels: a nudge of
   the wheel creeps the car on a car length or two and the text holds
   still to be read, while the short runs from one stop to the next
   still go by at a decent clip.

   A quote between two stops gets QUOTE_SCREENS of scrolling however
   short its gap is: the car creeps through and the line holds.

   The page's height follows from the same table (SCREENS), so the
   reading pace is a fixed number of metres per screen whatever the
   lap's layout.
   ══════════════════════════════════════════════════════════════ */

const DWELL = 3;
/* Metres of track per screen of scrolling while a panel is up: about
   9 m per wheel notch on a desktop screen, under two car lengths. */
const READ_METRES_PER_SCREEN = 84;
const STEP = 0.5;
const QUOTE_SCREENS = 0.7;
const COST_PER_SCREEN = DWELL * READ_METRES_PER_SCREEN;

/** 1 while a panel is fully up, easing to 0 across its fades. */
function reading(s) {
  let w = 0;
  for (const sec of SECTIONS) {
    if (sec.finale) continue;
    const [a, b] = sec.at;
    const fadeIn = sec.hero ? 1 : smoothstep(a, a + PANEL_FADE, s);
    const fadeOut = 1 - smoothstep(b - PANEL_FADE, b, s);
    w = Math.max(w, fadeIn * fadeOut);
  }
  return w;
}

/** Scroll cost per metre inside a quote's stretch, else 0. */
function quoting(s) {
  for (const q of QUOTES) {
    const [a, b] = q.at;
    if (s >= a && s <= b) return (QUOTE_SCREENS * COST_PER_SCREEN) / (b - a);
  }
  return 0;
}

/* Cumulative scroll cost at S_POLE + i·STEP. */
const N = Math.round((S_STOP - S_POLE) / STEP) + 1;
const COST = new Float64Array(N);
for (let i = 1; i < N; i++) {
  const mid = S_POLE + (i - 0.5) * STEP;
  COST[i] = COST[i - 1] + STEP * Math.max(1 + (DWELL - 1) * reading(mid), quoting(mid));
}
const TOTAL = COST[N - 1];

/** Page height in screens: one to stand on, plus all the scrolling. */
export const SCREENS = 1 + TOTAL / COST_PER_SCREEN;

/** Scroll fraction (0–1) → metres along the lap. */
export function sOfProgress(p) {
  const c = Math.min(1, Math.max(0, p)) * TOTAL;
  let lo = 0;
  let hi = N - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (COST[mid] <= c) lo = mid;
    else hi = mid;
  }
  const span = COST[hi] - COST[lo];
  return S_POLE + (lo + (span > 0 ? (c - COST[lo]) / span : 0)) * STEP;
}

/** Metres along the lap → scroll fraction (0–1). */
export function progressOfS(s) {
  const x = (Math.min(S_STOP, Math.max(S_POLE, s)) - S_POLE) / STEP;
  const i = Math.min(N - 2, Math.floor(x));
  return (COST[i] + (COST[i + 1] - COST[i]) * (x - i)) / TOTAL;
}
