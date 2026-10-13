import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ACCENT } from "./accent";
import { lap } from "./lapStore";
import { rig } from "./rig";
import {
  DS,
  FLOOR_Y,
  HALF_WIDTH,
  KERB_RANGES,
  LAT,
  N,
  S_FINISH,
  S_POLE,
  S_START,
  SLAB_DEPTH,
  SLAB_EDGE,
  TRACK_LENGTH,
  VERGE,
  WALL_H,
  sampleTrack,
} from "./trackLayout";
import { BRAND, DISPLAY, canvasTexture, drawLogo, logoArt } from "./textures";

/* ══════════════════════════════════════════════════════════════
   TrackMeshes — the circuit: a deck floating over the city, swept
   along the centreline from cross-section profiles.

   Lighting is mostly faked, on purpose. Forty-odd floodlights as
   real lights would cost every fragment forty light evaluations;
   instead the surface shaders know where the poles stand and pool
   their light on the road themselves, and the car's contact shadow
   is computed from its own matrix. Real lights are kept for what
   needs them — the car's paint.
   ══════════════════════════════════════════════════════════════ */

const POLE_S0 = 52;
const POLE_GAP = 45;
const AD_LEN = 8; // metres per advertising board

/* Shared by every surface material; updated once per frame below. */
const U = {
  uTime: { value: 0 },
  uCarInv: { value: new THREE.Matrix4() },
  uCarS: { value: S_POLE },
  uLamp: { value: new THREE.Color("#ff2a1f") },
  uAccent: ACCENT,
};

/* The racing line's lateral offset as a 1D texture, so the asphalt
   can lay rubber where the car actually drives. Half floats: those
   filter linearly everywhere WebGL2 runs. */
function latTexture() {
  const W = 2048;
  const data = new Uint16Array(W);
  for (let i = 0; i < W; i++) {
    const s = (i / (W - 1)) * TRACK_LENGTH;
    data[i] = THREE.DataUtils.toHalfFloat(LAT[Math.min(N - 1, Math.round(s / DS))]);
  }
  const tex = new THREE.DataTexture(data, W, 1, THREE.RedFormat, THREE.HalfFloatType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/* ── Sweeping ──────────────────────────────────────────────────
   profile: [[lateral, height], …]. Consecutive points make a strip.
   The surface faces 90° counter-clockwise from the direction of
   travel in the (right, up) plane — so trace closed sections
   CLOCKWISE to face outward. A repeated point makes a hard edge. */
const _f = { pos: new THREE.Vector3(), fwd: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3() };

function sweepInto(acc, profile, s0, s1, { step = 1, u = (s) => s, v } = {}) {
  const rows = Math.max(2, Math.ceil((s1 - s0) / step) + 1);
  const cols = profile.length;
  const base = acc.pos.length / 3;
  const lengths = [0];
  for (let c = 1; c < cols; c++) {
    lengths[c] = lengths[c - 1] + Math.hypot(profile[c][0] - profile[c - 1][0], profile[c][1] - profile[c - 1][1]);
  }
  for (let r = 0; r < rows; r++) {
    const s = s0 + ((s1 - s0) * r) / (rows - 1);
    sampleTrack(s, _f);
    for (let c = 0; c < cols; c++) {
      const [lat, h] = profile[c];
      acc.pos.push(
        _f.pos.x + _f.right.x * lat + _f.up.x * h,
        _f.pos.y + _f.right.y * lat + _f.up.y * h,
        _f.pos.z + _f.right.z * lat + _f.up.z * h
      );
      acc.uv.push(u(s), v ? v(c, lengths[c], lat, h) : lengths[c]);
    }
  }
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = base + r * cols + c;
      const b = a + 1, d = a + cols, e = d + 1;
      acc.index.push(a, b, d, b, e, d);
    }
  }
}

function build(fill) {
  const acc = { pos: [], uv: [], index: [] };
  fill(acc);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(acc.pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(acc.uv, 2));
  g.setIndex(acc.index);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/* ── Shader plumbing ───────────────────────────────────────────── */
const COMMON = /* glsl */ `
  uniform float uTime;
  uniform mat4 uCarInv;
  uniform vec3 uLamp;
  uniform vec3 uAccent;
  varying vec2 vTrackUv;
  varying vec3 vWorldPos;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
  }

  /* Floodlight pools: poles every ${POLE_GAP} m, alternating sides,
     heads reaching in over the road. */
  float poolLight(float s, float lat) {
    float k = floor((s - ${POLE_S0.toFixed(1)}) / ${POLE_GAP.toFixed(1)});
    float acc = 0.0;
    for (int j = 0; j < 2; j++) {
      float kk = k + float(j);
      float sk = ${POLE_S0.toFixed(1)} + kk * ${POLE_GAP.toFixed(1)};
      float side = mod(kk, 2.0) < 0.5 ? -1.0 : 1.0;
      vec2 d = vec2((s - sk) / 15.0, (lat - side * 7.0) / 10.0);
      acc += exp(-dot(d, d) * 1.4);
    }
    return acc;
  }

  /* The car's contact shadow, from its own frame: a soft rounded box
     under the floor plus a wider ambient-occlusion skirt. */
  float carShadow(vec3 wp) {
    vec3 c = (uCarInv * vec4(wp, 1.0)).xyz;
    if (abs(c.y) > 1.5) return 1.0;
    vec2 q = abs(c.xz - vec2(-0.05, 0.0)) - vec2(2.15, 0.7);
    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    float core = smoothstep(0.32, -0.3, sd) * 0.9;
    float ao = exp(-max(sd, 0.0) * 2.4) * 0.5;
    return 1.0 - max(core, ao);
  }

  /* Underglow: the car's floor throws the accent onto the road. */
  float carGlow(vec3 wp) {
    vec3 c = (uCarInv * vec4(wp, 1.0)).xyz;
    if (abs(c.y) > 1.5) return 0.0;
    vec2 q = abs(c.xz) - vec2(1.9, 0.55);
    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    return exp(-max(sd, 0.0) * 1.3) * smoothstep(-0.4, 0.3, sd);
  }

  /* The start lights wash the grid in their colour. */
  float lampWash(float s, float lat) {
    float d = (s - ${(S_START - 9).toFixed(1)}) / 16.0;
    return exp(-d * d) * exp(-lat * lat / 60.0);
  }
`;

function surfaceMaterial({ key, color = "#ffffff", roughness = 0.8, metalness = 0, envMapIntensity = 0.35, colour, rough, emissive }) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity });
  /* three caches compiled programs by onBeforeCompile's SOURCE TEXT,
     and every surface shares this one function — without a key of its
     own, the run-off and kerbs would silently get the asphalt shader. */
  m.customProgramCacheKey = () => `cc-landing-${key}`;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vTrackUv;\nvarying vec3 vWorldPos;")
      .replace(
        "#include <uv_vertex>",
        "#include <uv_vertex>\nvTrackUv = uv;\nvWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;"
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${COMMON}\nuniform sampler2D uLat;\nuniform sampler2D uLogo;`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${colour}`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n${rough || ""}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${emissive || ""}`);
  };
  return m;
}

/* What every road-level surface adds for light: pools from the
   floods, the start lights' wash, the car's underglow — all shadowed
   by the car. `albedo` must be declared by the colour chunk. */
const LIT = /* glsl */ `
  float shade = carShadow(vWorldPos);
  vec3 floodCol = vec3(1.0, 0.9, 0.78) * poolLight(vTrackUv.x, lat) * 1.6;
  vec3 lampCol = uLamp * lampWash(vTrackUv.x, lat) * 1.3;
  totalEmissiveRadiance += albedo * (floodCol + lampCol) * shade;
  totalEmissiveRadiance += uAccent * carGlow(vWorldPos) * 0.12;
`;

/* ── Asphalt ─────────────────────────────────────────────────── */
const ASPHALT_COLOUR = /* glsl */ `
  float s = vTrackUv.x;
  float lat = vTrackUv.y - ${HALF_WIDTH.toFixed(1)};
  float grain = hash12(floor(vec2(s, lat) * 7.0));
  float patches = vnoise(vec2(s, lat) * 0.18);
  vec3 albedo = vec3(0.07, 0.072, 0.08) * (0.86 + grain * 0.22 + (patches - 0.5) * 0.35);

  /* Rubber laid down along the racing line. */
  float lineLat = texture2D(uLat, vec2(s / ${TRACK_LENGTH.toFixed(1)}, 0.5)).r;
  float rubber = exp(-pow((lat - lineLat) / 1.15, 2.0));
  albedo *= 1.0 - 0.38 * rubber;

  /* Paint: track-limit lines, start line, grid boxes, the flag line. */
  float paint = smoothstep(0.02, 0.0, abs(abs(lat) - 5.78) - 0.1);
  paint = max(paint, step(abs(s - ${S_START.toFixed(1)}), 0.18) * step(abs(lat), 5.7));
  if (s > ${(S_POLE - 70).toFixed(1)} && s < ${(S_POLE + 4).toFixed(1)}) {
    float k = floor((${(S_POLE + 4).toFixed(1)} - s) / 8.0);
    float sk = ${S_POLE.toFixed(1)} - 8.0 * k;
    float ck = mod(k, 2.0) < 0.5 ? -3.0 : 3.0;
    float front = step(abs(s - (sk + 2.75)), 0.09) * step(abs(lat - ck), 1.12);
    float legs = step(abs(abs(lat - ck) - 1.1), 0.09) * step(sk + 1.2, s) * step(s, sk + 2.84);
    paint = max(paint, max(front, legs));
  }
  float flag = 0.0;
  if (abs(s - ${S_FINISH.toFixed(1)}) < 1.2) {
    float c = mod(floor((s - ${S_FINISH.toFixed(1)}) / 0.6) + floor(lat / 0.6), 2.0);
    flag = 1.0;
    paint = c;
  }
  /* The CodeCaret mark, painted across the run to Turn 1. */
  if (s > 140.0 && s < 152.0 && abs(lat) < 5.4) {
    paint = max(paint, texture2D(uLogo, vec2((lat + 5.4) / 10.8, (s - 140.0) / 12.0)).r * 0.92);
  }
  vec3 paintCol = vec3(0.66);
  albedo = mix(albedo, flag > 0.5 ? mix(vec3(0.02), vec3(0.85), paint) : paintCol, flag > 0.5 ? 1.0 : paint);
  diffuseColor.rgb = albedo * carShadow(vWorldPos);
`;

const ASPHALT_ROUGH = /* glsl */ `
  roughnessFactor = clamp(0.88 - rubber * 0.3 - paint * 0.25 - (patches - 0.5) * 0.12, 0.35, 1.0);
`;

/* The CodeCaret logo painted across the run to Turn 1. Drawn to fill
   the canvas: the paint is laid over 10.8 m of width and 12 m of
   track, which stretches it along the road the way real track
   lettering is — so it reads from a low car, not just from above. */
function logoTexture() {
  return canvasTexture(
    1024,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      const art = logoArt("#ffffff");
      if (art) {
        ctx.drawImage(art, 40, 6, w - 80, h - 12);
      } else {
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `200px ${BRAND}`;
        ctx.fillText("CodeCaret", w / 2, h / 2);
      }
    },
    { srgb: false }
  );
}

/* ── Advertising boards ────────────────────────────────────────
   Four boards stacked in one texture; each 8 m panel of wall picks a
   row through its UVs. */
const BOARDS = [
  { text: "The typing simulator for code", accentBg: false, logo: true, tagline: true },
  { text: "Prove your keystrokes", accentBg: true, tagline: true },
  { text: "514 snippets · C++ · Python · JavaScript", accentBg: false },
  { text: "Ghost lap · Track records · Elo", accentBg: false, logo: true },
];

/* Trackside boards, the logo itself on two of them: the taglines in
   the logo's lettering, the facts in the site's heading face. Each
   row is 1024 × 128, close to the 8 m × 1.05 m panel it is wrapped
   onto, so nothing is stretched. */
function boardsTexture() {
  return canvasTexture(1024, 512, (ctx, w) => {
    BOARDS.forEach((b, row) => {
      const y = row * 128;
      ctx.fillStyle = b.accentBg ? "#c00500" : "#07080c";
      ctx.fillRect(0, y, w, 128);
      ctx.fillStyle = b.accentBg ? "rgba(0,0,0,0.25)" : "#e10600";
      ctx.fillRect(0, y + 120, w, 8);
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      const logo = b.logo && drawLogo(ctx, 26, y + 6, 200, 110);
      const room = logo ? w - 250 - 30 : w - 60;
      /* Largest size that fits the panel, from a size that suits the face. */
      let size = b.tagline ? (b.logo ? 54 : 68) : 50;
      const face = (px) => (b.tagline ? `${px}px ${BRAND}` : `700 ${px}px ${DISPLAY}`);
      ctx.font = face(size);
      while (size > 24 && ctx.measureText(b.text).width > room) ctx.font = face((size -= 2));
      if (logo) {
        ctx.textAlign = "left";
        ctx.fillText(b.text, 250, y + 62);
      } else {
        ctx.textAlign = "center";
        ctx.fillText(b.text, w / 2, y + 62);
      }
    });
  });
}

/* ── Glowing strips: the trail ─────────────────────────────────
   LED lines along the wall tops and under the deck edges. Behind the
   car they burn bright — the lap so far, drawn on the circuit — and
   ahead of it chase lights run toward the next corner. */
function trailMaterial(intensity = 1) {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...U, uGain: { value: intensity } },
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec2 vUv2;
      void main() {
        vUv2 = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform float uCarS;
      uniform vec3 uAccent;
      uniform float uGain;
      varying vec2 vUv2;
      void main() {
        float s = vUv2.x;
        float behind = step(s, uCarS) * step(${(S_POLE - 30).toFixed(1)}, s);
        float head = exp(-max(uCarS - s, 0.0) * 0.06) * behind;
        float ahead = 1.0 - behind;
        float chase = pow(0.5 + 0.5 * sin((s - uTime * 46.0) * 0.16), 10.0) * exp(-max(s - uCarS, 0.0) * 0.008);
        vec3 col = uAccent * (behind * (1.1 + head * 3.5) + ahead * (0.1 + chase * 1.4));
        gl_FragColor = vec4(col * uGain, 1.0);
        #include <fog_fragment>
      }
    `,
  });
}

/* ── Marshal panels: the three lights, all round the lap ────────── */
const AMBER = { value: 0 }; // 0 → 1 as the yellow flag comes out
function marshalMaterial() {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...U, uAmber: AMBER },
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec2 vUv2;
      varying float vFront;
      void main() {
        vUv2 = uv;
        vFront = step(0.5, normal.z);
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform vec3 uLamp;
      uniform float uTime;
      uniform float uAmber;
      varying vec2 vUv2;
      varying float vFront;
      void main() {
        vec2 g = fract(vUv2 * vec2(12.0, 8.0)) - 0.5;
        float dots = smoothstep(0.36, 0.22, length(g));
        float flash = mix(1.0, 0.25 + 0.75 * step(0.5, fract(uTime * 1.6)), uAmber);
        vec3 col = mix(vec3(0.02), uLamp * (0.25 + dots * 4.5) * flash, vFront);
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }
    `,
  });
}

/* ── Light cones under the floodlights ─────────────────────────── */
function coneMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: U.uTime },
    vertexShader: /* glsl */ `
      varying float vH;
      varying float vFacing;
      varying float vNear;
      void main() {
        vH = uv.y;
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vFacing = abs(dot(n, normalize(-mv.xyz)));
        vNear = smoothstep(6.0, 26.0, -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vH;
      varying float vFacing;
      varying float vNear;
      void main() {
        float a = pow(vFacing, 2.2) * pow(vH, 1.6) * 0.05 * vNear;
        gl_FragColor = vec4(vec3(1.0, 0.92, 0.8) * a, 1.0);
      }
    `,
  });
}

/* ── Pylons, with accent rings climbing them ───────────────────── */
function pylonMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: "#14151b", roughness: 0.5, metalness: 0.6, envMapIntensity: 0.4 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uAccent = ACCENT;
    shader.uniforms.uTime = U.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vWorldY;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvWorldY = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).y;"
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vWorldY;\nuniform vec3 uAccent;\nuniform float uTime;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
         float band = smoothstep(0.12, 0.0, abs(fract((vWorldY - uTime * 3.0) / 9.0) - 0.5) - 0.42);
         totalEmissiveRadiance += uAccent * band * 1.6 * smoothstep(${FLOOR_Y.toFixed(1)}, ${(FLOOR_Y + 20).toFixed(1)}, vWorldY);`
      );
  };
  return m;
}

/* Place instances along the track: fn(i) → { s, lateral, height, yaw, scale } */
function useInstances(ref, count, place) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const basis = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const o = place(i);
      sampleTrack(o.s, _f);
      p.copy(_f.pos).addScaledVector(_f.right, o.lateral ?? 0);
      if (o.upright) p.y += o.height ?? 0;
      else p.addScaledVector(_f.up, o.height ?? 0);
      if (o.upright) {
        /* Vertical, but turned to the track's heading. */
        const fx = _f.fwd.x, fz = _f.fwd.z;
        const l = Math.hypot(fx, fz) || 1;
        basis.makeBasis(
          new THREE.Vector3(fx / l, 0, fz / l),
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(-fz / l, 0, fx / l)
        );
      } else {
        basis.makeBasis(_f.fwd, _f.up, _f.right);
      }
      q.setFromRotationMatrix(basis);
      if (o.yaw) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), o.yaw));
      sc.set(...(o.scale ?? [1, 1, 1]));
      m.compose(p, q, sc);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, count, place]);
}

export default function TrackMeshes() {
  const marshalRef = useRef(null);
  const asphalt = useMemo(() => {
    const lat = latTexture();
    const m = surfaceMaterial({
      key: "asphalt",
      colour: ASPHALT_COLOUR,
      rough: ASPHALT_ROUGH,
      emissive: LIT,
    });
    const logo = logoTexture();
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (shader) => {
      prev(shader);
      shader.uniforms.uLogo = { value: logo };
      shader.uniforms.uLat = { value: lat };
    };
    return m;
  }, []);

  const runoff = useMemo(
    () =>
      surfaceMaterial({
        key: "runoff",
        colour: /* glsl */ `
          float s = vTrackUv.x;
          float lat = vTrackUv.y;
          float g = hash12(floor(vec2(s, lat) * 5.0));
          vec3 albedo = vec3(0.045, 0.047, 0.055) * (0.85 + g * 0.3);
          /* Painted run-off bands, Paul Ricard style. */
          float band = step(0.5, fract((s + abs(lat) * 0.9) / 4.0));
          albedo = mix(albedo, mix(vec3(0.1, 0.012, 0.012), uAccent * 0.32, 0.6), band * smoothstep(7.2, 8.0, abs(lat)) * 0.85);
          diffuseColor.rgb = albedo;
        `,
        rough: "roughnessFactor = 0.8;",
        emissive: LIT,
      }),
    []
  );

  const kerb = useMemo(
    () =>
      surfaceMaterial({
        key: "kerb",
        colour: /* glsl */ `
          float s = vTrackUv.x;
          float lat = vTrackUv.y;
          float stripe = step(0.5, fract(s / 2.4));
          vec3 albedo = mix(vec3(0.8), mix(uAccent, vec3(0.75, 0.04, 0.03), 0.35), stripe);
          diffuseColor.rgb = albedo * carShadow(vWorldPos);
        `,
        rough: "roughnessFactor = 0.55;",
        emissive: LIT,
      }),
    []
  );

  const geometries = useMemo(() => {
    const L = TRACK_LENGTH;
    const asphaltG = build((acc) => sweepInto(acc, [[-HALF_WIDTH, 0], [HALF_WIDTH, 0]], 0, L, { step: 1, v: (c, len) => len }));
    const runoffG = build((acc) => {
      sweepInto(acc, [[-VERGE, -0.004], [-HALF_WIDTH, -0.004]], 0, L, { step: 2, v: (c, len, lat) => lat });
      sweepInto(acc, [[HALF_WIDTH, -0.004], [VERGE, -0.004]], 0, L, { step: 2, v: (c, len, lat) => lat });
    });
    const kerbG = build((acc) => {
      for (const r of KERB_RANGES) {
        sweepInto(acc, [[6.0, 0.0], [6.3, 0.07], [7.0, 0.07], [7.3, 0.0]], r.from, r.to, { step: 0.6, v: (c, l, lat) => lat });
        sweepInto(acc, [[-7.3, 0.0], [-7.0, 0.07], [-6.3, 0.07], [-6.0, 0.0]], r.from, r.to, { step: 0.6, v: (c, l, lat) => lat });
      }
    });

    /* Wall faces carry the boards: one 8 m panel at a time, so each
       can pick its own row of the board texture. On the right wall
       u runs backwards, or the boards would read mirrored. */
    const boardsG = build((acc) => {
      for (let k = 0; k * AD_LEN < L; k++) {
        const a = k * AD_LEN, b = Math.min(L, a + AD_LEN);
        const row = k % 4;
        /* Row r fills v ∈ [1 − (r+1)/4, 1 − r/4] (the canvas is drawn
           top-down and flipped on upload); f is height up the wall, 0–1.
           The right wall's profile climbs, the left wall's descends. */
        const v = (side) => (c, len) => 1 - (row + 1 - (side > 0 ? len / WALL_H : 1 - len / WALL_H)) / 4;
        sweepInto(acc, [[VERGE, 0], [VERGE, WALL_H]], a, b, { step: 2, u: (s) => (b - s) / AD_LEN, v: v(1) });
        sweepInto(acc, [[-VERGE, WALL_H], [-VERGE, 0]], a, b, { step: 2, u: (s) => (s - a) / AD_LEN, v: v(-1) });
      }
    });
    const wallG = build((acc) => {
      sweepInto(acc, [[VERGE, WALL_H], [VERGE, WALL_H], [VERGE + 0.45, WALL_H], [VERGE + 0.45, WALL_H], [VERGE + 0.45, 0]], 0, L, { step: 2 });
      sweepInto(acc, [[-VERGE - 0.45, 0], [-VERGE - 0.45, WALL_H], [-VERGE - 0.45, WALL_H], [-VERGE, WALL_H]], 0, L, { step: 2 });
    });
    const slabG = build((acc) => {
      const E = SLAB_EDGE, D = -SLAB_DEPTH;
      sweepInto(acc, [[VERGE + 0.45, 0], [E, 0], [E, 0], [E, D], [E, D], [-E, D], [-E, D], [-E, 0], [-E, 0], [-VERGE - 0.45, 0]], 0, L, { step: 2 });
    });
    const glassG = build((acc) => {
      sweepInto(acc, [[VERGE + 0.2, WALL_H], [VERGE + 0.2, 3.4]], 0, L, { step: 2 });
      sweepInto(acc, [[-VERGE - 0.2, 3.4], [-VERGE - 0.2, WALL_H]], 0, L, { step: 2 });
    });
    const ledG = build((acc) => {
      sweepInto(acc, [[VERGE - 0.02, WALL_H + 0.01], [VERGE + 0.14, WALL_H + 0.01]], 0, L, { step: 1 });
      sweepInto(acc, [[-VERGE - 0.14, WALL_H + 0.01], [-VERGE + 0.02, WALL_H + 0.01]], 0, L, { step: 1 });
    });
    const underG = build((acc) => {
      const E = SLAB_EDGE + 0.01, D = -SLAB_DEPTH;
      sweepInto(acc, [[E, D + 0.28], [E, D + 0.12]], 0, L, { step: 2 });
      sweepInto(acc, [[-E, D + 0.12], [-E, D + 0.28]], 0, L, { step: 2 });
    });
    return { asphaltG, runoffG, kerbG, boardsG, wallG, slabG, glassG, ledG, underG };
  }, []);

  const boards = useMemo(() => {
    const tex = boardsTexture();
    return new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: "#ffffff",
      emissiveIntensity: 0.9,
      roughness: 0.4,
      envMapIntensity: 0.2,
    });
  }, []);
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#16171d", roughness: 0.55, metalness: 0.3, envMapIntensity: 0.35 }), []);
  const slabMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0d0e12", roughness: 0.42, metalness: 0.75, envMapIntensity: 0.5 }), []);
  const glassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#a9c2dc",
        transparent: true,
        opacity: 0.07,
        roughness: 0.05,
        metalness: 0.9,
        envMapIntensity: 0.4,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );
  const led = useMemo(() => trailMaterial(1), []);
  const under = useMemo(() => trailMaterial(1.4), []);
  const marshal = useMemo(() => marshalMaterial(), []);
  const cones = useMemo(() => coneMaterial(), []);
  const pylons = useMemo(() => pylonMaterial(), []);
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1b1c22", roughness: 0.45, metalness: 0.8, envMapIntensity: 0.5 }), []);
  const headMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#222", emissive: "#fff2df", emissiveIntensity: 6, roughness: 0.3 }), []);

  /* Floodlights stand on the wall tops and reach in over the road. */
  const poleCount = Math.floor((TRACK_LENGTH - POLE_S0) / POLE_GAP) + 1;
  const poleSide = (i) => (i % 2 === 0 ? -1 : 1);
  const placePole = useMemo(() => (i) => ({ s: POLE_S0 + i * POLE_GAP, lateral: poleSide(i) * (VERGE + 0.25), height: WALL_H + 5.2, upright: true, scale: [0.32, 10.4, 0.32] }), []);
  const placeArm = useMemo(() => (i) => ({ s: POLE_S0 + i * POLE_GAP, lateral: poleSide(i) * (VERGE - 1.6), height: WALL_H + 10.2, upright: true, scale: [0.24, 0.24, 3.9] }), []);
  const placeHead = useMemo(() => (i) => ({ s: POLE_S0 + i * POLE_GAP, lateral: poleSide(i) * (VERGE - 3.4), height: WALL_H + 9.95, upright: true, scale: [1.9, 0.22, 0.9] }), []);
  const placeCone = useMemo(() => (i) => ({ s: POLE_S0 + i * POLE_GAP, lateral: poleSide(i) * (VERGE - 3.6), height: WALL_H + 9.85 - 5.4, upright: true, scale: [1, 1, 1] }), []);
  const poleRef = useRef(null), armRef = useRef(null), headRef = useRef(null), coneRef = useRef(null);
  useInstances(poleRef, poleCount, placePole);
  useInstances(armRef, poleCount, placeArm);
  useInstances(headRef, poleCount, placeHead);
  useInstances(coneRef, poleCount, placeCone);

  /* Pylons from the deck down to the city floor. */
  const pylonCount = Math.floor(TRACK_LENGTH / 38);
  const placePylon = useMemo(
    () => (i) => {
      const s = 19 + i * 38;
      sampleTrack(s, _f);
      const top = _f.pos.y - SLAB_DEPTH;
      const h = top - FLOOR_Y;
      return { s, lateral: 0, height: -SLAB_DEPTH - h / 2, upright: true, scale: [1, h, 1] };
    },
    []
  );
  const pylonRef = useRef(null);
  useInstances(pylonRef, pylonCount, placePylon);

  /* Fence posts. */
  const postCount = Math.floor(TRACK_LENGTH / 6) * 2;
  const placePost = useMemo(() => (i) => ({ s: 3 + Math.floor(i / 2) * 6, lateral: (i % 2 ? 1 : -1) * (VERGE + 0.2), height: WALL_H + 1.17, upright: true, scale: [0.07, 2.35, 0.07] }), []);
  const postRef = useRef(null);
  useInstances(postRef, postCount, placePost);

  /* Marshal panels: every 120 m, alternating sides, turned to face
     the cars coming at them. */
  const marshalCount = Math.floor((TRACK_LENGTH - 140) / 120);
  const placeMarshal = useMemo(
    () => (i) => {
      const side = i % 2 ? 1 : -1;
      return { s: 140 + i * 120, lateral: side * (VERGE + 0.1), height: WALL_H + 1.25, upright: true, yaw: -Math.PI / 2 - side * 0.35, scale: [1.5, 1.0, 0.14] };
    },
    []
  );
  useInstances(marshalRef, marshalCount, placeMarshal);

  useFrame((state, dt) => {
    U.uTime.value = state.clock.elapsedTime;
    U.uCarInv.value.copy(rig.car.inverse);
    U.uCarS.value = lap.s;
    U.uLamp.value.copy(rig.lamp);
    const amber = lap.light === "amber" ? 1 : 0;
    AMBER.value += (amber - AMBER.value) * Math.min(1, dt * 10);
  });

  return (
    <group>
      <mesh geometry={geometries.asphaltG} material={asphalt} />
      <mesh geometry={geometries.runoffG} material={runoff} />
      <mesh geometry={geometries.kerbG} material={kerb} />
      <mesh geometry={geometries.boardsG} material={boards} />
      <mesh geometry={geometries.wallG} material={wallMat} />
      <mesh geometry={geometries.slabG} material={slabMat} />
      <mesh geometry={geometries.ledG} material={led} />
      <mesh geometry={geometries.underG} material={under} />
      <mesh geometry={geometries.glassG} material={glassMat} renderOrder={2} />

      <instancedMesh ref={postRef} args={[undefined, undefined, postCount]} material={metal}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={poleRef} args={[undefined, undefined, poleCount]} material={metal}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={armRef} args={[undefined, undefined, poleCount]} material={metal}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, poleCount]} material={headMat}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={coneRef} args={[undefined, undefined, poleCount]} material={cones} renderOrder={6}>
        <cylinderGeometry args={[0.7, 6.2, 10.8, 28, 1, true]} />
      </instancedMesh>
      <instancedMesh ref={pylonRef} args={[undefined, undefined, pylonCount]} material={pylons}>
        <cylinderGeometry args={[1.5, 2.3, 1, 14, 1]} />
      </instancedMesh>
      <instancedMesh ref={marshalRef} args={[undefined, undefined, marshalCount]} material={marshal}>
        <boxGeometry />
      </instancedMesh>
    </group>
  );
}
