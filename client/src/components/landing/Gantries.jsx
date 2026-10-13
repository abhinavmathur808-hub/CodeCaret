import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ACCENT } from "./accent";
import { lap } from "./lapStore";
import { rig } from "./rig";
import { S1_END, S2_END, S_FINISH, S_START, VERGE, sampleTrack } from "./trackLayout";
import { BRAND, DISPLAY, canvasTexture, drawLogo } from "./textures";

/* ══════════════════════════════════════════════════════════════
   Gantries — the structures that span the track:

     START    the three lights. Red on the grid, green while the
              car is moving, amber once it stops — the page's
              original three-light idea, now hanging over the road
              and washing the grid in its colour.
     S2, S3   sector gantries with marshalling lights that repeat
              the same three states round the lap.
     DRS      the activation board at the head of the back straight.
     FINISH   chequered beam, flags, and fireworks on the crossing.
   ══════════════════════════════════════════════════════════════ */

const PILLAR_X = VERGE + 0.22; // pillars stand on the wall tops
const _frame = { pos: new THREE.Vector3(), fwd: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3() };

/* Upright frame at distance s: local x along the track, y up, z right. */
function gantryMatrix(s) {
  sampleTrack(s, _frame);
  const f = new THREE.Vector3(_frame.fwd.x, 0, _frame.fwd.z).normalize();
  const r = new THREE.Vector3(-f.z, 0, f.x);
  const m = new THREE.Matrix4().makeBasis(f, new THREE.Vector3(0, 1, 0), r);
  m.setPosition(_frame.pos);
  return m;
}

function Placed({ s, children }) {
  const matrix = useMemo(() => gantryMatrix(s), [s]);
  return (
    <group matrixAutoUpdate={false} matrix={matrix}>
      {children}
    </group>
  );
}

/* ── LED screens ──────────────────────────────────────────────── */
function ledMaterial({ texture, cols, rows, gain = 2.4, scroll = 0, tint = null }) {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uMap: { value: texture },
      uGrid: { value: new THREE.Vector2(cols, rows) },
      uGain: { value: gain },
      uScroll: { value: scroll },
      uTime: { value: 0 },
      uTint: { value: tint ?? new THREE.Color(1, 1, 1) },
      uAccent: ACCENT,
      uUseAccent: { value: tint ? 0 : 1 },
    },
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
      uniform sampler2D uMap;
      uniform vec2 uGrid;
      uniform float uGain;
      uniform float uScroll;
      uniform float uTime;
      uniform vec3 uTint;
      uniform vec3 uAccent;
      uniform float uUseAccent;
      varying vec2 vUv2;
      void main() {
        vec2 uv = vUv2;
        uv.x = fract(uv.x + uTime * uScroll);
        vec2 cell = floor(uv * uGrid);
        vec2 f = fract(uv * uGrid) - 0.5;
        vec4 tex = texture2D(uMap, (cell + 0.5) / uGrid);
        /* White pixels in the art take the accent; coloured ones keep theirs. */
        float white = step(0.85, min(tex.r, min(tex.g, tex.b)));
        vec3 c = mix(tex.rgb * uTint, uAccent * 1.4, white * uUseAccent);
        float led = smoothstep(0.46, 0.2, length(f));
        vec3 col = c * led * uGain + vec3(0.012, 0.013, 0.018);
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }
    `,
  });
}

function textArt(text, { w = 1024, h = 128, font, color = "#ffffff", bg = "#000000", align = "center" } = {}) {
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.font = font ?? `800 ${Math.round(h * 0.6)}px ${DISPLAY}`;
    ctx.fillText(text, align === "center" ? w / 2 : 24, h / 2 + 2);
  });
}

/* The start gantry's ticker: the logo between lines of the tagline,
   twice round the strip (it scrolls, so it must tile seamlessly). */
function tickerArt() {
  return canvasTexture(2048, 128, (ctx, w, h) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `80px ${BRAND}`;
    const half = w / 2;
    for (let k = 0; k < 2; k++) {
      const x0 = k * half;
      const hasLogo = drawLogo(ctx, x0 + 24, 6, 190, h - 12);
      ctx.fillText("Prove your keystrokes", x0 + (hasLogo ? 240 : 40), h / 2 + 4);
    }
  });
}

function LedScreen({ texture, size, position, rotation, cols, rows, scroll = 0, gain, tint }) {
  const material = useMemo(() => ledMaterial({ texture, cols, rows, scroll, gain, tint }), [texture, cols, rows, scroll, gain, tint]);
  const ref = useRef(null);
  useFrame((state) => {
    if (ref.current) ref.current.material.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh ref={ref} position={position} rotation={rotation} material={material}>
      <planeGeometry args={size} />
    </mesh>
  );
}

/* A soft additive halo, for lamps that should glare. */
let haloTex = null;
function haloTexture() {
  if (!haloTex) {
    haloTex = canvasTexture(
      128,
      128,
      (ctx) => {
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.18, "rgba(255,255,255,0.55)");
        g.addColorStop(0.5, "rgba(255,255,255,0.12)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
      },
      { srgb: false }
    );
  }
  return haloTex;
}

/* ── Truss: a box beam with diagonal bracing ──────────────────── */
function Truss({ span, height, depth = 0.9, material }) {
  const braces = useMemo(() => {
    const out = [];
    const n = Math.round(span / 1.6);
    for (let i = 0; i < n; i++) {
      const z = -span / 2 + (i + 0.5) * (span / n);
      out.push({ z, tilt: i % 2 ? 0.75 : -0.75 });
    }
    return out;
  }, [span]);
  return (
    <group position={[0, height, 0]}>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sy) => (
          <mesh key={`${sx}${sy}`} position={[(sx * depth) / 2, (sy * 0.5) / 1, 0]} material={material}>
            <boxGeometry args={[0.12, 0.12, span]} />
          </mesh>
        ))
      )}
      {braces.map((b, i) =>
        [-1, 1].map((sx) => (
          <mesh key={`${i}${sx}`} position={[(sx * depth) / 2, 0, b.z]} rotation={[b.tilt, 0, 0]} material={material}>
            <boxGeometry args={[0.07, 1.25, 0.07]} />
          </mesh>
        ))
      )}
    </group>
  );
}

/* Pillars run down through the wall into the deck, so they stay
   planted where the road is cambered and one wall sits higher. */
const PILLAR_FOOT = -1.0;
function Pillars({ top, material }) {
  return [-1, 1].map((side) => (
    <mesh key={side} position={[0, (PILLAR_FOOT + top) / 2, side * PILLAR_X]} material={material}>
      <boxGeometry args={[0.7, top - PILLAR_FOOT, 0.7]} />
    </mesh>
  ));
}

/* ── The start gantry ─────────────────────────────────────────── */
function StartGantry({ steel, carbon }) {
  const lenses = useRef([]);
  const halos = useRef([]);
  const light = useRef(null);
  const lens = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#100606", emissive: "#ff2a1f", emissiveIntensity: 7, roughness: 0.2 }),
    []
  );
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: haloTexture(),
        color: "#ff2a1f",
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );
  const banner = useMemo(() => tickerArt(), []);

  useFrame((state) => {
    /* Amber is a yellow flag: the lamps blink. */
    const blink = lap.light === "amber" && !lap.reduced ? 0.35 + 0.65 * (Math.sin(state.clock.elapsedTime * 7) > -0.2 ? 1 : 0) : 1;
    const glass = lenses.current[0]?.material;
    if (glass) {
      glass.emissive.copy(rig.lamp);
      glass.emissiveIntensity = 2.3 * blink;
    }
    halos.current[0]?.material.color.copy(rig.lamp).multiplyScalar(0.45 * blink);
    if (light.current) {
      light.current.color.copy(rig.lamp);
      light.current.intensity = 80 * blink;
    }
  });

  const LAMP_Y = 6.95;
  return (
    <Placed s={S_START}>
      <Pillars top={9.6} material={steel} />
      <Truss span={PILLAR_X * 2 + 0.7} height={9.1} material={steel} />
      {/* The lights pod, facing the grid (−x). */}
      <mesh position={[0, LAMP_Y, 0]} material={carbon}>
        <boxGeometry args={[0.55, 2.0, 7.4]} />
      </mesh>
      <mesh position={[0, 7.95, 0]} material={steel}>
        <boxGeometry args={[0.2, 0.9, 0.2]} />
      </mesh>
      {[-2.2, 0, 2.2].map((z, i) => (
        <group key={z} position={[-0.3, LAMP_Y, z]}>
          <mesh
            ref={(el) => (lenses.current[i] = el)}
            rotation={[0, 0, Math.PI / 2]}
            material={lens}
          >
            <cylinderGeometry args={[0.58, 0.58, 0.08, 40]} />
          </mesh>
          {/* Visor over each lamp. */}
          <mesh position={[-0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={carbon}>
            <cylinderGeometry args={[0.7, 0.7, 0.55, 24, 1, true, 0, Math.PI]} />
          </mesh>
          <mesh ref={(el) => (halos.current[i] = el)} position={[-0.12, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={haloMat} renderOrder={8}>
            <planeGeometry args={[2.3, 2.3]} />
          </mesh>
        </group>
      ))}
      <LedScreen
        texture={banner}
        size={[12, 1.1]}
        position={[-0.62, 9.1, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        cols={360}
        rows={22}
        scroll={0.045}
        gain={2.2}
      />
      <pointLight ref={light} position={[-5, 6.5, 0]} distance={38} decay={2} intensity={80} color="#ff2a1f" />
    </Placed>
  );
}

/* ── Sector gantries ──────────────────────────────────────────── */
function SectorGantry({ s, label, steel, carbon }) {
  const art = useMemo(() => textArt(label, { w: 1024, h: 128, font: `800 74px ${DISPLAY}` }), [label]);
  const leds = useMemo(() => new THREE.MeshStandardMaterial({ color: "#050505", emissive: "#1fe36a", emissiveIntensity: 5 }), []);
  const led = useRef(null);
  useFrame((state) => {
    const m = led.current?.material;
    if (!m) return;
    m.emissive.copy(rig.lamp);
    const blink = lap.light === "amber" && !lap.reduced ? (Math.sin(state.clock.elapsedTime * 7) > -0.2 ? 1 : 0.3) : 1;
    m.emissiveIntensity = 5 * blink;
  });
  return (
    <Placed s={s}>
      <Pillars top={8.6} material={steel} />
      <Truss span={PILLAR_X * 2 + 0.7} height={8.1} material={steel} />
      <mesh position={[0, 7.0, 0]} material={carbon}>
        <boxGeometry args={[0.35, 1.5, 9.2]} />
      </mesh>
      <LedScreen texture={art} size={[6.4, 0.8]} position={[-0.19, 7.15, -1.1]} rotation={[0, -Math.PI / 2, 0]} cols={256} rows={32} gain={2.0} />
      {/* Marshalling lights: the same three states as the start. */}
      {[-0.6, 0, 0.6].map((dz, i) => (
        <mesh key={i} ref={i === 0 ? led : undefined} position={[-0.2, 7.0, 3.1 + dz]} rotation={[0, 0, Math.PI / 2]} material={leds}>
          <cylinderGeometry args={[0.22, 0.22, 0.05, 24]} />
        </mesh>
      ))}
    </Placed>
  );
}

/* ── DRS board ────────────────────────────────────────────────── */
const DRS_GREEN = new THREE.Color("#1fe36a");
function DrsBoard({ s, steel }) {
  const art = useMemo(() => textArt("DRS", { w: 256, h: 128, font: `800 90px ${DISPLAY}`, color: "#ffffff" }), []);
  return (
    <Placed s={s}>
      <mesh position={[0, 2.6, -PILLAR_X]} material={steel}>
        <boxGeometry args={[0.16, 3.2, 0.16]} />
      </mesh>
      <LedScreen
        texture={art}
        size={[2.4, 1.2]}
        position={[-0.1, 3.9, -PILLAR_X + 0.9]}
        rotation={[0, -Math.PI / 2 + 0.3, 0]}
        cols={96}
        rows={48}
        gain={2.4}
        tint={DRS_GREEN}
      />
    </Placed>
  );
}

/* ── Chequered flags ──────────────────────────────────────────── */
function flagMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      uniform float uTime;
      varying vec2 vUv2;
      varying float vShade;
      void main() {
        vUv2 = uv;
        float pin = uv.x;                 /* 0 at the pole, 1 at the fly */
        float w = sin(uv.x * 7.0 - uTime * 6.0 + uv.y * 1.5) * 0.32 * pin
                + sin(uv.x * 13.0 - uTime * 9.0) * 0.08 * pin;
        vec3 p = position + vec3(0.0, 0.0, w);
        vShade = 0.72 + 0.28 * cos(uv.x * 7.0 - uTime * 6.0 + uv.y * 1.5);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      varying vec2 vUv2;
      varying float vShade;
      void main() {
        vec2 c = floor(vUv2 * vec2(8.0, 6.0));
        float chk = mod(c.x + c.y, 2.0);
        vec3 col = mix(vec3(0.03), vec3(1.1), chk) * vShade;
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }
    `,
  });
}

/* ── Fireworks over the line ──────────────────────────────────── */
const BURSTS = 7;
const PER_BURST = 220;
function Fireworks() {
  const { geometry, material } = useMemo(() => {
    const count = BURSTS * PER_BURST;
    const origin = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const meta = new Float32Array(count * 2); // delay, hue pick
    let seed = 3;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let b = 0; b < BURSTS; b++) {
      /* Behind the line (−x), low enough to sit in the finale shot,
         which faces back down the straight from beyond the flag. */
      const ox = -30 - r() * 60, oy = 18 + r() * 16, oz = (r() - 0.5) * 60;
      const delay = b * 0.42 + r() * 0.2;
      const hue = r();
      for (let i = 0; i < PER_BURST; i++) {
        const k = b * PER_BURST + i;
        origin.set([ox, oy, oz], k * 3);
        /* Uniform on a sphere, a little speed spread. */
        const u = r() * 2 - 1, th = r() * Math.PI * 2, sp = 14 + r() * 6;
        const q = Math.sqrt(1 - u * u);
        vel.set([q * Math.cos(th) * sp, u * sp, q * Math.sin(th) * sp], k * 3);
        meta.set([delay, hue], k * 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(origin, 3));
    geometry.setAttribute("aVel", new THREE.BufferAttribute(vel, 3));
    geometry.setAttribute("aMeta", new THREE.BufferAttribute(meta, 2));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: -1 }, uAccent: ACCENT, uPx: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute vec3 aVel;
        attribute vec2 aMeta;
        uniform float uT;
        uniform float uPx;
        varying float vLife;
        varying float vHue;
        void main() {
          float t = uT - aMeta.x;
          vLife = (t > 0.0) ? clamp(1.0 - t / 2.6, 0.0, 1.0) : 0.0;
          vHue = aMeta.y;
          float tt = max(t, 0.0);
          /* Drag on the burst, gravity on the fall. */
          vec3 p = position + aVel * (1.0 - exp(-tt * 1.6)) / 1.6 + vec3(0.0, -4.5 * tt * tt * 0.5, 0.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (vLife > 0.0 ? 2.4 + 3.0 * vLife : 0.0) * uPx * (120.0 / max(-mv.z, 1.0));
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uAccent;
        varying float vLife;
        varying float vHue;
        void main() {
          if (vLife <= 0.0) discard;
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          vec3 gold = vec3(1.0, 0.75, 0.3);
          vec3 col = vHue < 0.4 ? uAccent * 1.6 : vHue < 0.75 ? gold : vec3(1.0);
          gl_FragColor = vec4(col * a * vLife * 2.4, 1.0);
        }
      `,
    });
    return { geometry, material };
  }, []);
  const ref = useRef(null);
  useFrame((state) => {
    const since = lap.finishedAt >= 0 ? lap.time - lap.finishedAt : -1;
    const on = !lap.reduced && since >= 0 && since < 6;
    const points = ref.current;
    if (!points) return;
    points.visible = rig.warm || on;
    points.material.uniforms.uT.value = since;
    points.material.uniforms.uPx.value = state.viewport.dpr;
  });
  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} visible={false} />;
}

function FinishGantry({ steel, carbon }) {
  const flag = useMemo(() => flagMaterial(), []);
  const chequer = useMemo(
    () =>
      canvasTexture(1024, 64, (ctx, w, h) => {
        for (let x = 0; x < w / 32; x++) {
          for (let y = 0; y < h / 32; y++) {
            ctx.fillStyle = (x + y) % 2 ? "#0a0a0a" : "#f2f2f2";
            ctx.fillRect(x * 32, y * 32, 32, 32);
          }
        }
      }),
    []
  );
  const chequerMat = useMemo(() => new THREE.MeshStandardMaterial({ map: chequer, emissiveMap: chequer, emissive: "#ffffff", emissiveIntensity: 0.55, roughness: 0.5 }), [chequer]);
  const finishArt = useMemo(() => textArt("Finish", { w: 1024, h: 160, font: `800 112px ${DISPLAY}` }), []);
  const flagRef = useRef(null);
  useFrame((state) => {
    if (flagRef.current) flagRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <Placed s={S_FINISH}>
      <Pillars top={10.2} material={steel} />
      <mesh position={[0, 9.6, 0]} material={chequerMat}>
        <boxGeometry args={[1.0, 1.2, PILLAR_X * 2 + 0.7]} />
      </mesh>
      <mesh position={[0, 11.3, 0]} material={carbon}>
        <boxGeometry args={[0.4, 2.0, 11]} />
      </mesh>
      <LedScreen texture={finishArt} size={[10.4, 1.62]} position={[-0.21, 11.3, 0]} rotation={[0, -Math.PI / 2, 0]} cols={260} rows={40} gain={2.6} />
      {/* Flags on both pillars, flying back over the deck edge. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[0.2, 6.2, side * (PILLAR_X + 0.4)]} rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <mesh ref={side > 0 ? flagRef : undefined} position={[2.1, 0, 0]} material={flag}>
            <planeGeometry args={[4.2, 2.8, 28, 12]} />
          </mesh>
        </group>
      ))}
      <Fireworks />
    </Placed>
  );
}

export default function Gantries() {
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2c33", roughness: 0.35, metalness: 0.85, envMapIntensity: 0.9 }), []);
  const carbon = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0b0c0f", roughness: 0.55, metalness: 0.4, envMapIntensity: 0.6 }), []);
  return (
    <>
      <StartGantry steel={steel} carbon={carbon} />
      <SectorGantry s={S1_END} label="SECTOR 2" steel={steel} carbon={carbon} />
      <SectorGantry s={S2_END} label="SECTOR 3" steel={steel} carbon={carbon} />
      <DrsBoard s={1214} steel={steel} />
      <FinishGantry steel={steel} carbon={carbon} />
    </>
  );
}
