import { S_POLE, S_STOP } from "./trackLayout.js";

/* ══════════════════════════════════════════════════════════════
   lapStore — the one mutable object the page's frame loop writes
   and everything else reads: the 3D scene in useFrame, the HUD and
   the copy panels through refs.

   Deliberately not React state. It changes every frame, and a
   re-render per frame would cost more than the whole scene.
   ══════════════════════════════════════════════════════════════ */

export const LIGHT = {
  red: { id: "red", label: "On the grid", hex: "#ff2a1f" },
  green: { id: "green", label: "Green flag · racing", hex: "#1fe36a" },
  amber: { id: "amber", label: "Yellow flag · paused", hex: "#ffb400" },
};

export const lap = {
  /** 0 → 1, straight from the scrollbar. */
  target: 0,
  /** `target` through a critically damped spring — what everything draws. */
  progress: 0,
  /** d(progress)/dt, per second. */
  velocity: 0,
  /** Metres along the centreline, and signed speed in m/s. */
  s: S_POLE,
  speed: 0,
  /** Longitudinal acceleration, m/s², smoothed. */
  accel: 0,
  /** "red" | "green" | "amber" — see LIGHT. */
  light: "red",
  /** Seconds since the page loop started, and the last frame's dt. */
  time: 0,
  dt: 0,
  /** Running lap clock: counts while the car is moving. */
  lapTime: 0,
  reduced: false,
  /** 0 → 1 once the car has crossed the finish line going forward. */
  finishedAt: -1,
  /** "tour" while "Watch the full lap" is driving the page, else null. */
  autopilot: null,
};

export const SPAN = S_STOP - S_POLE;

/**
 * One step of a critically damped spring (implicit Euler, so it is
 * stable at any frame time). A first-order "lerp toward the target"
 * jumps the car's VELOCITY on every mouse-wheel notch; a spring only
 * ever changes it continuously, which is what makes notchy wheels
 * read as one smooth drive.
 */
export function springStep(x, v, target, omega, dt) {
  const f = 1 + 2 * dt * omega;
  const oo = omega * omega;
  const hoo = dt * oo;
  const hhoo = dt * hoo;
  const detInv = 1 / (f + hhoo);
  return [(f * x + dt * v + hhoo * target) * detInv, (v + hoo * (target - x)) * detInv];
}

/**
 * One frame of the car following the scrollbar, in metres and m/s.
 *
 * The spring says how the car would LIKE to move; the car's limits
 * say what it can: a top speed, a throttle that tails off as it nears
 * it, and brakes that always leave room to stop at the target. A hard
 * flick of the wheel or a scrollbar dragged to the bottom used to whip
 * the car round at a thousand metres a second; now it is driven there
 * flat out. Small scrolls never meet the limits and move exactly as
 * the spring alone would (position follows the new velocity, as in the
 * spring's own implicit step).
 */
export function driveStep(s, v, target, omega, dt, { vMax, throttle, brake }) {
  const [, spring] = springStep(s, v, target, omega, dt);
  const gap = target - s;
  /* The fastest it can go and still stop in the gap — with a margin
     under full braking, so it never overshoots and has to back up. */
  const stopping = Math.sqrt(1.6 * brake * Math.abs(gap));
  let want = Math.max(-vMax, Math.min(vMax, spring));
  if (want * gap > 0) want = Math.sign(want) * Math.min(Math.abs(want), stopping);
  const push = throttle * (1 - 0.75 * Math.min(1, (v / vMax) ** 2)) * dt;
  const stop = brake * dt;
  const hi = v < 0 ? v + stop : v + push;
  const lo = v > 0 ? v - stop : v - push;
  const next = Math.max(lo, Math.min(hi, want));
  return [s + next * dt, next];
}
