import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import themes from "../../themeRegistry.json";
import { ACCENT } from "./accent";
import { lap } from "./lapStore";
import { VERGE, sampleTrack } from "./trackLayout";
import { SECTIONS } from "./content";
import { smoothstep } from "./trackLayout";
import { INK, dronePose, holoMaterial, pill, powerAt, sectionPower, stepReveal } from "./holo";
import { rig } from "./rig";
import { BRAND, DISPLAY, MONO, SANS, canvasTexture, rng } from "./textures";

/* ══════════════════════════════════════════════════════════════
   SetPieces — one holographic installation per real feature,
   standing beside the stretch of track where its copy appears:

     T1        the code: a live editor typing a real snippet
     Esses     telemetry: the debrief, plus a 3D WPM skyline
     Hairpin   the podium: P1–P3 with the accuracy tie-break
     DRS       the championship: Elo gauge, streak heatmap, tower
     Banked    the garage: keyboard, themes, switch sounds, modes
     Chicane   scrutineering: a scanner gate the car drives through

   Panels are static canvas textures; everything that moves is a
   uniform, so nothing is redrawn or re-uploaded per frame.
   ══════════════════════════════════════════════════════════════ */

/* Each piece flies in formation with the car through its stretch of
   track (see dronePose in holo.js), on the far side from that
   stretch's copy panel: lateral − is the car's left. The scanner gate
   is the exception — it spans the road, and the car drives through it. */
const DRONES = {
  code: { section: "code", lead: 30, lateral: -20, height: 8.5, yaw: 0.3, scale: 0.92 },
  telemetry: { section: "telemetry", lead: 32, lateral: 16.5, height: 8.2, yaw: -0.3, scale: 0.78 },
  podium: { section: "podium", lead: 24, lateral: -16, height: 3.2, yaw: 0.35, scale: 1.05 },
  championship: { section: "championship", lead: 30, lateral: 18, height: 7.2, yaw: -0.25, scale: 0.8 },
  garage: { section: "garage", lead: 26, lateral: -18, height: 9.2, yaw: 0.3, scale: 0.85 },
  scrutineering: { section: "fairplay", lead: -26, lateral: -18, height: 6.5, yaw: 0, scale: 0.75 },
};
const GATE_S = 1692;
const GATE_GREEN = new THREE.Color(0.2, 1.4, 0.55);

const _level = new THREE.Vector3();

/* A set piece's carrier: flies in formation with the car while its
   stretch is on, and is switched off entirely otherwise. */
function Drone({ cfg, power, children }) {
  const ref = useRef(null);
  const heading = useRef(null); // the car's level heading, smoothed
  useFrame((state, dt) => {
    const group = ref.current;
    if (!group) return;
    group.visible = rig.warm || power.current > 0.003;
    if (!group.visible) return;
    const car = rig.car;
    _level.set(car.fwd.x, 0, car.fwd.z).normalize();
    /* Lag the heading a touch, so through a corner the piece swings
       round like something flying, not something bolted on. */
    if (!heading.current) heading.current = _level.clone();
    else heading.current.lerp(_level, 1 - Math.exp(-dt * 2.4)).normalize();
    dronePose(group, car.pos, heading.current, cfg, rig.cam.pos, state.clock.elapsedTime, rig.wide);
  });
  return (
    <group ref={ref} scale={cfg.scale} visible={false}>
      {children}
    </group>
  );
}

/* A stretch's power (0–1), kept in a ref every frame. On a phone in
   portrait there is no room for a hologram beside the car and the
   copy, so the drones stand down there. */
function usePower(sectionId) {
  const range = useMemo(() => SECTIONS.find((s) => s.id === sectionId).at, [sectionId]);
  const power = useRef(0);
  useFrame(() => {
    power.current = sectionPower(range) * smoothstep(0.2, 0.45, rig.wide);
  });
  return power;
}

/* A static hologram panel. */
function Panel({ texture, width, height, power, position = [0, 0, 0], rotation, material: given, meshRef }) {
  const material = useMemo(() => given ?? holoMaterial(texture, width / height), [given, texture, width, height]);
  const local = useRef(null);
  const ref = meshRef ?? local;
  useFrame((state, dt) => {
    if (ref.current) stepReveal(ref.current.material, power.current, dt, state.clock.elapsedTime);
  });
  return (
    <mesh ref={ref} position={position} rotation={rotation} material={material} renderOrder={3}>
      <planeGeometry args={[width, height]} />
    </mesh>
  );
}

/* The projector a panel floats over: a plinth and a beam. */
function Projector({ y, width, power }) {
  const beam = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uAccent: ACCENT, uPower: { value: 0 }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uAccent;
          uniform float uPower;
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            float a = pow(vUv.y, 1.5) * (0.6 + 0.4 * sin(vUv.x * 60.0 + uTime * 3.0)) * 0.16 * uPower;
            gl_FragColor = vec4(uAccent * a, 1.0);
          }
        `,
      }),
    []
  );
  const base = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0d0e13", roughness: 0.35, metalness: 0.8, emissive: "#000", envMapIntensity: 0.6 }), []);
  const beamRef = useRef(null);
  const baseRef = useRef(null);
  useFrame((state) => {
    const u = beamRef.current?.material.uniforms;
    if (u) {
      u.uPower.value = power.current;
      u.uTime.value = state.clock.elapsedTime;
    }
    baseRef.current?.material.emissive.copy(ACCENT.value).multiplyScalar(0.6 * power.current);
  });
  return (
    <group position={[0, y, 0]}>
      <mesh ref={baseRef} position={[0, -0.4, 0]} material={base}>
        <boxGeometry args={[width * 0.55, 0.5, 1.4]} />
      </mesh>
      {/* Open-ended, flared: light spreading up into the panel. */}
      <mesh ref={beamRef} position={[0, 2.2, 0]} material={beam} renderOrder={4}>
        <cylinderGeometry args={[width * 0.48, width * 0.24, 4.4, 4, 1, true]} />
      </mesh>
    </group>
  );
}

/* Floating label chips (sprites always face the camera). */
function chipTexture(text, colour = "#ffffff") {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 4;
    pill(ctx, 6, 18, w - 12, h - 36, 46, "rgba(10,12,20,0.78)", colour);
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 38px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
}

function Chips({ items, power, radius = 13, height = 9, spin = 0.08 }) {
  const sprites = useMemo(
    () =>
      items.map((t, i) => ({
        material: new THREE.SpriteMaterial({ map: chipTexture(t.text, t.colour), transparent: true, depthWrite: false, opacity: 0 }),
        a: (i / items.length) * Math.PI * 2,
        y: ((i * 7) % items.length) / items.length,
        w: Math.max(3.4, t.text.length * 0.42),
      })),
    [items]
  );
  const refs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    sprites.forEach((sp, i) => {
      const el = refs.current[i];
      if (!el) return;
      const a = sp.a + t * spin * (lap.reduced ? 0 : 1);
      el.position.set(Math.cos(a) * radius, -height / 2 + sp.y * height + Math.sin(t * 0.8 + i) * 0.3, 2.5 + Math.sin(a) * 4);
      el.material.opacity = power.current * 0.95;
    });
  });
  return sprites.map((sp, i) => (
    <sprite key={i} ref={(el) => (refs.current[i] = el)} material={sp.material} scale={[sp.w, sp.w / 4, 1]} />
  ));
}

/* ══ T1 — The code ════════════════════════════════════════════
   A real snippet from the library ("House Robber DP", Python),
   typed out character by character. The typing is a uniform: the
   panel is drawn once, alongside an index map whose red channel
   holds each character's position in the snippet and green its x
   within the cell, so the shader can dim what is still untyped
   and draw the caret on the next character. */
const SNIPPET = [
  "def rob(houses):",
  "    prev, curr = 0, 0",
  "    for money in houses:",
  "        prev, curr = curr, max(curr, prev + money)",
  "    return curr",
];
const PY_KEYWORDS = new Set(["def", "for", "in", "return"]);
const PY_BUILTINS = new Set(["max"]);
const SYNTAX = { kw: "#c792ea", fn: "#7cb7ff", builtin: "#5fd7d3", num: "#f5a76a", ident: "#e8ebf2", punct: "#98a2b8" };

function tokenize(line) {
  const out = [];
  const re = /(\s+)|([A-Za-z_]\w*)|(\d+)|(.)/g;
  let m;
  let prev = "";
  while ((m = re.exec(line))) {
    const [t, ws, word, num] = m;
    let kind = "punct";
    if (ws) kind = "ws";
    else if (word) kind = PY_KEYWORDS.has(word) ? "kw" : PY_BUILTINS.has(word) ? "builtin" : prev === "def" ? "fn" : "ident";
    else if (num) kind = "num";
    out.push([t, kind]);
    if (!ws) prev = t;
  }
  return out;
}

function codeTextures() {
  const W = 1600, H = 900;
  const FONT = `500 46px ${MONO}`;
  const X0 = 150, Y0 = 200, LH = 88;
  let total = 0;
  const ink = canvasTexture(W, H, (ctx) => {
    ctx.clearRect(0, 0, W, H);
    /* Window chrome. */
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(56 + i * 38, 52, 11, 0, Math.PI * 2);
      ctx.fill();
    });
    pill(ctx, 190, 22, 330, 60, 12, "rgba(255,255,255,0.07)");
    ctx.fillStyle = INK.text;
    ctx.font = `600 28px ${MONO}`;
    ctx.textBaseline = "middle";
    ctx.fillText("house_robber.py", 216, 53);
    ctx.textAlign = "right";
    ctx.fillStyle = INK.muted;
    ctx.font = `500 26px ${DISPLAY}`;
    ctx.fillText("Python  ·  DP  ·  short", W - 50, 53);
    ctx.textAlign = "left";
    ctx.fillStyle = "#e10600";
    ctx.fillRect(0, 100, W, 3);
    /* Code. */
    ctx.font = FONT;
    ctx.textBaseline = "alphabetic";
    const cw = ctx.measureText("M").width;
    SNIPPET.forEach((line, row) => {
      const y = Y0 + row * LH;
      ctx.fillStyle = INK.faint;
      ctx.textAlign = "right";
      ctx.fillText(String(row + 1), X0 - 40, y);
      ctx.textAlign = "left";
      let col = 0;
      for (const [t, kind] of tokenize(line)) {
        if (kind !== "ws") {
          ctx.fillStyle = SYNTAX[kind];
          ctx.fillText(t, X0 + col * cw, y);
        }
        col += t.length;
      }
    });
    /* Status bar. */
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, H - 82, W, 82);
    ctx.fillStyle = INK.green;
    ctx.beginPath();
    ctx.arc(54, H - 41, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `600 26px ${MONO}`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK.text;
    ctx.fillText("LIVE    WPM 118    ACC 99.2%    GHOST −0.41s", 80, H - 40);
    ctx.textAlign = "right";
    ctx.fillStyle = INK.muted;
    ctx.font = `500 26px ${DISPLAY}`;
    ctx.fillText("Auto-indent on", W - 50, H - 40);
  });

  const index = canvasTexture(
    W,
    H,
    (ctx) => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      ctx.font = FONT;
      const cw = ctx.measureText("M").width;
      let idx = 0;
      SNIPPET.forEach((line, row) => {
        const top = Y0 + row * LH - LH * 0.62;
        for (let c = 0; c < line.length; c++) {
          idx += 1;
          const x = X0 + c * cw;
          const g = ctx.createLinearGradient(x, 0, x + cw, 0);
          g.addColorStop(0, `rgb(${idx},0,0)`);
          g.addColorStop(1, `rgb(${idx},255,0)`);
          ctx.fillStyle = g;
          ctx.fillRect(Math.floor(x), top, Math.ceil(cw), LH * 0.8);
        }
      });
      total = idx;
    },
    { srgb: false, anisotropy: 1 }
  );
  index.magFilter = index.minFilter = THREE.NearestFilter;
  index.generateMipmaps = false;
  return { ink, index, total, aspect: W / H };
}

function CodeSet() {
  const cfg = DRONES.code;
  const power = usePower(cfg.section);
  const { material, total } = useMemo(() => {
    const { ink, index, total, aspect } = codeTextures();
    const material = holoMaterial(
      ink,
      aspect,
      { uIndex: { value: index }, uTyped: { value: 0 } },
      {
        head: "uniform sampler2D uIndex;\nuniform float uTyped;",
        main: /* glsl */ `
          vec4 ix = texture2D(uIndex, vUv);
          float idx = floor(ix.r * 255.0 + 0.5);
          float isCode = step(0.5, idx);
          float typed = step(idx, uTyped + 0.5);
          vec3 inkCol = mix(ink.rgb, mix(vec3(0.22, 0.25, 0.32), ink.rgb, typed), isCode);
          float next = isCode * (1.0 - step(0.5, abs(idx - (uTyped + 1.0))));
          float caret = next * step(ix.g, 0.13);
          vec3 col = mix(base.rgb, inkCol * 1.3, ink.a);
          col += uAccent * next * 0.18;
          col = mix(col, uAccent * 2.4, caret);
          float alpha = max(base.a, max(ink.a, caret));
        `,
      }
    );
    return { material, total };
  }, []);
  const panelRef = useRef(null);
  useFrame((state) => {
    /* ~13 characters a second, a beat at the end, then again. */
    const typed = panelRef.current?.material.uniforms.uTyped;
    if (!typed) return;
    const phase = (state.clock.elapsedTime * 13) % (total + 30);
    typed.value = Math.min(total, Math.floor(phase));
  });
  const chips = useMemo(
    () => [
      { text: "C++ · 174", colour: "#7cb7ff" },
      { text: "PYTHON · 170", colour: "#ffd23f" },
      { text: "JAVASCRIPT · 170", colour: "#f5d76a" },
      { text: "DP", colour: "#e10600" },
      { text: "GRAPHS", colour: "#e10600" },
      { text: "TREES", colour: "#e10600" },
      { text: "ASYNC", colour: "#e10600" },
      { text: "HEAPS", colour: "#e10600" },
      { text: "BITS", colour: "#e10600" },
      { text: "STRINGS", colour: "#e10600" },
      { text: "19 TOPICS", colour: "#ffffff" },
    ],
    []
  );
  return (
    <Drone cfg={cfg} power={power}>
      <Panel material={material} width={20} height={11.25} power={power} meshRef={panelRef} />
      <Projector y={-6.4} width={20} power={power} />
      <Chips items={chips} power={power} radius={15} height={12} />
    </Drone>
  );
}

/* ══ Esses — Telemetry ═══════════════════════════════════════ */
const TRACE = Array.from({ length: 64 }, (_, i) => {
  const t = i / 63;
  return 104 + 18 * Math.sin(t * 5.2) + 9 * Math.sin(t * 13.7 + 1.3) + 14 * t + (i % 7 === 3 ? -6 : 0);
});

function telemetryTexture() {
  const W = 1600, H = 860;
  return canvasTexture(W, H, (ctx) => {
    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = "middle";
    ctx.font = `700 36px ${DISPLAY}`;
    ctx.fillStyle = INK.text;
    ctx.fillText("Lap telemetry", 60, 64);
    ctx.textAlign = "right";
    ctx.fillStyle = INK.faint;
    ctx.fillText("house_robber.py  ·  PYTHON", W - 60, 64);
    ctx.textAlign = "left";

    const stats = [
      ["WPM", "124", ""],
      ["Accuracy", "98.7", "%"],
      ["Peak", "141", "wpm"],
    ];
    stats.forEach(([label, value, unit], i) => {
      const x = 60 + i * 520;
      ctx.fillStyle = INK.muted;
      ctx.font = `600 28px ${DISPLAY}`;
      ctx.fillText(label, x, 136);
      ctx.fillStyle = INK.white;
      ctx.font = `700 112px ${MONO}`;
      ctx.fillText(value, x - 6, 230);
      const w = ctx.measureText(value).width;
      ctx.fillStyle = INK.muted;
      ctx.font = `600 34px ${MONO}`;
      ctx.fillText(unit, x + w + 8, 252);
    });

    /* Sector splits in timing-screen colours. */
    const sectors = [
      ["S1", "17.912", INK.purple],
      ["S2", "21.405", INK.green],
      ["S3", "19.840", INK.yellow],
    ];
    sectors.forEach(([label, time, colour], i) => {
      const x = 60 + i * 505;
      ctx.lineWidth = 3;
      pill(ctx, x, 318, 470, 84, 14, colour + "2e", colour);
      ctx.fillStyle = colour;
      ctx.font = `700 34px ${DISPLAY}`;
      ctx.fillText(label, x + 26, 361);
      ctx.fillStyle = INK.white;
      ctx.textAlign = "right";
      ctx.font = `700 40px ${MONO}`;
      ctx.fillText(time, x + 446, 361);
      ctx.textAlign = "left";
    });

    /* The WPM trace. */
    const gx = 60, gy = 460, gw = W - 120, gh = 330;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    [60, 100, 140].forEach((v) => {
      const y = gy + gh - ((v - 50) / 110) * gh;
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx + gw, y);
      ctx.stroke();
      ctx.fillStyle = INK.faint;
      ctx.font = `500 22px ${MONO}`;
      ctx.fillText(String(v), gx + gw - 44, y - 16);
    });
    ctx.setLineDash([10, 10]);
    [1, 2].forEach((k) => {
      const x = gx + (gw * k) / 3;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x, gy + gh);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    const px = (i) => gx + (i / (TRACE.length - 1)) * gw;
    const py = (v) => gy + gh - ((v - 50) / 110) * gh;
    const grad = ctx.createLinearGradient(0, gy, 0, gy + gh);
    grad.addColorStop(0, "rgba(225,6,0,0.42)");
    grad.addColorStop(1, "rgba(225,6,0,0)");
    ctx.beginPath();
    ctx.moveTo(px(0), gy + gh);
    TRACE.forEach((v, i) => ctx.lineTo(px(i), py(v)));
    ctx.lineTo(px(TRACE.length - 1), gy + gh);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    TRACE.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))));
    ctx.strokeStyle = "#ff3b30";
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.stroke();
    /* Two mistakes, marked where they happened. */
    [17, 45].forEach((i) => {
      const x = px(i), y = py(TRACE[i]) - 34;
      ctx.strokeStyle = INK.red;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 10);
      ctx.lineTo(x + 10, y + 10);
      ctx.moveTo(x + 10, y - 10);
      ctx.lineTo(x - 10, y + 10);
      ctx.stroke();
    });
    ["S1", "S2", "S3"].forEach((s, k) => {
      ctx.fillStyle = INK.muted;
      ctx.font = `600 24px ${DISPLAY}`;
      ctx.fillText(s, gx + (gw * k) / 3 + 14, gy + 20);
    });
  });
}

function WpmSkyline({ power }) {
  const ref = useRef(null);
  const count = 32;
  const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const colours = useMemo(() => {
    const out = [];
    const white = new THREE.Color(1.8, 1.8, 1.8);
    for (let i = 0; i < count; i++) {
      const v = TRACE[Math.round((i / (count - 1)) * (TRACE.length - 1))];
      out.push(((v - 80) / 70));
    }
    return { levels: out, white };
  }, []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const c = useMemo(() => new THREE.Color(), []);
  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const p = power.current;
    for (let i = 0; i < count; i++) {
      const lv = THREE.MathUtils.clamp(colours.levels[i], 0.1, 1);
      const grow = THREE.MathUtils.clamp(p * 1.6 - (i / count) * 0.6, 0, 1);
      const pulse = lap.reduced ? 0 : 0.08 * Math.sin(state.clock.elapsedTime * 3 + i * 0.5);
      const h = Math.max(0.02, (0.4 + lv * 4.2 + pulse) * grow);
      m.makeScale(0.42, h, 0.42).setPosition(-8.4 + i * 0.54, -10 + h / 2, 2.2);
      mesh.setMatrixAt(i, m);
      c.copy(ACCENT.value).multiplyScalar(1.2 + lv * 1.6).lerp(colours.white, lv > 0.85 ? 0.5 : 0);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} material={material} frustumCulled={false}>
      <boxGeometry />
    </instancedMesh>
  );
}

function TelemetrySet() {
  const cfg = DRONES.telemetry;
  const power = usePower(cfg.section);
  const texture = useMemo(() => telemetryTexture(), []);
  return (
    <Drone cfg={cfg} power={power}>
      <Panel texture={texture} width={18} height={9.68} power={power} />
      {/* The trace again, in 3D: a skyline of the lap's WPM under the panel. */}
      <WpmSkyline power={power} />
      <mesh position={[0, -10.15, 2.2]}>
        <boxGeometry args={[18, 0.3, 1.4]} />
        <meshStandardMaterial color="#0d0e13" roughness={0.35} metalness={0.8} />
      </mesh>
    </Drone>
  );
}

/* ══ Hairpin — the podium ════════════════════════════════════
   Every snippet has its own top three. P2 and P3 are level on WPM
   here on purpose: the tie is settled on accuracy, as on the site. */
const PODIUM = [
  { place: 2, x: -3.5, h: 2.3, colour: INK.silver, wpm: "139", acc: "98.7%" },
  { place: 1, x: 0, h: 3.3, colour: INK.gold, wpm: "142", acc: "99.1%" },
  { place: 3, x: 3.5, h: 1.6, colour: INK.bronze, wpm: "139", acc: "97.2%" },
];

function podiumCardTexture({ place, colour, wpm, acc }) {
  return canvasTexture(640, 320, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.textBaseline = "middle";
    ctx.fillStyle = colour;
    ctx.font = `800 120px ${DISPLAY}`;
    ctx.fillText(`P${place}`, 34, 118);
    ctx.fillStyle = INK.white;
    ctx.font = `700 64px ${MONO}`;
    ctx.fillText(`${wpm} WPM`, 40, 236);
    ctx.fillStyle = INK.muted;
    ctx.font = `600 40px ${MONO}`;
    ctx.textAlign = "right";
    ctx.fillText(acc, w - 40, 236);
  });
}

function youCardTexture() {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK.muted;
    ctx.font = `700 38px ${DISPLAY}`;
    ctx.fillText("Your standing", 40, 62);
    ctx.fillStyle = INK.white;
    ctx.font = `800 84px ${DISPLAY}`;
    ctx.fillText("P7", 40, 168);
    ctx.font = `700 44px ${DISPLAY}`;
    ctx.fillStyle = "#ff5a50";
    ctx.fillText("+3 WPM to the podium", 190, 172);
  });
}

function numeralTexture(n, colour) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = colour;
    ctx.font = `800 190px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n), w / 2, h / 2 + 10);
  });
}

function Confetti({ power }) {
  const { geometry, material } = useMemo(() => {
    const n = 360;
    const g = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(0.16, 0.26));
    const seed = new Float32Array(n * 4);
    const rand = rng(11);
    for (let i = 0; i < n; i++) seed.set([rand(), rand(), rand(), rand()], i * 4);
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 4));
    g.instanceCount = n;
    const m = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uPower: { value: 0 }, uAccent: ACCENT },
      vertexShader: /* glsl */ `
        attribute vec4 aSeed;
        uniform float uTime;
        varying vec3 vCol;
        varying float vShade;
        void main() {
          float fall = mod(aSeed.y * 14.0 + uTime * (0.9 + aSeed.z * 0.8), 14.0);
          float a = aSeed.x * 6.2831;
          float r = 2.0 + aSeed.w * 7.5;
          vec3 c = vec3(cos(a) * r + sin(uTime + aSeed.z * 9.0) * 0.6, 13.0 - fall, sin(a) * r);
          float spin = uTime * (2.0 + aSeed.z * 4.0) + aSeed.w * 6.0;
          vec3 p = position;
          p.xy = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * p.xy;
          p.yz = mat2(cos(spin * 0.7), -sin(spin * 0.7), sin(spin * 0.7), cos(spin * 0.7)) * p.yz;
          vShade = 0.55 + 0.45 * abs(cos(spin));
          vCol = aSeed.x < 0.33 ? vec3(1.0, 0.82, 0.42) : aSeed.x < 0.66 ? vec3(0.95) : vec3(-1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(c + p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uAccent;
        uniform float uPower;
        varying vec3 vCol;
        varying float vShade;
        void main() {
          vec3 col = vCol.x < 0.0 ? uAccent * 1.4 : vCol;
          gl_FragColor = vec4(col * vShade * 1.2, uPower);
        }
      `,
    });
    return { geometry: g, material: m };
  }, []);
  const ref = useRef(null);
  useFrame((state) => {
    const u = ref.current?.material.uniforms;
    if (!u) return;
    u.uTime.value = lap.reduced ? 0 : state.clock.elapsedTime;
    u.uPower.value = power.current;
  });
  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={4} />;
}

function PodiumSet() {
  const cfg = DRONES.podium;
  const power = usePower(cfg.section);
  const block = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0c0d12", roughness: 0.22, metalness: 0.65, envMapIntensity: 1.1 }), []);
  const deck = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0a0b0f", roughness: 0.3, metalness: 0.7, envMapIntensity: 0.8 }), []);
  const rim = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const parts = useMemo(
    () =>
      PODIUM.map((p) => ({
        ...p,
        card: holoMaterial(podiumCardTexture(p), 2),
        numeral: new THREE.MeshBasicMaterial({ map: numeralTexture(p.place, p.colour), transparent: true, depthWrite: false, toneMapped: false }),
        edge: new THREE.MeshBasicMaterial({ color: new THREE.Color(p.colour).multiplyScalar(3), toneMapped: false }),
        beam: new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          uniforms: { uColour: { value: new THREE.Color(p.colour) }, uPower: { value: 0 } },
          vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
          fragmentShader:
            "uniform vec3 uColour; uniform float uPower; varying vec2 vUv; void main(){ float a = pow(1.0 - vUv.y, 1.4) * 0.22 * uPower; gl_FragColor = vec4(uColour * a, 1.0); }",
        }),
      })),
    []
  );
  const you = useMemo(() => holoMaterial(youCardTexture(), 4), []);
  useFrame((state, dt) => {
    rim.color.copy(ACCENT.value).multiplyScalar(2.2 * power.current);
    parts.forEach((p) => {
      stepReveal(p.card, power.current, dt, state.clock.elapsedTime);
      p.beam.uniforms.uPower.value = power.current;
    });
    stepReveal(you, power.current, dt, state.clock.elapsedTime);
  });
  return (
    <Drone cfg={cfg} power={power}>
      <mesh position={[0, -0.25, 0]} material={deck}>
        <cylinderGeometry args={[9.5, 9.8, 0.5, 64]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={rim}>
        <ringGeometry args={[9.3, 9.55, 96]} />
      </mesh>
      {parts.map((p) => (
        <group key={p.place} position={[p.x, 0, 0]}>
          <mesh position={[0, p.h / 2, 0]} material={block}>
            <boxGeometry args={[3.2, p.h, 3]} />
          </mesh>
          <mesh position={[0, p.h + 0.02, 1.45]} material={p.edge}>
            <boxGeometry args={[3.2, 0.06, 0.08]} />
          </mesh>
          <mesh position={[0, p.h / 2, 1.51]} material={p.numeral}>
            <planeGeometry args={[Math.min(2.2, p.h * 0.9), Math.min(2.2, p.h * 0.9)]} />
          </mesh>
          <mesh position={[0, p.h + 9, 0]} material={p.beam} renderOrder={4}>
            <cylinderGeometry args={[1.0, 1.7, 18, 24, 1, true]} />
          </mesh>
          <mesh position={[0, p.h + 2.3, 0.4]} material={p.card} renderOrder={5}>
            <planeGeometry args={[3.6, 1.8]} />
          </mesh>
        </group>
      ))}
      <mesh position={[8.6, 2.2, 2.4]} rotation={[0, -0.35, 0]} material={you} renderOrder={5}>
        <planeGeometry args={[6.4, 1.6]} />
      </mesh>
      <Confetti power={power} />
    </Drone>
  );
}

/* ══ DRS straight — the championship ═════════════════════════ */
const HEAT_COLS = 20;
const HEAT_ROWS = 7;
const STREAK = 12;

function heatLevel(i) {
  /* Column-major like a contribution graph; the last STREAK days are
     the current streak, all at or over the daily goal. */
  const fromEnd = HEAT_COLS * HEAT_ROWS - 1 - i;
  if (fromEnd < STREAK) return 0.65 + ((i * 37) % 7) / 20;
  const r = (Math.sin(i * 91.7) * 43758.5453) % 1;
  const v = Math.abs(r);
  return v < 0.35 ? 0 : v < 0.6 ? 0.25 : v < 0.85 ? 0.5 : 0.8;
}

function Heatmap({ power }) {
  const ref = useRef(null);
  const n = HEAT_COLS * HEAT_ROWS;
  const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const c = useMemo(() => new THREE.Color(), []);
  const dim = useMemo(() => new THREE.Color(0.035, 0.04, 0.055), []);
  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const p = power.current;
    for (let i = 0; i < n; i++) {
      const col = Math.floor(i / HEAT_ROWS), row = i % HEAT_ROWS;
      const lv = heatLevel(i);
      const grow = THREE.MathUtils.clamp(p * 1.8 - (col / HEAT_COLS) * 0.8, 0, 1);
      const isStreak = n - 1 - i < STREAK;
      const throb = isStreak && !lap.reduced ? 0.12 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 4 - col)) : 0;
      const h = 0.12 + (lv * 1.6 + throb) * grow;
      m.makeScale(0.62, h, 0.62).setPosition(-8.6 + col * 0.82, h / 2, -2.6 + row * 0.82);
      mesh.setMatrixAt(i, m);
      c.copy(dim).lerp(ACCENT.value, Math.min(1, lv * 1.1)).multiplyScalar(lv > 0 ? 1 + lv * 1.8 + throb * 4 : 1);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return (
    <group position={[-2.5, -4.6, 1.5]} rotation={[0.42, 0, 0]}>
      <mesh position={[-0.81, -0.12, 0]}>
        <boxGeometry args={[17.6, 0.2, 6.6]} />
        <meshStandardMaterial color="#0b0c10" roughness={0.3} metalness={0.7} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, n]} material={material} frustumCulled={false}>
        <boxGeometry />
      </instancedMesh>
    </group>
  );
}

function EloGauge({ power }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uAccent: ACCENT, uFill: { value: 0 }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vP;
          void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uAccent;
          uniform float uFill;
          uniform float uTime;
          varying vec3 vP;
          void main() {
            /* 270° gauge opening at the bottom; angle 0 at bottom-left. */
            float a = atan(vP.y, vP.x);
            float t = mod(-a + 3.92699, 6.28318) / 4.71239;
            if (t > 1.0) discard;
            float on = step(t, uFill);
            float tick = step(0.94, fract(t * 20.0));
            vec3 col = mix(vec3(0.05, 0.055, 0.075) + tick * 0.06, uAccent * (1.6 + 0.6 * sin(uTime * 3.0 - t * 12.0)), on);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    []
  );
  const label = useMemo(
    () =>
      holoMaterial(
        canvasTexture(640, 640, (ctx, w) => {
          ctx.clearRect(0, 0, w, w);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = INK.muted;
          ctx.font = `700 48px ${DISPLAY}`;
          ctx.fillText("Elo", w / 2, 186);
          ctx.fillStyle = INK.white;
          ctx.font = `800 150px ${DISPLAY}`;
          ctx.fillText("1648", w / 2, 318);
          ctx.fillStyle = INK.green;
          ctx.font = `700 48px ${MONO}`;
          ctx.fillText("▲ 24", w / 2, 440);
          ctx.fillStyle = INK.faint;
          ctx.font = `500 32px ${DISPLAY}`;
          ctx.fillText("vs the field", w / 2, 506);
        }),
        1,
        {},
        { main: "vec3 col = ink.rgb * 1.25; float alpha = ink.a;" }
      ),
    []
  );
  const ring = useRef(null);
  const face = useRef(null);
  useFrame((state, dt) => {
    const u = ring.current?.material.uniforms;
    if (u) {
      const target = 0.72 * power.current;
      u.uFill.value += (target - u.uFill.value) * Math.min(1, dt * 2);
      u.uTime.value = state.clock.elapsedTime;
    }
    if (face.current) stepReveal(face.current.material, power.current, dt, state.clock.elapsedTime);
  });
  return (
    <group position={[-13.5, 1.2, 0.5]}>
      <mesh ref={ring} material={material}>
        <torusGeometry args={[3.4, 0.24, 16, 120]} />
      </mesh>
      <mesh ref={face} material={label} renderOrder={5}>
        <planeGeometry args={[5.2, 5.2]} />
      </mesh>
    </group>
  );
}

function standingsTexture() {
  return canvasTexture(560, 1120, (ctx, w) => {
    ctx.clearRect(0, 0, w, 1120);
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK.muted;
    ctx.font = `700 36px ${DISPLAY}`;
    ctx.fillText("Global standings", 36, 58);
    const rows = [1932, 1871, 1804, 1760, 1648, 1611, 1574, 1530];
    rows.forEach((elo, i) => {
      const y = 140 + i * 118;
      const isYou = i === 4;
      pill(ctx, 20, y - 46, w - 40, 92, 12, isYou ? "rgba(225,6,0,0.28)" : "rgba(255,255,255,0.045)", isYou ? "#e10600" : null);
      ctx.fillStyle = i < 3 ? [INK.gold, INK.silver, INK.bronze][i] : INK.white;
      ctx.font = `800 38px ${DISPLAY}`;
      ctx.fillText(`P${i + 1}`, 44, y);
      ctx.fillStyle = isYou ? "#ffffff" : INK.faint;
      ctx.fillRect(140, y - 18, 10, 36);
      ctx.font = isYou ? `700 38px ${DISPLAY}` : `600 30px ${MONO}`;
      ctx.fillStyle = isYou ? "#ffffff" : INK.muted;
      ctx.fillText(isYou ? "You" : "· · · · ·", 168, y);
      ctx.textAlign = "right";
      ctx.fillStyle = INK.white;
      ctx.font = `700 40px ${MONO}`;
      ctx.fillText(String(elo), w - 44, y);
      ctx.textAlign = "left";
    });
  });
}

function streakTexture() {
  return canvasTexture(1400, 220, (ctx, w) => {
    ctx.clearRect(0, 0, w, 220);
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK.white;
    ctx.font = `800 70px ${DISPLAY}`;
    ctx.fillText(`${STREAK}-day streak`, 40, 80);
    ctx.fillStyle = INK.green;
    ctx.font = `600 40px ${DISPLAY}`;
    ctx.fillText("✓ Daily goal · 15 min", 40, 168);
    ctx.textAlign = "right";
    ctx.fillStyle = INK.muted;
    ctx.fillText("Your timezone", w - 40, 168);
  });
}

function ChampionshipSet() {
  const cfg = DRONES.championship;
  const power = usePower(cfg.section);
  const tower = useMemo(() => standingsTexture(), []);
  const streak = useMemo(() => streakTexture(), []);
  return (
    <Drone cfg={cfg} power={power}>
      <Panel texture={tower} width={6} height={12} power={power} position={[10.5, 1, 0]} rotation={[0, -0.25, 0]} />
      <Panel texture={streak} width={14} height={2.2} power={power} position={[-3.3, 1.6, 0.6]} />
      <EloGauge power={power} />
      <Heatmap power={power} />
      <Projector y={-6.4} width={22} power={power} />
    </Drone>
  );
}

/* ══ Banked turn — the garage ═════════════════════════════════
   A keyboard that types the snippet's first line with the next key
   lit (the typing page's on-screen keyboard), the fifteen real
   theme accents in orbit, and twelve switch sounds as a meter. */
const ROWS = [
  [["`"], ["1"], ["2"], ["3"], ["4"], ["5"], ["6"], ["7"], ["8"], ["9"], ["0"], ["-"], ["="], ["⌫", 2]],
  [["TAB", 1.5], ["Q"], ["W"], ["E"], ["R"], ["T"], ["Y"], ["U"], ["I"], ["O"], ["P"], ["["], ["]"], ["\\", 1.5]],
  [["CAPS", 1.75], ["A"], ["S"], ["D"], ["F"], ["G"], ["H"], ["J"], ["K"], ["L"], [";"], ["'"], ["↵", 2.25]],
  [["SHIFT", 2.25], ["Z"], ["X"], ["C"], ["V"], ["B"], ["N"], ["M"], [","], ["."], ["/"], ["SHIFT", 2.75]],
  [["", 6.25, 3.75]],
];
const KEY_OF = { " ": "", "(": "9", ")": "0", ":": ";" };
const SHIFTED = new Set(["(", ")", ":"]);
const TYPE_LINE = "def rob(houses):";

function keyboardLayout() {
  const keys = [];
  ROWS.forEach((row, r) => {
    let x = r === 4 ? 3.75 : 0;
    row.forEach(([label, w = 1]) => {
      keys.push({ label, w, x: x + w / 2, z: r });
      x += w;
    });
  });
  return keys;
}

function legendAtlas(keys) {
  const tex = canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    keys.forEach((k, i) => {
      const cx = (i % 8) * 128 + 64, cy = Math.floor(i / 8) * 128 + 64;
      ctx.save();
      ctx.translate(cx, cy);
      /* The top face stretches the cell across the key's width;
         pre-squeeze wide legends so they land at the right shape. */
      ctx.scale(1 / k.w, 1);
      ctx.font = k.label.length > 1 ? `700 34px ${MONO}` : `700 64px ${MONO}`;
      ctx.fillText(k.label, 0, 2);
      ctx.restore();
    });
  }, { srgb: false, anisotropy: 8 });
  return tex;
}

/* One frame of the typing loop: keys fade back up, the current
   keystroke (and shift, for punctuation) goes down, and the next key
   to press lights white. Returns the step being typed, or −1 while
   the loop pauses between runs. */
function typeKeys(glow, next, sequence, t, dt) {
  const RATE = 7;
  const phase = (t * RATE) % (sequence.length + 8);
  const step = Math.floor(phase);
  const g = glow.array, nx = next.array;
  for (let i = 0; i < g.length; i++) {
    g[i] = Math.max(0, g[i] - dt * 5);
    nx[i] = 0;
  }
  if (step < sequence.length) {
    const cur = sequence[step];
    const press = phase - step < 0.5 ? 1 : 0;
    if (cur.key >= 0) g[cur.key] = Math.max(g[cur.key], press);
    if (cur.shift >= 0) g[cur.shift] = Math.max(g[cur.shift], press);
    const nxt = sequence[step + 1];
    if (nxt && nxt.key >= 0) nx[nxt.key] = 1;
  }
  glow.needsUpdate = true;
  next.needsUpdate = true;
  return step < sequence.length ? step : -1;
}

function Keyboard({ onPress }) {
  const keys = useMemo(() => keyboardLayout(), []);
  const ref = useRef(null);
  const { material, glow, next } = useMemo(() => {
    const atlas = legendAtlas(keys);
    const glow = new THREE.InstancedBufferAttribute(new Float32Array(keys.length), 1).setUsage(THREE.DynamicDrawUsage);
    const next = new THREE.InstancedBufferAttribute(new Float32Array(keys.length), 1).setUsage(THREE.DynamicDrawUsage);
    const m = new THREE.MeshStandardMaterial({ color: "#17181e", roughness: 0.45, metalness: 0.2, envMapIntensity: 0.7 });
    m.customProgramCacheKey = () => "cc-landing-keycaps";
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uAtlas = { value: atlas };
      shader.uniforms.uAccent = ACCENT;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nattribute float aGlow;\nattribute float aNext;\nvarying float vGlow;\nvarying float vNext;\nvarying float vTop;\nvarying vec2 vKeyUv;\nvarying float vIdx;"
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ntransformed.y -= aGlow * 0.32;\nvGlow = aGlow;\nvNext = aNext;\nvTop = step(0.5, normal.y);\nvKeyUv = uv;\nvIdx = float(gl_InstanceID);"
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform sampler2D uAtlas;\nuniform vec3 uAccent;\nvarying float vGlow;\nvarying float vNext;\nvarying float vTop;\nvarying vec2 vKeyUv;\nvarying float vIdx;"
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
           float id = floor(vIdx + 0.5);
           vec2 cell = vec2(mod(id, 8.0), floor(id / 8.0));
           float legend = texture2D(uAtlas, vec2((cell.x + vKeyUv.x) / 8.0, 1.0 - (cell.y + 1.0 - vKeyUv.y) / 8.0)).r * vTop;
           totalEmissiveRadiance += vec3(0.85) * legend * (0.6 + vNext * 1.8);
           totalEmissiveRadiance += uAccent * vGlow * 2.6 + vec3(1.0) * vNext * 0.35;`
        );
    };
    return { material: m, glow, next };
  }, [keys]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.geometry.setAttribute("aGlow", glow);
    mesh.geometry.setAttribute("aNext", next);
    const m = new THREE.Matrix4();
    keys.forEach((k, i) => {
      m.makeScale(k.w - 0.12, 0.42, 0.88).setPosition(k.x - 7.5, 0.35, k.z - 2);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [keys, glow, next]);

  /* Which key each character of the line needs (and shift, for the
     punctuation), as indices into `keys`. */
  const sequence = useMemo(() => {
    const find = (label) => keys.findIndex((k) => k.label === label);
    const shift = find("SHIFT");
    return [...TYPE_LINE].map((ch) => {
      const label = KEY_OF[ch] ?? ch.toUpperCase();
      return { key: find(label), shift: SHIFTED.has(ch) ? shift : -1 };
    });
  }, [keys]);

  const last = useRef(-1);
  useFrame((state, dt) => {
    const attrs = ref.current?.geometry.attributes;
    if (!attrs?.aGlow) return;
    const t = lap.reduced ? 0 : state.clock.elapsedTime;
    const step = typeKeys(attrs.aGlow, attrs.aNext, sequence, t, dt);
    if (step >= 0 && step !== last.current) {
      last.current = step;
      onPress?.();
    }
  });

  return (
    <group>
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[15.6, 0.3, 5.6]} />
        <meshStandardMaterial color="#0d0e12" roughness={0.3} metalness={0.85} envMapIntensity={0.9} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, keys.length]} material={material} frustumCulled={false}>
        <boxGeometry />
      </instancedMesh>
    </group>
  );
}

function ThemeOrbit({ power }) {
  const ref = useRef(null);
  const swatches = useMemo(
    () =>
      themes.map((t) => ({
        material: new THREE.MeshBasicMaterial({ color: new THREE.Color(t.swatch.accent).multiplyScalar(1.8), toneMapped: false }),
      })),
    []
  );
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = lap.reduced ? 0 : state.clock.elapsedTime * 0.25;
      ref.current.scale.setScalar(Math.max(0.001, power.current));
    }
  });
  return (
    <group ref={ref} position={[0, 3.2, 0]}>
      {swatches.map((sw, i) => {
        const a = (i / swatches.length) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 8.6, Math.sin(i * 1.7) * 0.4, Math.sin(a) * 8.6]} material={sw.material}>
            <sphereGeometry args={[0.36, 20, 14]} />
          </mesh>
        );
      })}
    </group>
  );
}

function SoundMeter({ power, energyRef }) {
  const ref = useRef(null);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const c = useMemo(() => new THREE.Color(), []);
  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < 12; i++) {
      const idle = 0.35 + 0.25 * Math.sin(t * 2.2 + i * 0.9);
      const h = (lap.reduced ? 0.6 : idle + energyRef.current * (0.6 + ((i * 5) % 7) / 6)) * 2.2 * power.current + 0.02;
      m.makeScale(0.5, h, 0.5).setPosition(-5.5 + i, h / 2 + 0.3, -4.2);
      mesh.setMatrixAt(i, m);
      c.copy(ACCENT.value).multiplyScalar(1.4 + h * 0.4);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    energyRef.current *= 0.9;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 12]} material={material} frustumCulled={false}>
      <boxGeometry />
    </instancedMesh>
  );
}

function garageTexture() {
  return canvasTexture(900, 1100, (ctx, w) => {
    ctx.clearRect(0, 0, w, 1100);
    ctx.textBaseline = "middle";
    const section = (y, title) => {
      ctx.fillStyle = INK.muted;
      ctx.font = `700 34px ${DISPLAY}`;
      ctx.fillText(title, 44, y);
    };
    const chips = (y, items, colour) => {
      let x = 44;
      ctx.font = `600 32px ${DISPLAY}`;
      items.forEach((t) => {
        const tw = ctx.measureText(t).width + 44;
        ctx.lineWidth = 3;
        pill(ctx, x, y - 34, tw, 68, 34, "rgba(255,255,255,0.05)", colour);
        ctx.fillStyle = INK.white;
        ctx.fillText(t, x + 22, y + 1);
        x += tw + 16;
      });
    };
    section(70, "Modes");
    chips(140, ["Strict", "Freedom"], "#e10600");
    chips(230, ["Blind", "Zen"], "#e10600");
    section(330, "Caret");
    chips(400, ["Thin", "Thick", "Caret-only"], INK.muted);
    section(500, "Audio");
    chips(570, ["12 switch sounds"], INK.purple);
    chips(660, ["Engineer radio"], INK.purple);
    section(760, "Look");
    chips(830, ["15 themes", "12 fonts"], INK.yellow);
    ctx.fillStyle = INK.muted;
    ctx.font = `38px ${BRAND}`;
    ctx.fillText("“Purple sector. Keep pushing.”", 44, 960);
    ctx.fillText("— your race engineer", 44, 1010);
  });
}

function GarageSet() {
  const cfg = DRONES.garage;
  const power = usePower(cfg.section);
  const energyRef = useRef(0);
  const texture = useMemo(() => garageTexture(), []);
  return (
    <Drone cfg={cfg} power={power}>
      <group rotation={[0.55, 0, 0]} position={[0, -2.6, 1.5]}>
        <Keyboard onPress={() => (energyRef.current = 1)} />
        <SoundMeter power={power} energyRef={energyRef} />
      </group>
      <ThemeOrbit power={power} />
      <Panel texture={texture} width={7.2} height={8.8} power={power} position={[12.2, 1.8, 0]} rotation={[0, -0.3, 0]} />
      <Projector y={-6.6} width={18} power={power} />
    </Drone>
  );
}

/* ══ Chicane — scrutineering ══════════════════════════════════
   The car drives through a scanner gate; the server-side checks it
   stands for are listed beside it, and the gate turns green once
   the car is through. */
function checksTexture() {
  return canvasTexture(1100, 900, (ctx, w) => {
    ctx.clearRect(0, 0, w, 900);
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK.muted;
    ctx.font = `700 38px ${DISPLAY}`;
    ctx.fillText("Telemetry check", 50, 66);
    const rows = [
      "WPM rebuilt from keystrokes",
      "Under the 300 WPM ceiling",
      "Human key-timing variance",
      "No 1 ms keystroke bursts",
      "Run fits the time limit",
    ];
    rows.forEach((t, i) => {
      const y = 170 + i * 112;
      pill(ctx, 40, y - 44, w - 80, 88, 14, "rgba(31,227,106,0.08)", null);
      ctx.fillStyle = INK.green;
      ctx.font = `800 46px ${SANS}`;
      ctx.fillText("✓", 70, y + 2);
      ctx.fillStyle = INK.text;
      ctx.font = `600 40px ${SANS}`;
      ctx.fillText(t, 130, y + 2);
    });
    ctx.lineWidth = 4;
    pill(ctx, 40, 744, w - 80, 110, 18, "rgba(31,227,106,0.18)", INK.green);
    ctx.fillStyle = INK.green;
    ctx.font = `800 52px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.fillText("Lap verified", w / 2, 799);
  });
}

function ScannerGate() {
  const sheet = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uAccent: ACCENT, uTime: { value: 0 }, uPass: { value: 0 }, uPower: { value: 0 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: /* glsl */ `
          uniform vec3 uAccent;
          uniform float uTime;
          uniform float uPass;
          uniform float uPower;
          varying vec2 vUv;
          void main() {
            vec3 green = vec3(0.12, 1.0, 0.42);
            vec3 c = mix(uAccent, green, uPass);
            float sweep = exp(-abs(vUv.y - (0.5 + 0.5 * sin(uTime * 2.4))) * 60.0);
            float lines = smoothstep(0.92, 1.0, fract(vUv.x * 48.0)) * 0.35;
            float edge = exp(-min(vUv.x, 1.0 - vUv.x) * 60.0);
            float a = (0.05 + sweep * 0.9 + lines * 0.25 + edge * 0.6) * uPower;
            gl_FragColor = vec4(c * a * 1.6, 1.0);
          }
        `,
      }),
    []
  );
  const screen = useMemo(
    () =>
      canvasTexture(1024, 128, (ctx, w, h) => {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#fff";
        ctx.font = `800 70px ${DISPLAY}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Scrutineering", w / 2, h / 2 + 4);
      }),
    []
  );
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2c33", roughness: 0.35, metalness: 0.85 }), []);
  const strip = useMemo(() => new THREE.MeshBasicMaterial({ map: screen, toneMapped: false }), [screen]);
  const pass = useRef(0);
  const sheetRef = useRef(null);
  const placement = useMemo(() => {
    const f = { pos: new THREE.Vector3(), fwd: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3() };
    sampleTrack(GATE_S, f);
    const fh = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize();
    const m = new THREE.Matrix4().makeBasis(fh, new THREE.Vector3(0, 1, 0), new THREE.Vector3(-fh.z, 0, fh.x));
    m.setPosition(f.pos);
    return m;
  }, []);
  const ref = useRef(null);
  useFrame((state, dt) => {
    const power = powerAt(GATE_S, 220, 260);
    if (ref.current) ref.current.visible = rig.warm || power > 0.003;
    /* Green once the car is through (going forward), back to accent if you reverse out. */
    const through = lap.s > GATE_S + 1 ? 1 : 0;
    pass.current += (through - pass.current) * Math.min(1, dt * 6);
    const u = sheetRef.current?.material.uniforms;
    if (u) {
      u.uPass.value = pass.current;
      u.uPower.value = power;
      u.uTime.value = lap.reduced ? 0 : state.clock.elapsedTime;
    }
    strip.color.setRGB(1, 1, 1).lerp(GATE_GREEN, pass.current).multiplyScalar(1.6);
  });
  const span = (VERGE + 0.22) * 2;
  return (
    <group ref={ref} matrixAutoUpdate={false} matrix={placement}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 3.2, side * (VERGE + 0.22)]} material={steel}>
          <boxGeometry args={[0.6, 8.4, 0.6]} />
        </mesh>
      ))}
      <mesh position={[0, 7.2, 0]} material={steel}>
        <boxGeometry args={[0.9, 1.0, span + 0.6]} />
      </mesh>
      {/* Both faces: cars meet it from behind, the camera turns to
          watch the car come through from in front. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.47, 7.2, 0]} rotation={[0, side * Math.PI / 2, 0]} material={strip}>
          <planeGeometry args={[9, 0.9]} />
        </mesh>
      ))}
      <mesh ref={sheetRef} position={[0, 3.35, 0]} rotation={[0, Math.PI / 2, 0]} material={sheet} renderOrder={6}>
        <planeGeometry args={[span - 0.6, 6.7]} />
      </mesh>
    </group>
  );
}

function ScrutineeringSet() {
  const cfg = DRONES.scrutineering;
  const power = usePower(cfg.section);
  const texture = useMemo(() => checksTexture(), []);
  return (
    <>
      <ScannerGate />
      <Drone cfg={cfg} power={power}>
        <Panel texture={texture} width={11} height={9} power={power} />
        <Projector y={-5.2} width={11} power={power} />
      </Drone>
    </>
  );
}

export default function SetPieces() {
  return (
    <>
      <CodeSet />
      <TelemetrySet />
      <PodiumSet />
      <ChampionshipSet />
      <GarageSet />
      <ScrutineeringSet />
    </>
  );
}
