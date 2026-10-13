import * as THREE from "three";
import { lap, LIGHT } from "./lapStore.js";
import { ghostLead, ghostOffset, ghostVisibility } from "./choreography.js";
import { sampleLine, sampleTrack, smoothstep } from "./trackLayout.js";

/* ══════════════════════════════════════════════════════════════
   rig — everything that is POSED each frame from `lap`, computed
   once by <Driver> before any other useFrame runs:

     rig.car     where the car is, with pitch/roll/steer/wheel spin
     rig.ghost   the ghost lap's car, and how visible it is
     rig.cam     camera position, target, fov and roll
     rig.lamp    the start-light colour, eased between states

   Components then just read it. Nothing in here allocates.
   ══════════════════════════════════════════════════════════════ */

const v3 = () => new THREE.Vector3();
const frame = () => ({ pos: v3(), fwd: v3(), up: v3(), right: v3(), kappa: 0, lateral: 0 });

export const rig = {
  car: {
    ...frame(),
    matrix: new THREE.Matrix4(),
    inverse: new THREE.Matrix4(),
    pitch: 0,
    roll: 0,
    heave: 0,
    steer: 0,
    spin: 0,
  },
  ghost: { ...frame(), matrix: new THREE.Matrix4(), visible: 0 },
  cam: { pos: v3(), target: v3(), up: v3().set(0, 1, 0), fov: 40, roll: 0 },
  lamp: new THREE.Color(LIGHT.red.hex),
  /** |speed| mapped to 0–1 for effects: 0 parked, 1 at ~330 km/h. */
  speed01: 0,
  /** Viewport width ÷ height, set by the camera rig each frame. */
  aspect: 16 / 9,
  /** 1 on a landscape screen, easing to 0 on a portrait phone. The
      shots are composed for landscape; on a phone the copy sits in
      the lower half instead of down one side. */
  wide: 1,
  /** Fraction of the frame to lift the picture by (portrait only). */
  lift: 0,
  /** True for the warm-up frames: everything that hides itself shows,
      so its shader is compiled behind the loader rather than mid-lap. */
  warm: false,
};

/* Camera script, keyed by the car's distance along the lap.
   [ s, back, height, side, ahead, lookUp, lookSide, fov ]
     back      metres behind the car along its line (− = in front)
     height    metres above the road, world-up
     side      metres right of the line at the camera (− = left)
     ahead     look-at point, metres ahead of the car along its line
     lookUp    …and that far above the car's road surface
     lookSide  …and that far right of its line
   Between keys every value eases with smoothstep, so the camera
   holds through a set piece and glides between them.

   The camera sits on the SAME side as that stretch's copy panel:
   the car then lands just off-centre away from the text, and the
   set piece (flying on the far side) beyond it. Facing the car
   (back < 0) mirrors left and right, so there it sits opposite. */
const SHOTS = [
  [70, 7.4, 1.35, -3.4, 11, 2.3, 1.6, 38], // grid: low rear three-quarter, lights in shot
  [98, 8.0, 2.2, -2.4, 12, 1.4, 0.4, 46],
  [150, 9.5, 3.0, 0.0, 15, 0.9, 0.0, 54], // chase
  [232, 10, 3.6, 2.4, 10, 1.0, 0.0, 56], // the code — copy right
  [440, 10, 3.6, 2.4, 10, 1.0, 0.0, 56],
  [478, 9.5, 3.4, -2.4, 11, 1.1, 0.0, 57], // telemetry — copy left
  [722, 9.5, 3.4, -2.4, 11, 1.1, 0.0, 57],
  [768, 9.5, 4.2, -3.2, 13, 0.9, 1.0, 54], // ghost — high, from behind-left: both cars clear of the copy
  [996, 9.5, 4.2, -3.2, 13, 0.9, 1.0, 54],
  [1036, 10, 4.4, 2.6, 10, 1.0, 0.0, 56], // podium — copy right
  [1204, 10, 4.4, 2.6, 10, 1.0, 0.0, 56],
  [1232, 7.5, 1.5, -2.0, 18, 1.2, 0.0, 62], // DRS straight — low and fast
  [1448, 7.5, 1.5, -2.0, 18, 1.2, 0.0, 62],
  [1472, 10, 4.5, 2.8, 10, 1.3, 0.0, 56], // the banked turn — copy right
  [1626, 10, 4.5, 2.8, 10, 1.3, 0.0, 56],
  [1640, 1.0, 2.6, 8.0, 3, 1.0, 0.0, 50], // swing round the right…
  [1656, -11, 2.2, 4.5, -3, 0.9, 2.6, 46], // …and face the car coming out of the scanner
  [1796, -11, 2.2, 4.5, -3, 0.9, 2.6, 46],
  [1812, 1.0, 2.6, 8.0, 3, 1.0, 0.0, 50], // back round the same side
  [1830, 9.0, 2.8, 0.0, 15, 0.9, 0.0, 58],
  [1990, 9.0, 2.8, 0.0, 15, 0.9, 0.0, 58],
  [2018, 1.0, 3.0, 9.0, 3, 1.0, 0.0, 52], // round the right, out ahead of the car…
  [2046, -16, 3.0, 0.0, -6, 5.5, 0.0, 50], // …to watch it take the flag
  [2124, -22, 7.5, 0.0, -10, 6.4, 0.0, 48], // and crane up as it rolls to a stop
];

const shot = { back: 0, height: 0, side: 0, ahead: 0, lookUp: 0, lookSide: 0, fov: 40 };
function shotAt(s) {
  let k = 0;
  while (k < SHOTS.length - 2 && s >= SHOTS[k + 1][0]) k++;
  const a = SHOTS[k], b = SHOTS[k + 1];
  const t = smoothstep(a[0], b[0], s);
  shot.back = a[1] + (b[1] - a[1]) * t;
  shot.height = a[2] + (b[2] - a[2]) * t;
  shot.side = a[3] + (b[3] - a[3]) * t;
  shot.ahead = a[4] + (b[4] - a[4]) * t;
  shot.lookUp = a[5] + (b[5] - a[5]) * t;
  shot.lookSide = a[6] + (b[6] - a[6]) * t;
  shot.fov = a[7] + (b[7] - a[7]) * t;
  return shot;
}

/* The car (and its ghost) drawn a size up from the model's true
   scale, so it holds its own in the wide shots. Everything that rides
   on the car's frame — body, wheels, sparks, its footprint on the
   asphalt — scales with it through car.matrix; the trails read it. */
export const CAR_SCALE = 1.2;
const CAR_SIZE = new THREE.Vector3(CAR_SCALE, CAR_SCALE, CAR_SCALE);

const WHEELBASE = 2.93 * CAR_SCALE; // measured from the GLB's tyre clusters
const WHEEL_RADIUS = 0.286 * CAR_SCALE;
const STEER_GAIN = 1.5; // a touch more lock than the geometry needs, so it reads

const tmp = frame();
const tmpTrack = { pos: v3(), fwd: v3(), up: v3(), right: v3(), bank: 0 };
const lampTarget = new THREE.Color();
const intro = { from: v3(), done: false };

/* Smooth, cheap pseudo-noise for handheld drift and shake. */
const wobble = (t, a, b, c) => Math.sin(t * a) * 0.5 + Math.sin(t * b + 1.7) * 0.3 + Math.sin(t * c + 4.1) * 0.2;

export function updateRig(dt) {
  const { car, ghost, cam } = rig;
  const reduced = lap.reduced;
  const t = lap.time;
  const k = 1 - Math.exp(-dt * 6);

  /* ── The car ───────────────────────────────────────────────── */
  sampleLine(lap.s, car);
  rig.speed01 = Math.min(1, Math.abs(lap.speed) / 92);

  /* Body: squat under power, dive under braking, lean out of corners.
     Small — a couple of degrees — and eased, like suspension. */
  const latAccel = lap.speed * lap.speed * car.kappa;
  const pitch = THREE.MathUtils.clamp(lap.accel * 0.0026, -0.032, 0.032);
  const roll = THREE.MathUtils.clamp(-latAccel * 0.0011, -0.03, 0.03);
  car.pitch += (pitch - car.pitch) * k;
  car.roll += (roll - car.roll) * k;
  car.heave = reduced ? 0 : Math.sin(t * 61) * 0.0028 * rig.speed01;
  car.steer += (-Math.atan(WHEELBASE * car.kappa) * STEER_GAIN - car.steer) * (1 - Math.exp(-dt * 10));
  car.spin += (lap.speed / WHEEL_RADIUS) * dt;

  car.matrix.makeBasis(car.fwd, car.up, car.right).scale(CAR_SIZE).setPosition(car.pos);
  car.inverse.copy(car.matrix).invert();

  /* ── The ghost ─────────────────────────────────────────────── */
  ghost.visible = ghostVisibility(lap.s);
  if (ghost.visible > 0) {
    sampleLine(lap.s + ghostLead(lap.s), ghost);
    ghost.pos.addScaledVector(ghost.right, ghostOffset(ghost.lateral));
    ghost.matrix.makeBasis(ghost.fwd, ghost.up, ghost.right).scale(CAR_SIZE).setPosition(ghost.pos);
  }

  /* ── The lamps: red, green or amber, eased over ~0.1 s ─────── */
  lampTarget.set(LIGHT[lap.light].hex);
  rig.lamp.lerp(lampTarget, 1 - Math.exp(-dt * 16));

  /* ── The camera ────────────────────────────────────────────── */
  const sh = shotAt(lap.s);
  /* Portrait: centre the camera behind the car (there is no side
     column of copy to compose against), widen the lens a little, and
     lift the whole picture so the car sits above the copy. */
  const wide = THREE.MathUtils.clamp((rig.aspect - 0.6) / 0.7, 0, 1);
  rig.wide = wide;
  rig.lift = 0.34 * (1 - wide);
  const sideK = 0.3 + 0.7 * wide;
  sampleLine(lap.s - sh.back, tmp);
  cam.pos.copy(tmp.pos).addScaledVector(tmp.right, sh.side * sideK);
  cam.pos.y += sh.height;
  /* In a corner the look-ahead point swings round the bend and drags
     the car toward the screen's edge (and under the HUD). Lean the
     look back against the curvature to keep the car where it was.
     Facing the car (back < 0) it is framed against the line it came
     down, which needs no correction — measured, leaning there only
     made it wander. */
  const lean = sh.back < 0 ? 0 : THREE.MathUtils.clamp(-car.kappa * 150, -5, 5);
  sampleLine(lap.s + sh.ahead, tmp);
  cam.target
    .copy(tmp.pos)
    .addScaledVector(tmp.up, sh.lookUp * (0.4 + 0.6 * wide))
    .addScaledVector(tmp.right, (sh.lookSide + lean) * sideK);

  /* Parked: a slow handheld drift keeps the frame alive.
     Moving: a little high-frequency shake that grows with speed. */
  if (!reduced) {
    const idle = 1 - rig.speed01;
    cam.pos.x += wobble(t, 0.31, 0.53, 0.71) * 0.22 * idle;
    cam.pos.y += wobble(t, 0.27, 0.45, 0.83) * 0.12 * idle;
    cam.pos.z += wobble(t, 0.37, 0.61, 0.29) * 0.22 * idle;
    const shake = 0.035 * rig.speed01 * rig.speed01;
    cam.pos.x += wobble(t * 9, 3.1, 5.3, 7.7) * shake;
    cam.pos.y += wobble(t * 9, 2.7, 4.9, 6.1) * shake;
  }

  /* First load at the top: crane down onto the grid. */
  if (!intro.done) {
    if (reduced || lap.progress > 0.01 || t > 4.2) {
      intro.done = true;
    } else {
      const w = smoothstep(0.15, 3.9, t);
      sampleTrack(lap.s - 34, tmpTrack);
      intro.from.copy(tmpTrack.pos).addScaledVector(tmpTrack.right, -14);
      intro.from.y += 17;
      cam.pos.lerpVectors(intro.from, cam.pos, w);
    }
  }

  sampleTrack(lap.s, tmpTrack);
  cam.roll = reduced ? 0 : tmpTrack.bank * 0.32;
  cam.fov = sh.fov * (1 + 0.3 * (1 - wide)) + (reduced ? 0 : 7 * rig.speed01);
}
