/* ══════════════════════════════════════════════════════════════
   trackLayout — the home page's lap, as plain numbers.

   The circuit is integrated from a curvature profile rather than
   drawn through control points. Every corner is a raised-cosine
   bump of curvature whose area is exactly the corner's turning
   angle, which buys three things:

     • each corner turns by precisely the angle written below, so
       the layout is authored in "90° right, 65° left" terms;
     • curvature rises and falls smoothly (a clothoid-like entry),
       so the car's heading, the banking and the camera are all
       continuous through the second derivative — nothing snaps on
       corner entry, however hard the page is scrolled;
     • a corner's tightest radius is h / angle, which keeps the
       swept kerbs and walls from folding over on the inside. Every
       radius here is ≥ 25 m against a 12.6 m half-span.

   Everything is sampled once, every DS metres, into flat typed
   arrays. A per-frame lookup is one lerp between two samples — no
   allocation and no arc-length search.

   Conventions: Y is up. Heading 0 runs along +X and positive
   curvature turns RIGHT (towards +Z). Lateral offsets are positive
   to the driver's right.
   ══════════════════════════════════════════════════════════════ */

export const DS = 0.5;
export const TRACK_LENGTH = 2160;
export const N = Math.round(TRACK_LENGTH / DS) + 1;

/* Cross-section, in metres from the centreline. */
export const HALF_WIDTH = 6; // asphalt
export const KERB_OUT = 7.3; // outer edge of a kerb
export const VERGE = 12; // track face of the walls
export const WALL_H = 1.05;
export const SLAB_EDGE = 12.7; // outside edge of the deck
export const SLAB_DEPTH = 1.6;
export const FLOOR_Y = -46; // the city floor the deck floats over

/* Key distances along the centreline. */
export const S_POLE = 70; // where the car sits at progress 0
export const S_START = 80; // start line; the lights gantry stands on it
export const S1_END = 724;
export const S2_END = 1452;
export const S_FINISH = 2080;
export const S_STOP = 2124; // where the car rests at progress 1

/* { c: apex distance, h: half-length of the turn, deg: + right / − left } */
const CORNERS = [
  { c: 300, h: 40, deg: 90 }, // T1
  { c: 420, h: 38, deg: -65 }, // T2
  { c: 520, h: 38, deg: -45 }, // T3 — the esses
  { c: 600, h: 40, deg: 55 }, // T4
  { c: 680, h: 36, deg: -40 }, // T5
  { c: 870, h: 105, deg: -115 }, // T6 — long sweeper over the crest
  { c: 1110, h: 78, deg: 170 }, // T7 — hairpin at the bottom of the drop
  { c: 1530, h: 80, deg: 105 }, // T8 — the banked turn
  { c: 1660, h: 28, deg: -40 }, // T9 — chicane
  { c: 1720, h: 28, deg: 45 }, // T10
  { c: 1830, h: 60, deg: 20 }, // T11 — kink onto the finish straight
];

/* Elevation keys [s, y]. Smootherstep between neighbours, so the
   road is level at each key and the steepest grade sits mid-way. */
const ELEVATION = [
  [0, 0],
  [330, 0],
  [470, 5],
  [700, 14],
  [790, 16],
  [1040, 0],
  [1200, 0],
  [1450, 7],
  [1600, 6],
  [1780, 0],
  [TRACK_LENGTH, 0],
];

/* Every corner leans into itself a little; T8 is properly banked. */
const BANK_GAIN = 1.4; // radians of bank per unit curvature
const BANK_MAX = 0.1;
const BANKED = [{ c: 1530, h: 115, deg: 15 }];

/* Racing line: how far the car swings from the centreline. */
const LINE_SWING = 4.2;
const POLE_LATERAL = -3; // the pole slot is on the left of the grid

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const smootherstep = (t) => {
  t = clamp(t, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
/* Raised cosine: 1 at c, 0 beyond ±h. */
const bell = (s, c, h) => (Math.abs(s - c) >= h ? 0 : 0.5 * (1 + Math.cos((Math.PI * (s - c)) / h)));

function elevationAt(s) {
  for (let k = 1; k < ELEVATION.length; k++) {
    const [s1, y1] = ELEVATION[k];
    if (s <= s1) {
      const [s0, y0] = ELEVATION[k - 1];
      return y0 + (y1 - y0) * smootherstep((s - s0) / (s1 - s0));
    }
  }
  return ELEVATION[ELEVATION.length - 1][1];
}

/* ── Centreline ──────────────────────────────────────────────── */
export const KAPPA = new Float32Array(N); // signed curvature, 1/m
export const BANK = new Float32Array(N); // radians, + leans right
export const P = new Float32Array(N * 3); // position
export const T = new Float32Array(N * 3); // forward (follows the grade)
export const U = new Float32Array(N * 3); // surface normal (with bank)
export const R = new Float32Array(N * 3); // driver's right

/* ── Racing line — the path the car actually drives ─────────── */
export const LAT = new Float32Array(N); // lateral offset from centre
export const LP = new Float32Array(N * 3);
export const LT = new Float32Array(N * 3);
export const LU = new Float32Array(N * 3);
export const LR = new Float32Array(N * 3);
export const LK = new Float32Array(N); // signed curvature of the line

function norm3(a, i) {
  const x = a[i], y = a[i + 1], z = a[i + 2];
  const l = Math.hypot(x, y, z) || 1;
  a[i] = x / l;
  a[i + 1] = y / l;
  a[i + 2] = z / l;
}

/* out = a × b, written into `o` at offset `k`. */
function cross(ax, ay, az, bx, by, bz, o, k) {
  o[k] = ay * bz - az * by;
  o[k + 1] = az * bx - ax * bz;
  o[k + 2] = ax * by - ay * bx;
}

(function build() {
  /* Curvature, then heading and plan position by trapezoid. */
  for (let i = 0; i < N; i++) {
    const s = i * DS;
    let k = 0;
    for (const c of CORNERS) {
      if (Math.abs(s - c.c) < c.h) k += ((c.deg * Math.PI) / 180) * (bell(s, c.c, c.h) / c.h);
    }
    KAPPA[i] = k;
  }

  let heading = 0, x = 0, z = 0;
  const Y = new Float32Array(N);
  for (let i = 0; i < N; i++) Y[i] = elevationAt(i * DS);

  for (let i = 0; i < N; i++) {
    if (i > 0) {
      const prev = heading;
      heading += 0.5 * (KAPPA[i - 1] + KAPPA[i]) * DS;
      const mid = 0.5 * (prev + heading);
      x += Math.cos(mid) * DS;
      z += Math.sin(mid) * DS;
    }
    const j = i * 3;
    P[j] = x;
    P[j + 1] = Y[i];
    P[j + 2] = z;

    /* Grade from the elevation curve; s is treated as plan
       distance (grades stay under 12%, so the error is < 1%). */
    const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1);
    const slope = (Y[b] - Y[a]) / ((b - a) * DS);
    T[j] = Math.cos(heading);
    T[j + 1] = slope;
    T[j + 2] = Math.sin(heading);
    norm3(T, j);

    /* Bank: lean into the corner, plus the banked turn's camber. */
    let bank = clamp(KAPPA[i] * BANK_GAIN, -BANK_MAX, BANK_MAX);
    for (const bk of BANKED) bank += ((bk.deg * Math.PI) / 180) * bell(i * DS, bk.c, bk.h);
    BANK[i] = bank;

    /* Level up-vector perpendicular to the grade, then rolled. */
    const tx = T[j], ty = T[j + 1], tz = T[j + 2];
    let ux = -tx * ty, uy = 1 - ty * ty, uz = -tz * ty;
    const ul = Math.hypot(ux, uy, uz);
    ux /= ul; uy /= ul; uz /= ul;
    const r0 = [0, 0, 0];
    cross(tx, ty, tz, ux, uy, uz, r0, 0);
    const cb = Math.cos(bank), sb = Math.sin(bank);
    U[j] = ux * cb + r0[0] * sb;
    U[j + 1] = uy * cb + r0[1] * sb;
    U[j + 2] = uz * cb + r0[2] * sb;
    norm3(U, j);
    cross(tx, ty, tz, U[j], U[j + 1], U[j + 2], R, j);
    norm3(R, j);
  }

  /* Racing line: wide on entry, clip the apex, wide on exit. */
  const raw = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const s = i * DS;
    let l = 0;
    for (const c of CORNERS) {
      const side = Math.sign(c.deg);
      const reach = c.h + 70;
      if (Math.abs(s - c.c) > reach) continue;
      l += side * LINE_SWING * (bell(s, c.c, c.h * 0.9) - 0.85 * (bell(s, c.c - c.h - 18, 40) + bell(s, c.c + c.h + 18, 40)));
    }
    raw[i] = clamp(l, -LINE_SWING, LINE_SWING);
  }
  /* Two box passes ≈ a triangle filter: smooths the clamp's kinks
     and the overlap where back-to-back corners meet. */
  const box = (src, half) => {
    const out = new Float32Array(N);
    let acc = 0, count = 0;
    for (let i = -half; i < N + half; i++) {
      const add = i + half, drop = i - half - 1;
      if (add >= 0 && add < N) { acc += src[add]; count++; }
      if (drop >= 0 && drop < N) { acc -= src[drop]; count--; }
      if (i >= 0 && i < N) out[i] = acc / count;
    }
    return out;
  };
  const smooth = box(box(raw, 24), 24);
  for (let i = 0; i < N; i++) {
    const s = i * DS;
    const fromGrid = smoothstep(S_POLE + 10, S_POLE + 170, s);
    LAT[i] = POLE_LATERAL + (smooth[i] - POLE_LATERAL) * fromGrid;
  }

  for (let i = 0; i < N; i++) {
    const j = i * 3;
    LP[j] = P[j] + R[j] * LAT[i];
    LP[j + 1] = P[j + 1] + R[j + 1] * LAT[i];
    LP[j + 2] = P[j + 2] + R[j + 2] * LAT[i];
  }
  for (let i = 0; i < N; i++) {
    const j = i * 3;
    const a = Math.max(0, i - 1) * 3, b = Math.min(N - 1, i + 1) * 3;
    LT[j] = LP[b] - LP[a];
    LT[j + 1] = LP[b + 1] - LP[a + 1];
    LT[j + 2] = LP[b + 2] - LP[a + 2];
    norm3(LT, j);
    /* Keep the track's surface normal, squared up to the line. */
    const d = LT[j] * U[j] + LT[j + 1] * U[j + 1] + LT[j + 2] * U[j + 2];
    LU[j] = U[j] - LT[j] * d;
    LU[j + 1] = U[j + 1] - LT[j + 1] * d;
    LU[j + 2] = U[j + 2] - LT[j + 2] * d;
    norm3(LU, j);
    cross(LT[j], LT[j + 1], LT[j + 2], LU[j], LU[j + 1], LU[j + 2], LR, j);
    norm3(LR, j);
  }
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - 2) * 3, b = Math.min(N - 1, i + 2) * 3, j = i * 3;
    const c = [0, 0, 0];
    cross(LT[a], LT[a + 1], LT[a + 2], LT[b], LT[b + 1], LT[b + 2], c, 0);
    const span = ((b - a) / 3) * DS;
    /* Right turns rotate forward towards +R, so a × b points down. */
    LK[i] = -(c[0] * LU[j] + c[1] * LU[j + 1] + c[2] * LU[j + 2]) / span;
  }
})();

/* ── Lookups ─────────────────────────────────────────────────── */

function locate(s) {
  const f = clamp(s, 0, TRACK_LENGTH) / DS;
  const i = Math.min(N - 2, Math.floor(f));
  return [i, f - i];
}

function lerp3(a, i, t, out) {
  const j = i * 3, k = j + 3;
  out.set(a[j] + (a[k] - a[j]) * t, a[j + 1] + (a[k + 1] - a[j + 1]) * t, a[j + 2] + (a[k + 2] - a[j + 2]) * t);
  return out;
}

const lerp1 = (a, i, t) => a[i] + (a[i + 1] - a[i]) * t;

/**
 * Centreline frame at distance s. `out` holds THREE.Vector3s (or
 * anything with set/normalize): pos, fwd, up, right.
 */
export function sampleTrack(s, out) {
  const [i, t] = locate(s);
  lerp3(P, i, t, out.pos);
  lerp3(T, i, t, out.fwd).normalize();
  lerp3(U, i, t, out.up).normalize();
  lerp3(R, i, t, out.right).normalize();
  if (out.kappa !== undefined) out.kappa = lerp1(KAPPA, i, t);
  if (out.bank !== undefined) out.bank = lerp1(BANK, i, t);
  return out;
}

/** The racing line's frame at distance s — where the car is. */
export function sampleLine(s, out) {
  const [i, t] = locate(s);
  lerp3(LP, i, t, out.pos);
  lerp3(LT, i, t, out.fwd).normalize();
  lerp3(LU, i, t, out.up).normalize();
  lerp3(LR, i, t, out.right).normalize();
  if (out.kappa !== undefined) out.kappa = lerp1(LK, i, t);
  if (out.lateral !== undefined) out.lateral = lerp1(LAT, i, t);
  return out;
}

export const kappaAt = (s) => {
  const [i, t] = locate(s);
  return lerp1(KAPPA, i, t);
};

/* Scroll progress ↔ distance lives in scrollMap.js: it is not a
   straight line, and depends on where the copy panels are. */

/** Stretches where a corner is tight enough to earn kerbs. */
export const KERB_RANGES = (() => {
  const out = [];
  let from = -1;
  for (let i = 0; i < N; i++) {
    const on = Math.abs(KAPPA[i]) > 0.011;
    if (on && from < 0) from = i;
    if ((!on || i === N - 1) && from >= 0) {
      out.push({ from: Math.max(0, from * DS - 8), to: Math.min(TRACK_LENGTH, i * DS + 8), side: Math.sign(KAPPA[Math.round((from + i) / 2)]) });
      from = -1;
    }
  }
  return out;
})();

/** Plan-view polyline for the HUD minimap (x, z pairs). */
export function planPolyline(step = 8) {
  const pts = [];
  for (let s = 0; s <= TRACK_LENGTH; s += step) {
    const i = Math.round(s / DS) * 3;
    pts.push(P[i], P[i + 2]);
  }
  return pts;
}

/** Plan position of distance s (x, z) without allocating. */
export function planAt(s, out) {
  const [i, t] = locate(s);
  const j = i * 3, k = j + 3;
  out[0] = P[j] + (P[k] - P[j]) * t;
  out[1] = P[j + 2] + (P[k + 2] - P[j + 2]) * t;
  return out;
}
