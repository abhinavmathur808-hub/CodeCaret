import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ACCENT, STAGE_FLOOR_Y } from "./theme";

/* ══════════════════════════════════════════════════════════════
   Pedestal — the display plinth the car stands on.

   Geometry in the 3D scene rather than part of the backdrop art,
   because the car is zoomed (4–12 units) and orbited. A pedestal
   painted into the page background would stay put while the car
   grew, shrank and turned above it; as geometry it shares the car's
   camera, so it scales, foreshortens and rotates with it at every
   zoom level and angle.

   Sized from the car's measured bounds (F1Car's FIT): 4.76 m long,
   1.62 m wide, wheels on y = 0. The footprint's half-diagonal is
   2.51 m, so a 2.75 m deck clears the wing corners by 24 cm. It is
   kept that tight on purpose: at the default camera distance a
   3 m deck already overflows the stage on 4:3 and phone layouts,
   and the HUD ring sits outside the deck. At these sizes the ring
   stays inside the stage at 16:9 and 16:10.

   The deck's top face is y = 0 exactly — the plane ContactShadows
   already draws on — and everything decorative sits below it, so
   none of it is captured by the contact-shadow pass.

   Nothing on the floor is opaque. The pedestal stands on the circuit's
   wet asphalt (CircuitScene.jsx), so the floor layers only ever darken
   (shadows, occlusion) or add light (glow, HUD ring) — the track and
   its reflections stay visible around the plinth.

   Everything is procedural: the etched deck pattern, the occlusion
   and the rings are drawn onto canvases once, no image files.
   ══════════════════════════════════════════════════════════════ */

const DECK_R = 2.75;
const DECK_H = 0.06;
const PLINTH_TOP_R = 2.81;
const PLINTH_BOTTOM_R = 2.95;
/* The plinth fills the gap down to the stage floor, which the backdrop
   garage is drawn on too (0.16 m with the current floor). */
const FLOOR_Y = STAGE_FLOOR_Y;
const PLINTH_H = -FLOOR_Y - DECK_H;
const SHADOW_R = 6;

/* Floor rings, in metres from the centre. */
const GLOW_PEAK = 3.02;
const HUD = { dashes: 3.06, ticksMajor: 3.1, ticksMinor: 3.13, ticksOut: 3.18, brackets: 3.25 };
const HALO = 3.7; // half-size of the glow and occlusion planes
const HUD_R = 3.4; // half-size of the HUD ring's plane

/* Cool etching against the car's red: the paint separates from it
   instead of blending in. Red is kept for the one LED edge. */
const ETCH = "#8fd3ff";

function makeCanvas(size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return [canvas, canvas.getContext("2d")];
}

/* Emissive map for the deck's top face. A cylinder cap's UVs map the
   disc onto the unit square, so a circle centred in the canvas lands
   exactly on the deck. White = glows, black = plain deck. */
function deckEtching() {
  const S = 2048;
  const [canvas, g] = makeCanvas(S);
  const R = S / 2;
  g.fillStyle = "#000";
  g.fillRect(0, 0, S, S);
  g.translate(R, R);

  /* Hex micro-grid, faint, inside the tick band. */
  g.save();
  g.beginPath();
  g.arc(0, 0, R * 0.9, 0, Math.PI * 2);
  g.clip();
  g.strokeStyle = "rgba(255,255,255,0.08)";
  g.lineWidth = 1.5;
  const side = 30;
  const rowH = side * Math.sqrt(3);
  for (let col = -36; col <= 36; col++) {
    for (let row = -36; row <= 36; row++) {
      const cx = col * side * 1.5;
      const cy = row * rowH + (col % 2 ? rowH / 2 : 0);
      if (Math.hypot(cx, cy) > R * 0.9 + side) continue;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k;
        const px = cx + side * Math.cos(a);
        const py = cy + side * Math.sin(a);
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.stroke();
    }
  }
  g.restore();

  const ring = (r, width, alpha) => {
    g.strokeStyle = `rgba(255,255,255,${alpha})`;
    g.lineWidth = width;
    g.beginPath();
    g.arc(0, 0, r * R, 0, Math.PI * 2);
    g.stroke();
  };
  ring(0.985, 4, 0.95);
  ring(0.93, 2.5, 0.55);
  ring(0.905, 1.5, 0.3);
  ring(0.62, 2, 0.35);
  ring(0.32, 1.5, 0.2);

  /* Graduated band, like a turntable's bezel. */
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2;
    const major = i % 15 === 0;
    const r0 = (major ? 0.935 : 0.952) * R;
    const r1 = 0.975 * R;
    g.strokeStyle = `rgba(255,255,255,${major ? 0.95 : 0.4})`;
    g.lineWidth = major ? 5 : 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    g.stroke();
  }

  /* Four locating brackets on the mid ring. */
  g.strokeStyle = "rgba(255,255,255,0.85)";
  g.lineWidth = 7;
  for (let k = 0; k < 4; k++) {
    const a0 = (k * Math.PI) / 2 + Math.PI / 4 - 0.1;
    g.beginPath();
    g.arc(0, 0, 0.62 * R, a0, a0 + 0.2);
    g.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* Contact occlusion where the plinth meets the floor: black, densest
   at the foot and gone by ~1 m out. The plane is 2·half wide, so a stop
   at t lies t·half metres from the centre. */
function occlusion(half) {
  const S = 512;
  const [canvas, g] = makeCanvas(S);
  const at = (metres) => metres / half;
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(at(PLINTH_BOTTOM_R - 0.06), "rgba(0,0,0,0)");
  grad.addColorStop(at(PLINTH_BOTTOM_R + 0.02), "rgba(0,0,0,0.85)");
  grad.addColorStop(at(PLINTH_BOTTOM_R + 0.3), "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* Soft light pooled on the floor around the plinth's foot. */
function glowRing(half) {
  const S = 512;
  const [canvas, g] = makeCanvas(S);
  const at = (metres) => metres / half;
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(at(PLINTH_BOTTOM_R - 0.05), "rgba(255,255,255,0)");
  grad.addColorStop(at(GLOW_PEAK), "rgba(255,255,255,1)");
  grad.addColorStop(at(GLOW_PEAK + 0.3), "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(canvas);
}

/* The segmented HUD ring on the floor: dashed track, scale ticks and
   two long brackets. Drawn in its final colours; the material adds it
   to whatever is underneath. */
function hudRing() {
  const S = 1024;
  const [canvas, g] = makeCanvas(S);
  const R = S / 2;
  const at = (metres) => (metres / HUD_R) * R;
  g.translate(R, R);
  g.lineCap = "butt";

  const segments = 60;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const red = i % 10 === 0;
    g.strokeStyle = red ? ACCENT : "rgba(143,211,255,0.8)";
    g.lineWidth = red ? 9 : 5;
    g.beginPath();
    g.arc(0, 0, at(HUD.dashes), a0 + 0.012, a0 + (Math.PI * 2) / segments - 0.03);
    g.stroke();
  }

  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const major = i % 10 === 0;
    g.strokeStyle = `rgba(143,211,255,${major ? 0.75 : 0.3})`;
    g.lineWidth = major ? 3.5 : 2;
    const r0 = at(major ? HUD.ticksMajor : HUD.ticksMinor);
    const r1 = at(HUD.ticksOut);
    g.beginPath();
    g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    g.stroke();
  }

  g.strokeStyle = "rgba(143,211,255,0.55)";
  g.lineWidth = 3.5;
  for (const start of [0.35, Math.PI + 0.35]) {
    g.beginPath();
    g.arc(0, 0, at(HUD.brackets), start, start + 1.1);
    g.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function Pedestal({ active = false, reduced = false }) {
  const gl = useThree((s) => s.gl);
  const rimRef = useRef(null);
  const glowRef = useRef(null);
  const hudRef = useRef(null);

  const textures = useMemo(() => {
    const etching = deckEtching();
    const hud = hudRing();
    /* Keeps the fine etching crisp at the grazing angles a low orbit
       reaches. Set here, before the first upload: changed later, it
       needs a needsUpdate, which sends both canvases (2048px and
       1024px) to the GPU again. */
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    etching.anisotropy = anisotropy;
    hud.anisotropy = anisotropy;
    return { etching, occlusion: occlusion(HALO), glow: glowRing(HALO), hud };
  }, [gl]);

  useEffect(
    () => () => Object.values(textures).forEach((t) => t.dispose()),
    [textures]
  );

  const materials = useMemo(() => {
    const deckTop = new THREE.MeshPhysicalMaterial({
      color: "#0b0e13",
      metalness: 0.55,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      emissive: ETCH,
      emissiveMap: textures.etching,
      emissiveIntensity: 0.9,
    });
    const deckSide = new THREE.MeshStandardMaterial({
      color: "#0a0c10",
      metalness: 0.85,
      roughness: 0.32,
    });
    const plinth = new THREE.MeshStandardMaterial({
      color: "#06070a",
      metalness: 0.9,
      roughness: 0.45,
    });
    return { deck: [deckSide, deckTop, deckSide], plinth };
  }, [textures]);

  useEffect(
    () => () => {
      materials.deck.forEach((m) => m.dispose());
      materials.plinth.dispose();
    },
    [materials]
  );

  const rimColour = useMemo(() => new THREE.Color(ACCENT), []);

  /* The rim LED is the pedestal's status light: steady at idle, and a
     slow pulse while the form reports the car secure — the same signal
     CarStage's SecureLight gives under the floorboard. */
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const want = active ? (reduced ? 1 : 0.75 + Math.sin(t * 3.6) * 0.25) : 0.55;
    const rim = rimRef.current;
    if (rim) {
      const k = THREE.MathUtils.damp(rim.userData.k ?? want, want, 8, Math.min(delta, 1 / 30));
      rim.userData.k = k;
      rim.color.copy(rimColour).multiplyScalar(k);
      if (glowRef.current) glowRef.current.opacity = 0.2 + k * 0.45;
    }
    if (hudRef.current && !reduced) hudRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group>
      {/* Deck: glossy lacquered top with the etched bezel, satin edge. */}
      <mesh
        position={[0, -DECK_H / 2, 0]}
        material={materials.deck}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[DECK_R, DECK_R, DECK_H, 160]} />
      </mesh>

      {/* LED edge just under the lip of the deck. */}
      <mesh position={[0, -0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[DECK_R + 0.004, 0.01, 8, 320]} />
        <meshBasicMaterial ref={rimRef} color={ACCENT} toneMapped={false} />
      </mesh>

      {/* Plinth: tapers out to the floor, so the deck reads as floating
          on a machined base rather than sitting on a drum. */}
      <mesh
        position={[0, -DECK_H - PLINTH_H / 2, 0]}
        material={materials.plinth}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[PLINTH_TOP_R, PLINTH_BOTTOM_R, PLINTH_H, 160]} />
      </mesh>

      {/* Cool LED line where the plinth meets the floor. */}
      <mesh position={[0, FLOOR_Y + 0.006, 0]}>
        <cylinderGeometry
          args={[PLINTH_BOTTOM_R + 0.004, PLINTH_BOTTOM_R + 0.004, 0.012, 160, 1, true]}
        />
        <meshBasicMaterial color={ETCH} toneMapped={false} transparent opacity={0.75} />
      </mesh>

      {/* Floor: invisible except for the shadows cast onto it, so the
          plinth is grounded without hiding the hall behind it. */}
      <mesh position={[0, FLOOR_Y - 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[SHADOW_R, 96]} />
        <shadowMaterial transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {/* Contact occlusion at the plinth's foot. */}
      <mesh position={[0, FLOOR_Y - 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[HALO * 2, HALO * 2]} />
        <meshBasicMaterial map={textures.occlusion} transparent depthWrite={false} />
      </mesh>

      {/* Red light pooled around the foot of the plinth. */}
      <mesh position={[0, FLOOR_Y + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[HALO * 2, HALO * 2]} />
        <meshBasicMaterial
          ref={glowRef}
          map={textures.glow}
          color={ACCENT}
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Slowly turning HUD ring on the floor. */}
      <group ref={hudRef}>
        <mesh position={[0, FLOOR_Y + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
          <planeGeometry args={[HUD_R * 2, HUD_R * 2]} />
          <meshBasicMaterial
            map={textures.hud}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
