import { smoothstep } from "./trackLayout.js";

/* ══════════════════════════════════════════════════════════════
   choreography — scripted moments along the lap that the 3D scene
   and the HTML HUD both have to agree on.
   ══════════════════════════════════════════════════════════════ */

/* The ghost lap runs through the long sweeper. It holds a couple of
   car lengths ahead for most of it, then the car reels it in on the
   exit and edges past — "beat the ghost" — with the ghost dropping
   back out of shot to the right as the stretch ends. */
export const GHOST = { from: 752, to: 1004, ahead: 9, behind: -4.5, passFrom: 900, passTo: 962 };

/* It rides this far right of its own racing line (clamped to the
   asphalt), so the two cars never share the same space. */
export const GHOST_SIDE = 2.6;
export const GHOST_LIMIT = 4.6;

/** Ghost visibility (0–1) for the car at distance s. */
export const ghostVisibility = (s) =>
  smoothstep(GHOST.from, GHOST.from + 26, s) * (1 - smoothstep(GHOST.to - 26, GHOST.to, s));

/** Where the ghost is, in metres ahead (+) or behind (−) the car. */
export const ghostLead = (s) =>
  GHOST.ahead + (GHOST.behind - GHOST.ahead) * smoothstep(GHOST.passFrom, GHOST.passTo, s);

/** The ghost's lateral offset from its line point, given that point's
    own lateral offset from the centreline. */
export const ghostOffset = (lineLat) =>
  Math.min(GHOST_LIMIT, Math.max(-GHOST_LIMIT, lineLat + GHOST_SIDE)) - lineLat;
