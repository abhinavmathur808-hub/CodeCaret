import * as THREE from "three";
import { ACCENT } from "./accent.js";
import { lap } from "./lapStore.js";
import { sampleTrack, smoothstep } from "./trackLayout.js";

/* ══════════════════════════════════════════════════════════════
   holo — shared plumbing for the holographic set pieces.
   ══════════════════════════════════════════════════════════════ */

const _f = { pos: new THREE.Vector3(), fwd: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3() };

/**
 * A set piece's place: `lateral` metres right of the centreline at s,
 * `height` above it, turned to face the road back at `faceS` (where
 * the camera comes from) and tipped `tilt` toward it.
 */
export function anchor(s, lateral, height, faceS, tilt = 2) {
  sampleTrack(s, _f);
  const position = _f.pos.clone().addScaledVector(_f.right, lateral);
  position.y += height;
  sampleTrack(faceS, _f);
  const look = _f.pos.clone();
  look.y = position.y - tilt;
  const o = new THREE.Object3D();
  o.position.copy(position);
  o.lookAt(look);
  return { position, quaternion: o.quaternion.clone() };
}

/**
 * How "powered on" a set piece at distance s is (0–1): it comes up as
 * the car approaches and powers down once it is well behind.
 */
export function powerAt(s, on = 260, off = 300) {
  return smoothstep(s - on, s - on * 0.45, lap.s) * (1 - smoothstep(s + off * 0.55, s + off, lap.s));
}

/** Power for a stretch of track [a, b] — in step with its copy panel. */
export function sectionPower([a, b]) {
  const on = smoothstep(a - 30, a + 12, lap.s);
  return b === Infinity ? on : on * (1 - smoothstep(b - 12, b + 30, lap.s));
}

/* ── Formation flying ──────────────────────────────────────────
   A set piece rides with the car like a camera drone: `lead` metres
   along the car's (smoothed, level) heading, `lateral` to its right,
   `height` above the road, turned to face the camera and then yawed
   a little so it reads as an object rather than a sticker. Fixed at
   the trackside, each piece was only in shot for a slice of its
   stretch; flying with the car it stays framed the whole way. */
const _o = new THREE.Object3D();
export function dronePose(out, carPos, heading, cfg, camPos, t, wide = 1) {
  const bob = Math.sin(t * 1.3 + cfg.lateral) * 0.22;
  /* On a portrait screen there is no room beside the car: fly in
     closer to its line and higher, above it in the frame. */
  const lateral = cfg.lateral * (0.3 + 0.7 * wide);
  const height = cfg.height + 4 * (1 - wide);
  out.position.set(
    carPos.x + heading.x * cfg.lead - heading.z * lateral,
    carPos.y + height + bob,
    carPos.z + heading.z * cfg.lead + heading.x * lateral
  );
  _o.position.copy(out.position);
  _o.lookAt(camPos);
  _o.rotateY(cfg.yaw ?? 0);
  out.quaternion.copy(_o.quaternion);
  return out;
}

/* ── The hologram shader ───────────────────────────────────────
   A static canvas texture (transparent background; alpha is ink)
   over a procedural glass panel: tinted backdrop, faint grid, edge
   glow, scanlines and a flicker. `uReveal` (0–1) wipes it on from
   the bottom with a bright scan line, so a panel powers up instead
   of popping in. */
export const HOLO_VERT = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

export const HOLO_FRAG_HEAD = /* glsl */ `
  #include <fog_pars_fragment>
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uReveal;
  uniform float uAspect;
  uniform vec3 uAccent;
  varying vec2 vUv;

  vec4 glass(vec2 uv) {
    vec2 px = uv * vec2(uAspect, 1.0);
    vec2 g = abs(fract(px * 14.0) - 0.5);
    float grid = (1.0 - smoothstep(0.0, 0.03, min(g.x, g.y))) * 0.05;
    vec3 bg = mix(vec3(0.012, 0.016, 0.03), vec3(0.03, 0.02, 0.035), uv.y) + uAccent * grid;
    vec2 e = min(uv, 1.0 - uv) * vec2(uAspect, 1.0);
    float edge = min(e.x, e.y);
    float border = smoothstep(0.012, 0.0, edge) * 2.6 + smoothstep(0.08, 0.0, edge) * 0.25;
    return vec4(bg + uAccent * border, 0.78 + border * 0.2);
  }

  float scanlines(vec2 uv) {
    return 0.9 + 0.1 * sin(uv.y * 1100.0 - uTime * 8.0);
  }
`;

export const HOLO_FRAG_TAIL = /* glsl */ `
  float shown = 1.0 - smoothstep(uReveal - 0.012, uReveal, vUv.y);
  float wipe = exp(-abs(vUv.y - uReveal) * 140.0) * step(uReveal, 0.995) * step(0.002, uReveal);
  float flicker = 0.95 + 0.05 * sin(uTime * 37.0) * sin(uTime * 5.3 + vUv.y * 4.0);
  col *= scanlines(vUv) * flicker;
  col += uAccent * wipe * 3.0;
  alpha = max(alpha * shown, wipe * 0.9);
  gl_FragColor = vec4(col, alpha);
  #include <fog_fragment>
`;

/** A panel material: glass + the texture's ink. */
export function holoMaterial(texture, aspect, extraUniforms = {}, body) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uMap: { value: texture },
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uAspect: { value: aspect },
      uAccent: ACCENT,
      ...extraUniforms,
    },
    vertexShader: HOLO_VERT,
    fragmentShader: `${HOLO_FRAG_HEAD}
      ${body?.head ?? ""}
      void main() {
        vec4 base = glass(vUv);
        vec4 ink = texture2D(uMap, vUv);
        ${
          body?.main ??
          `vec3 col = mix(base.rgb, ink.rgb * 1.25, ink.a);
           float alpha = max(base.a, ink.a);`
        }
        ${HOLO_FRAG_TAIL}
      }`,
  });
}

/** Ease a material's reveal toward a target power (0–1). */
export function stepReveal(material, power, dt, time) {
  const u = material.uniforms;
  u.uTime.value = time;
  const target = lap.reduced ? (power > 0.05 ? 1 : 0) : power;
  u.uReveal.value += (target - u.uReveal.value) * Math.min(1, dt * 2.6);
  if (Math.abs(u.uReveal.value - target) < 0.001) u.uReveal.value = target;
}

/* ── Canvas drawing helpers ────────────────────────────────────── */
export function pill(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

export const INK = {
  white: "#ffffff",
  text: "#e8ebf2",
  muted: "#8d94a6",
  faint: "#566072",
  purple: "#b46cff",
  green: "#1fe36a",
  yellow: "#ffd23f",
  red: "#ff4d4d",
  gold: "#ffd36b",
  silver: "#d7dee8",
  bronze: "#e3a066",
};
