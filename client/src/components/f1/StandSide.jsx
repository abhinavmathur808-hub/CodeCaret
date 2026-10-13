import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  BARRIER_Z,
  GROUND,
  LENGTH,
  STAND_Z,
  TEAM_NAMES,
  TEAMS,
  makeCanvas,
  mulberry32,
  toTexture,
} from "./circuitKit";
import { Instances, Matte } from "./circuitParts";
import { MarshalPost, TvCamera } from "./trackPeople";
import { ACCENT } from "./theme";

/* ══════════════════════════════════════════════════════════════
   StandSide — the grandstand side of the straight (+z): what fills
   the view behind the pedestal as the camera orbits round to the pit
   side, or drops low to look at the car.

   From the track outwards:
     - the barrier and its LED boards, with a catch fence on top
     - a grass verge with a marshal post, a TV camera tower, a giant
       tyre and the live timing board
     - the service road, left wet so it mirrors the stand and its lamp
       posts, with the safety car and the medical car parked on it,
       light bars on
     - a walkway with fans and a merchandise kiosk
     - the grandstand: ten tiers of crowd in team colours (mostly
       CodeCaret red) with flags, banners on the front rail, aisles,
       end walls, roof columns, a lit sponsor band and lamps under
       the roof

   The mirror pass renders all of this a second time, so anything
   repeated is instanced or merged into one mesh.
   ══════════════════════════════════════════════════════════════ */

/* ── Layout ────────────────────────────────────────────────────── */

const FENCE_Z = BARRIER_Z + 0.32; // along the top of the barrier
const FENCE_H = 3.4;
const VERGE = [BARRIER_Z + 0.64, 16.2];
const ROAD = [16.2, 19.4];
const WALKWAY = [ROAD[1], STAND_Z];

const STAND_W = LENGTH * 0.6;
const TIERS = 10;
const TIER_RISE = 2.1;
const TIER_DEPTH = 1.6;
const ROOF_Y = 23;
const tierTop = (i) => 1.2 + TIER_RISE * i;
/* The bottom of the part of a tier's face that the tier in front leaves showing. */
const tierBottom = (i) => (i === 0 ? 0 : tierTop(i - 1));
const tierFront = (i) => STAND_Z + 0.4 + TIER_DEPTH * i;

const MARSHAL_POST = [-14, GROUND, BARRIER_Z - 1.15];
const CAMERA_TOWER = [-6, GROUND, 14.8];
const TYRE = [16, GROUND, 14.7];
const TIMING_BOARD = [34, GROUND, 15.2];
const SAFETY_CAR = [-1, GROUND, 17];
const MEDICAL_CAR = [-8.5, GROUND, 17];
const KIOSK = [-22, GROUND, 20.9];

/* ── Textures ──────────────────────────────────────────────────── */

const SHIRTS = [ACCENT, ACCENT, ACCENT, ACCENT, "#b3121c", "#f2f2f2", "#f2f2f2", "#1d2433", "#1d2433", "#5a606a", ...TEAMS.slice(1)];
const SKIN = ["#e8bf9c", "#c98f6b", "#a8714f", "#8d5a3b", "#5e3a26"];
const HAIR = ["#1a1310", "#2e1f16", "#4a3322", "#6b4a2b", "#bfa27a"];

/* The crowd on one tier's face: a 16 m × 2.1 m tile, three rows at a
   0.5 m seat pitch. Shirts in team colours with CodeCaret red the most
   common, caps, arms up, scarves held high, hand flags and phone
   screens. Back row first, so the rows in front overlap it. */
function crowd(rand) {
  const W = 1024;
  const H = 128;
  const SEAT = 32;
  const ROW = H / 3;
  /* Drawn in 1024×128 (64 px per metre) on a canvas twice that, so the
     nearest tiers hold up when the camera drops to the ground. */
  const [canvas, g] = makeCanvas(W * 2, H * 2);
  g.scale(2, 2);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  g.lineCap = "round";
  g.fillStyle = "#0b0e13";
  g.fillRect(0, 0, W, H);
  for (let row = 0; row < 3; row++) {
    const seat = Math.round(ROW * (row + 1)) - 2;
    /* Seat backs, seen in the gaps and where a seat is empty. */
    g.fillStyle = "#3a0e15";
    for (let x = 0; x < W; x += SEAT) g.fillRect(x + 6, seat - 14, SEAT - 12, 14);
    for (let x = 0; x < W; x += SEAT) {
      if (rand() < 0.05) continue;
      const cx = x + SEAT / 2 + (rand() - 0.5) * 5;
      const shirt = pick(SHIRTS);
      const skin = pick(SKIN);
      /* Wider than the seat pitch: a crowd sits shoulder to shoulder. */
      const w = 27 + rand() * 7;
      const top = seat - 27 - (rand() < 0.12 ? 5 : 0); // a few on their feet
      const hy = Math.max(8, top - 7);
      g.fillStyle = shirt;
      g.beginPath();
      g.roundRect(cx - w / 2, top, w, seat - top + 1, [w / 2.4, w / 2.4, 2, 2]);
      g.fill();
      g.fillStyle = skin;
      g.beginPath();
      g.arc(cx, hy, 7.4, 0, Math.PI * 2);
      g.fill();
      if (rand() < 0.3) {
        /* A team cap. */
        g.fillStyle = rand() < 0.6 ? shirt : pick(SHIRTS);
        g.beginPath();
        g.arc(cx, hy - 1, 8, Math.PI, 0);
        g.fill();
        g.fillRect(cx, hy - 2, 11, 2.5);
      } else {
        g.fillStyle = pick(HAIR);
        g.beginPath();
        g.arc(cx, hy - 1, 7.7, Math.PI * 1.03, Math.PI * 1.97);
        g.fill();
      }

      const arm = (side, reach) => {
        const sx = cx + side * (w / 2 - 3);
        const hx = sx + side * reach;
        const handY = top - 17;
        g.strokeStyle = shirt;
        g.lineWidth = 4.5;
        g.beginPath();
        g.moveTo(sx, top + 6);
        g.lineTo(hx, handY);
        g.stroke();
        g.fillStyle = skin;
        g.beginPath();
        g.arc(hx, handY, 2.6, 0, Math.PI * 2);
        g.fill();
        return [hx, handY];
      };
      const gesture = rand();
      if (gesture < 0.05) {
        /* A scarf held up in both hands. */
        const [lx, ly] = arm(-1, 5);
        const [rx] = arm(1, 5);
        g.fillStyle = pick([ACCENT, ...TEAMS]);
        g.fillRect(lx, ly - 3, rx - lx, 6);
      } else if (gesture < 0.19) {
        const side = rand() < 0.5 ? -1 : 1;
        const [hx, handY] = arm(side, 3);
        const held = rand();
        if (held < 0.35) {
          g.fillStyle = pick([ACCENT, ACCENT, "#ffffff", ...TEAMS]);
          g.fillRect(side > 0 ? hx : hx - 16, handY - 11, 16, 10);
        } else if (held < 0.6) {
          /* A phone, screen lit, filming the grid. */
          const halo = g.createRadialGradient(hx, handY - 3, 0, hx, handY - 3, 9);
          halo.addColorStop(0, "rgba(220,235,255,0.5)");
          halo.addColorStop(1, "rgba(220,235,255,0)");
          g.fillStyle = halo;
          g.fillRect(hx - 9, handY - 12, 18, 18);
          g.fillStyle = "#eef5ff";
          g.fillRect(hx - 1.5, handY - 6, 3, 5);
        }
      }
    }
    /* The row in front shades the laps of the row behind it. */
    const shade = g.createLinearGradient(0, seat - 9, 0, seat + 2);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.5)");
    g.fillStyle = shade;
    g.fillRect(0, seat - 9, W, 11);
  }
  /* Lit from the roof: heads catch it, laps sit in shadow. */
  const wash = g.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, "#ffffff");
  wash.addColorStop(1, "#8d8d94");
  g.globalCompositeOperation = "multiply";
  g.fillStyle = wash;
  g.fillRect(0, 0, W, H);
  return canvas;
}

/* Fans' banners along the front rail, left to right as seen from the
   track (the viewer's left is +x there). One per row of the canvas. */
const BANNERS = [
  { x: 55, text: "CTRL + ALT + OVERTAKE", bg: "#111317", fg: "#ffffff", bar: ACCENT },
  { x: 33, text: "KEEP CALM & CARET ON", bg: "#ff8000", fg: "#111317" },
  { x: 11, text: "LIGHTS OUT AND AWAY WE TYPE", bg: "#f2f2f2", fg: "#111317" },
  { x: -11, text: "CODECARET", bg: ACCENT, fg: "#ffffff" },
  { x: -33, text: "300 WPM OR BUST", bg: "#111317", fg: "#27f4d2" },
  { x: -55, text: "P1 OR NOTHING", bg: "#fff500", fg: "#111317" },
];
const BANNER_W = 12.8;
const BANNER_H = 1;

function banners() {
  const W = 1024;
  const H = 80;
  const [canvas, g] = makeCanvas(W, H * BANNERS.length);
  BANNERS.forEach(({ text, bg, fg, bar }, i) => {
    const y = i * H;
    g.fillStyle = bg;
    g.fillRect(0, y, W, H);
    if (bar) {
      g.fillStyle = bar;
      g.fillRect(0, y + H - 10, W, 10);
    }
    /* Creases where it's tied to the rail. */
    g.fillStyle = "rgba(0,0,0,0.14)";
    for (let x = 64; x < W; x += 128) g.fillRect(x, y, 3, H);
    g.fillStyle = fg;
    g.font = "italic 900 52px 'Arial Black', 'Segoe UI', Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, W / 2, y + H / 2 + 2, W - 60);
  });
  return canvas;
}

/* The tifo a stand section holds up over five tiers: a caret the size of
   a house, over the name. */
const TIFO = { x: -14, w: 24, from: 2, tiers: 5 };

function tifo() {
  const W = 1024;
  const H = 512;
  const [canvas, g] = makeCanvas(W, H);
  g.fillStyle = ACCENT;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(0,0,0,0.3)";
  g.lineWidth = 20;
  g.strokeRect(10, 10, W - 20, H - 20);
  g.strokeStyle = "#ffffff";
  g.lineWidth = 62;
  g.lineJoin = "miter";
  g.beginPath();
  g.moveTo(W * 0.31, H * 0.5);
  g.lineTo(W * 0.5, H * 0.19);
  g.lineTo(W * 0.69, H * 0.5);
  g.stroke();
  g.fillStyle = "#ffffff";
  g.font = "italic 900 124px 'Arial Black', 'Segoe UI', Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("CODECARET", W / 2, H * 0.76, W - 120);
  return canvas;
}

/* The live timing board: the order as the field comes round. */
function timingBoard() {
  const W = 1024;
  const H = 448;
  const [canvas, g] = makeCanvas(W, H);
  const mono = "700 28px Consolas, 'Courier New', monospace";
  const display = "italic 900 28px 'Arial Black', 'Segoe UI', Arial, sans-serif";
  const gaps = ["LEADER", "+0.412", "+1.087", "+2.334", "+3.901", "+5.268", "+6.740", "+8.115"];
  g.fillStyle = "#060910";
  g.fillRect(0, 0, W, H);
  g.fillStyle = ACCENT;
  g.fillRect(0, 0, W, 60);
  g.textBaseline = "middle";
  g.fillStyle = "#ffffff";
  g.font = "italic 900 34px 'Arial Black', 'Segoe UI', Arial, sans-serif";
  g.fillText("LIVE TIMING", 28, 31);
  g.font = mono;
  g.textAlign = "right";
  g.fillText("LAP 1 / 57", W - 28, 31);
  TEAM_NAMES.forEach((name, i) => {
    const y = 66 + i * 47;
    g.fillStyle = i % 2 ? "#0b1019" : "#0f1623";
    g.fillRect(0, y, W, 45);
    g.textAlign = "left";
    g.fillStyle = "#e9edf3";
    g.font = mono;
    g.fillText(String(i + 1), 30, y + 23);
    g.fillStyle = TEAMS[i];
    g.fillRect(84, y + 9, 8, 27);
    g.fillStyle = "#ffffff";
    g.font = display;
    g.fillText(name, 110, y + 24);
    g.textAlign = "right";
    g.font = mono;
    g.fillStyle = i === 0 ? "#ffffff" : "#b9c4d3";
    g.fillText(gaps[i], W - 30, y + 23);
  });
  /* LED pixel lattice. */
  g.fillStyle = "rgba(0,0,0,0.3)";
  for (let x = 0; x < W; x += 3) g.fillRect(x, 0, 1, H);
  for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  return canvas;
}

/* A tyre's sidewall, mapped square across the ring: the red band of the
   soft compound, and the lettering round it, upright at top and bottom. */
function tyreWall() {
  const S = 512;
  const c = S / 2;
  const [canvas, g] = makeCanvas(S, S);
  g.fillStyle = "#121316";
  g.fillRect(0, 0, S, S);
  g.strokeStyle = "#2a2c31";
  g.lineWidth = 4;
  g.beginPath();
  g.arc(c, c, c * 0.97, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = ACCENT;
  g.lineWidth = 12;
  g.beginPath();
  g.arc(c, c, c * 0.66, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "#eceef1";
  g.font = "italic 900 40px 'Arial Black', 'Segoe UI', Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const text = "CODECARET";
  const r = c * 0.82;
  const step = 0.16;
  for (let k = 0; k < text.length; k++) {
    const offset = (k - (text.length - 1) / 2) * step;
    for (const [a, turn] of [
      [-Math.PI / 2 + offset, Math.PI / 2],
      [Math.PI / 2 - offset, -Math.PI / 2],
    ]) {
      g.save();
      g.translate(c + r * Math.cos(a), c + r * Math.sin(a));
      g.rotate(a + turn);
      g.fillText(text[k], 0, 0);
      g.restore();
    }
  }
  return canvas;
}

/* ── Geometry ──────────────────────────────────────────────────── */

/* A rectangle facing −z, towards the track, showing the window
   u0..u1 × v0..v1 of its texture. */
function panel(w, h, [x, y, z], [u0, u1, v0, v1]) {
  const geometry = new THREE.PlaneGeometry(w, h);
  geometry.rotateY(Math.PI);
  geometry.translate(x, y, z);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  }
  return geometry;
}

function merge(parts) {
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

const CROWD_TILE = 16; // metres of stand per crowd texture tile

/* ── Instanced layouts ─────────────────────────────────────────── */

const FENCE_POSTS = LENGTH / 4 + 1;
const placeFencePost = (i) => ({
  position: [-LENGTH / 2 + i * 4, GROUND + 1 + FENCE_H / 2, FENCE_Z],
  scale: [1, FENCE_H, 1],
});
/* Three cables and the top rail: [height above the barrier, thickness]. */
const FENCE_RAILS = [
  [1.0, 0.025],
  [2.0, 0.025],
  [2.9, 0.025],
  [FENCE_H, 0.07],
];
const placeFenceRail = (i) => ({
  position: [0, GROUND + 1 + FENCE_RAILS[i][0], FENCE_Z],
  scale: [LENGTH, FENCE_RAILS[i][1], FENCE_RAILS[i][1]],
});

const ROAD_DASHES = Math.floor(LENGTH / 6);
const placeRoadDash = (i) => ({
  position: [-LENGTH / 2 + 3 + i * 6, GROUND + 0.004, (ROAD[0] + ROAD[1]) / 2],
  rotation: [-Math.PI / 2, 0, 0],
  scale: [2.4, 0.12, 1],
});

const placeTier = (i) => ({
  position: [0, GROUND + tierTop(i) / 2, tierFront(i) + TIER_DEPTH / 2],
  scale: [STAND_W, tierTop(i), TIER_DEPTH],
});

/* Aisle steps down every tier, midway between the roof columns. */
const COLUMNS = Array.from({ length: 9 }, (_, k) => -STAND_W / 2 + (k * STAND_W) / 8);
const AISLES = COLUMNS.slice(1).flatMap((x) =>
  Array.from({ length: TIERS }, (_, i) => ({
    position: [x - STAND_W / 16, GROUND + (tierBottom(i) + tierTop(i)) / 2, tierFront(i) - 0.02],
    scale: [1.2, tierTop(i) - tierBottom(i), 1],
    rotation: [0, Math.PI, 0],
  }))
);
const placeAisle = (i) => AISLES[i];
const placeColumn = (i) => ({
  position: [COLUMNS[i], GROUND + (ROOF_Y - 0.25) / 2, STAND_Z - 0.6],
  scale: [0.5, ROOF_Y - 0.25, 0.5],
});

/* Flags on poles, planted on the tiers and turned this way and that. */
const FLAGS = (() => {
  const rand = mulberry32(0xf1a6);
  const colours = [ACCENT, ACCENT, ACCENT, "#ffffff", ...TEAMS];
  return Array.from({ length: 80 }, () => {
    const tier = Math.floor(rand() * TIERS);
    const size = rand() < 0.2 ? 1.7 : 1;
    return {
      x: -STAND_W / 2 + 4 + rand() * (STAND_W - 8),
      y: GROUND + tierTop(tier),
      z: tierFront(tier) + 0.3 + rand() * 1,
      yaw: (rand() - 0.5) * 1.2,
      size,
      colour: colours[Math.floor(rand() * colours.length)],
    };
  });
})();
const placeFlagPole = (i) => {
  const f = FLAGS[i];
  return { position: [f.x, f.y + 0.95 * f.size, f.z], scale: [1, 1.9 * f.size, 1] };
};
const placeFlagCloth = (i) => {
  const f = FLAGS[i];
  const w = f.size;
  return {
    position: [f.x + (Math.cos(f.yaw) * w) / 2, f.y + 1.6 * f.size, f.z - (Math.sin(f.yaw) * w) / 2],
    rotation: [0, f.yaw, 0],
    scale: [w, 0.62 * f.size, 1],
    colour: f.colour,
  };
};

const ROOF_LAMPS = 22;
const roofLampX = (i) => -STAND_W / 2 + 3 + i * 6;
const placeRoofLamp = (i) => ({
  position: [roofLampX(i), GROUND + ROOF_Y - 0.38, STAND_Z + 0.2],
  scale: [1.6, 0.14, 0.5],
});

const FASCIA_W = STAND_W + 4.2;
const FASCIA_H = 1.1;

/* Lamp posts along the service road: the light between the barrier and
   the stand, and the brightest thing the wet road mirrors. */
const LAMPS = 7;
const LAMP_H = 6.5;
const LAMP_Z = ROAD[1] + 0.4;
const lampX = (i) => -60 + i * 22;
const placeLampPost = (i) => ({ position: [lampX(i), GROUND + LAMP_H / 2, LAMP_Z], scale: [1, LAMP_H, 1] });
const placeLampArm = (i) => ({ position: [lampX(i), GROUND + LAMP_H - 0.1, LAMP_Z - 0.8], scale: [0.1, 0.1, 1.7] });
const placeLampHead = (i) => ({ position: [lampX(i), GROUND + LAMP_H - 0.2, LAMP_Z - 1.6], scale: [0.7, 0.16, 0.36] });
const placeLampPool = (i) => ({
  position: [lampX(i), GROUND + 0.005, LAMP_Z - 1.6],
  rotation: [-Math.PI / 2, 0, 0],
  scale: [13, 10, 1],
});

/* Fans on the walkway, and a queue at the kiosk. */
const FANS = (() => {
  const rand = mulberry32(0x3a1c);
  const shirts = [ACCENT, ACCENT, "#f2f2f2", "#1d2433", ...TEAMS.slice(1)];
  const legs = ["#1f2a3a", "#15171b", "#3b3f46", "#2a2320"];
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const fan = (x, z, yaw) => ({ x, z, yaw, shirt: pick(shirts), legs: pick(legs), skin: pick(SKIN) });
  const fans = Array.from({ length: 22 }, () =>
    fan(-16 + rand() * 60, WALKWAY[0] + 0.5 + rand() * (WALKWAY[1] - WALKWAY[0] - 1.1), rand() * Math.PI * 2)
  );
  for (let k = 0; k < 5; k++) fans.push(fan(KIOSK[0] - 1 + (k % 2) * 1.2, KIOSK[2] - 1.9 - Math.floor(k / 2) * 0.75, 0));
  return fans;
})();
const placeFanLegs = (i) => ({
  position: [FANS[i].x, GROUND + 0.43, FANS[i].z],
  rotationY: FANS[i].yaw,
  colour: FANS[i].legs,
});
const placeFanBody = (i) => ({
  position: [FANS[i].x, GROUND + 1.16, FANS[i].z],
  rotationY: FANS[i].yaw,
  scale: [1, 0.62, 1],
  colour: FANS[i].shirt,
});
const placeFanHead = (i) => ({ position: [FANS[i].x, GROUND + 1.6, FANS[i].z], colour: FANS[i].skin });

/* ── Pieces ────────────────────────────────────────────────────── */

function Barrier({ shared }) {
  return (
    <group>
      <mesh position={[0, GROUND + 0.5, BARRIER_Z + 0.32]}>
        <boxGeometry args={[LENGTH, 1, 0.64]} />
        <Matte color="#1b1e23" roughness={0.93} />
      </mesh>
      <mesh position={[0, GROUND + 0.55, BARRIER_Z - 0.004]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[LENGTH, 0.66]} />
        <meshBasicMaterial map={shared.led} toneMapped={false} color="#d4d4d4" />
      </mesh>
      <mesh position={[0, GROUND + 0.55, BARRIER_Z - 0.06]} rotation={[0, Math.PI, 0]} renderOrder={1}>
        <planeGeometry args={[LENGTH, 1.8]} />
        <meshBasicMaterial
          map={shared.band}
          color="#b9c3d1"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Catch fence: posts, cables and top rail, and the mesh itself —
          at this distance, a faint veil. */}
      <Instances count={FENCE_POSTS} place={placeFencePost}>
        <cylinderGeometry args={[0.045, 0.045, 1, 6]} />
        <Matte color="#4a5059" metalness={0.6} roughness={0.5} />
      </Instances>
      <Instances count={FENCE_RAILS.length} place={placeFenceRail}>
        <boxGeometry />
        <Matte color="#4a5059" metalness={0.6} roughness={0.5} />
      </Instances>
      <mesh position={[0, GROUND + 1 + FENCE_H / 2, FENCE_Z]}>
        <planeGeometry args={[LENGTH, FENCE_H]} />
        <meshBasicMaterial color="#8e9aab" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* Grass behind the fence; the service road left as wet asphalt, marked
   out; paving along the foot of the stand. */
function Verge() {
  return (
    <group>
      <mesh position={[0, GROUND + 0.004, (VERGE[0] + VERGE[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[LENGTH, VERGE[1] - VERGE[0]]} />
        <Matte color="#172a1c" roughness={1} />
      </mesh>
      {[ROAD[0] + 0.2, ROAD[1] - 0.2].map((z) => (
        <mesh key={z} position={[0, GROUND + 0.004, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[LENGTH, 0.12]} />
          <Matte color="#c9ccd1" roughness={0.7} />
        </mesh>
      ))}
      <Instances count={ROAD_DASHES} place={placeRoadDash}>
        <planeGeometry />
        <Matte color="#c9ccd1" roughness={0.7} />
      </Instances>
      <mesh position={[0, GROUND + 0.003, (WALKWAY[0] + WALKWAY[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-2}>
        <planeGeometry args={[LENGTH, WALKWAY[1] - WALKWAY[0]]} />
        <meshBasicMaterial color="#3a3e46" transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  );
}

function RoadLights({ shared }) {
  return (
    <group>
      <Instances count={LAMPS} place={placeLampPost}>
        <cylinderGeometry args={[0.07, 0.1, 1, 8]} />
        <Matte color="#3f444c" roughness={0.5} metalness={0.5} />
      </Instances>
      <Instances count={LAMPS} place={placeLampArm}>
        <boxGeometry />
        <Matte color="#3f444c" roughness={0.5} metalness={0.5} />
      </Instances>
      <Instances count={LAMPS} place={placeLampHead}>
        <boxGeometry />
        <meshBasicMaterial color="#ffe9c6" toneMapped={false} />
      </Instances>
      <Instances count={LAMPS} place={placeLampPool} renderOrder={-1}>
        <planeGeometry />
        <meshBasicMaterial
          map={shared.pool}
          color="#ffd9a0"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Instances>
      {Array.from({ length: LAMPS }, (_, i) => (
        <sprite key={i} position={[lampX(i), GROUND + LAMP_H - 0.2, LAMP_Z - 1.6]} scale={[6, 6, 1]}>
          <spriteMaterial map={shared.glow} color="#ffdfb0" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  );
}

function Grandstand({ textures, geometry, shared }) {
  return (
    <group>
      <Instances count={TIERS} place={placeTier}>
        <boxGeometry />
        <Matte color="#171216" roughness={0.9} />
      </Instances>

      {/* The crowd, one merged mesh over every tier's face. Unlit: the
          floodlights behind the camera light it, and the car's key light
          can't reach a face turned away from it. */}
      <mesh geometry={geometry.crowd}>
        <meshBasicMaterial map={textures.crowd} color="#97a0ad" toneMapped={false} />
      </mesh>
      <mesh geometry={geometry.tifo}>
        <meshBasicMaterial map={textures.tifo} color="#9aa2ad" toneMapped={false} />
      </mesh>
      <Instances count={AISLES.length} place={placeAisle}>
        <planeGeometry />
        <meshBasicMaterial color="#2f343c" toneMapped={false} />
      </Instances>

      <Instances count={FLAGS.length} place={placeFlagPole}>
        <cylinderGeometry args={[0.018, 0.018, 1, 4]} />
        <Matte color="#cfd3d8" roughness={0.5} />
      </Instances>
      <Instances count={FLAGS.length} place={placeFlagCloth}>
        <planeGeometry />
        <meshBasicMaterial toneMapped={false} side={THREE.DoubleSide} />
      </Instances>

      {/* Front rail, with the fans' banners tied along it. */}
      <mesh position={[0, GROUND + 1.02, STAND_Z - 0.15]}>
        <boxGeometry args={[STAND_W, 0.05, 0.05]} />
        <Matte color="#9aa1aa" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh geometry={geometry.banners}>
        <meshBasicMaterial map={textures.banners} color="#cfcfcf" toneMapped={false} />
      </mesh>

      {/* End walls, closing off the stepped sides. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (STAND_W / 2 + 0.3), GROUND + ROOF_Y / 2, STAND_Z + 8.6]}>
          <boxGeometry args={[0.6, ROOF_Y, 17.6]} />
          <Matte color="#171a20" roughness={0.85} />
        </mesh>
      ))}

      {/* Roof on its columns, a lit sponsor band along the front edge, and
          the lamps under it. */}
      <Instances count={COLUMNS.length} place={placeColumn}>
        <boxGeometry />
        <Matte color="#1c2027" roughness={0.7} />
      </Instances>
      <mesh position={[0, GROUND + ROOF_Y, STAND_Z + 9]}>
        <boxGeometry args={[STAND_W + 4.4, 0.5, 20]} />
        <Matte color="#0c0e12" roughness={0.9} />
      </mesh>
      <mesh position={[0, GROUND + ROOF_Y - 0.35, STAND_Z - 1.1]}>
        <boxGeometry args={[STAND_W + 4.4, 1.4, 0.35]} />
        <Matte color="#0b0d10" roughness={0.8} />
      </mesh>
      <mesh position={[0, GROUND + ROOF_Y - 0.35, STAND_Z - 1.28]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[FASCIA_W, FASCIA_H]} />
        <meshBasicMaterial map={textures.fascia} color="#cfcfcf" toneMapped={false} />
      </mesh>
      <Instances count={ROOF_LAMPS} place={placeRoofLamp}>
        <boxGeometry />
        <meshBasicMaterial color="#fff4e4" toneMapped={false} />
      </Instances>
      {Array.from({ length: ROOF_LAMPS / 2 }, (_, i) => (
        <sprite key={i} position={[roofLampX(i * 2 + 1), GROUND + ROOF_Y - 1.6, STAND_Z - 0.3]} scale={[7, 7, 1]}>
          <spriteMaterial map={shared.glow} color="#ffeeda" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}

      {/* The big screen at the end of the stand. */}
      <group position={[-34, GROUND, STAND_Z - 1.6]}>
        {[-7.4, 7.4].map((dx) => (
          <mesh key={dx} position={[dx, 6, 0.3]}>
            <boxGeometry args={[0.4, 12, 0.4]} />
            <Matte color="#171a20" roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 12.4, 0]}>
          <boxGeometry args={[16.4, 6.4, 0.5]} />
          <Matte color="#0b0d11" roughness={0.8} />
        </mesh>
        <mesh position={[0, 12.4, -0.26]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[15.6, 5.8]} />
          <meshBasicMaterial map={shared.signs[0]} toneMapped={false} color="#d0d0d0" />
        </mesh>
      </group>
    </group>
  );
}

/* Fans on the walkway: legs, body and head, one instanced mesh each. */
function Fans() {
  return (
    <group>
      <Instances count={FANS.length} place={placeFanLegs}>
        <boxGeometry args={[0.34, 0.86, 0.22]} />
        <Matte roughness={0.8} />
      </Instances>
      <Instances count={FANS.length} place={placeFanBody}>
        <capsuleGeometry args={[0.2, 0.45, 4, 10]} />
        <Matte roughness={0.7} />
      </Instances>
      <Instances count={FANS.length} place={placeFanHead}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <Matte roughness={0.6} />
      </Instances>
    </group>
  );
}

/* Merchandise kiosk: lit hatch and counter, red awning, sign on top. */
function Kiosk({ sign, glow }) {
  return (
    <group position={KIOSK}>
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[4.2, 2.5, 1.9]} />
        <Matte color="#1b1e24" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.45, -0.955]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[3.4, 1]} />
        <meshBasicMaterial color="#ffd9a8" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.92, -1.1]}>
        <boxGeometry args={[3.8, 0.08, 0.34]} />
        <Matte color="#d9dce0" roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.3, -1.3]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[4.5, 0.06, 1]} />
        <Matte color={ACCENT} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3, -0.2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[3.6, 0.9]} />
        <meshBasicMaterial map={sign} color="#dddddd" toneMapped={false} />
      </mesh>
      <sprite position={[0, 1.4, -1.6]} scale={[5, 5, 1]}>
        <spriteMaterial map={glow} color="#ffcf9e" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

/* Live timing board on legs, facing the track and turned a little
   towards the grid. */
function TimingBoard({ texture }) {
  return (
    <group position={TIMING_BOARD} rotation={[0, -(Math.PI - 0.35), 0]}>
      {[-4.2, 4.2].map((x) => (
        <mesh key={x} position={[x, 2.6, -0.35]}>
          <boxGeometry args={[0.3, 5.2, 0.3]} />
          <Matte color="#1a1d23" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 5.2, 0]}>
        <boxGeometry args={[10.4, 4.8, 0.4]} />
        <Matte color="#0b0d11" roughness={0.8} />
      </mesh>
      <mesh position={[0, 5.2, 0.205]}>
        <planeGeometry args={[10, 4.4]} />
        <meshBasicMaterial map={texture} color="#d8d8d8" toneMapped={false} />
      </mesh>
    </group>
  );
}

/* A scaffold camera tower: legs that carry on up as rail posts, cross
   braces, a deck with a rail round three sides, and the broadcast camera
   and its operator on top. */
function CameraTower() {
  const H = 4.2;
  const steel = { color: "#8d949d", roughness: 0.4, metalness: 0.6 };
  return (
    <>
      <group position={CAMERA_TOWER}>
        {[
          [-0.9, -0.9],
          [0.9, -0.9],
          [-0.9, 0.9],
          [0.9, 0.9],
        ].map(([x, z]) => (
          <mesh key={`${x}:${z}`} position={[x, (H + 1) / 2, z]}>
            <boxGeometry args={[0.08, H + 1, 0.08]} />
            <Matte {...steel} />
          </mesh>
        ))}
        {[-0.9, 0.9].map((z) => (
          <mesh key={z} position={[0, H / 2, z]} rotation={[0, 0, Math.atan2(H, 1.8)]}>
            <boxGeometry args={[Math.hypot(H, 1.8), 0.05, 0.05]} />
            <Matte {...steel} />
          </mesh>
        ))}
        <mesh position={[0, H, 0]}>
          <boxGeometry args={[2.2, 0.14, 2.2]} />
          <Matte color="#2a2e35" roughness={0.7} />
        </mesh>
        <mesh position={[0, H + 1, -0.9]}>
          <boxGeometry args={[1.8, 0.05, 0.05]} />
          <Matte {...steel} />
        </mesh>
        {[-0.9, 0.9].map((x) => (
          <mesh key={x} position={[x, H + 1, 0]}>
            <boxGeometry args={[0.05, 0.05, 1.8]} />
            <Matte {...steel} />
          </mesh>
        ))}
      </group>
      <TvCamera position={CAMERA_TOWER} height={H + 0.07} />
    </>
  );
}

/* A giant inflatable tyre on the verge, standing on its tread with its
   sidewalls to the track and the stand. */
function GiantTyre({ texture }) {
  const R = 2.2;
  const W = 1.5;
  const RIM = 1.3;
  return (
    <group position={[TYRE[0], TYRE[1] + R, TYRE[2]]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[R, R, W, 48, 1, true]} />
        <Matte color="#141518" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, (side * W) / 2]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>
          <mesh>
            <ringGeometry args={[RIM, R, 64]} />
            <meshBasicMaterial map={texture} color="#a4a4a4" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.25]}>
            <circleGeometry args={[RIM, 40]} />
            <Matte color="#2b3038" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, -0.2]}>
            <circleGeometry args={[0.32, 24]} />
            <Matte color="#9aa1aa" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* A course car parked on the service road, nose down +x, light bar lit:
   `lights` is the bar's two halves. */
function ServiceCar({ position, body, stripe, lights, glow }) {
  const paint = { color: body, roughness: 0.3, metalness: 0.5 };
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[4.7, 0.62, 1.94]} />
        <Matte {...paint} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[4.72, 0.1, 1.96]} />
        <Matte color={stripe} roughness={0.4} />
      </mesh>
      <mesh position={[-0.35, 1.04, 0]}>
        <boxGeometry args={[2.3, 0.48, 1.6]} />
        <Matte color="#0b0e13" roughness={0.15} metalness={0.6} />
      </mesh>
      <mesh position={[-0.4, 1.29, 0]}>
        <boxGeometry args={[2, 0.05, 1.56]} />
        <Matte {...paint} />
      </mesh>
      {lights.map((colour, k) => (
        <group key={k} position={[-0.4, 1.37, (k - 0.5) * 0.66]}>
          <mesh>
            <boxGeometry args={[0.3, 0.1, 0.62]} />
            <meshBasicMaterial color={colour} toneMapped={false} />
          </mesh>
          <sprite scale={[1.8, 1.8, 1]}>
            <spriteMaterial map={glow} color={colour} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      ))}
      {[1.5, -1.45].flatMap((x) =>
        [-0.84, 0.84].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.34, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.26, 14]} />
            <Matte color="#121316" roughness={0.8} />
          </mesh>
        ))
      )}
      {[-0.64, 0.64].map((z) => (
        <group key={z}>
          <mesh position={[2.352, 0.64, z]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.36, 0.12]} />
            <meshBasicMaterial color="#f4f7ff" toneMapped={false} />
          </mesh>
          <mesh position={[-2.352, 0.66, z]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[0.34, 0.1]} />
            <meshBasicMaterial color="#ff1a1a" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── Assembly ──────────────────────────────────────────────────── */

function useStandAssets(shared) {
  const textures = useMemo(() => {
    const rand = mulberry32(0xc40d);
    const crowdTexture = toTexture(crowd(rand), { repeat: [1, 1] });
    crowdTexture.wrapT = THREE.ClampToEdgeWrapping;
    /* The shared LED boards, at their own proportions on the roof fascia. */
    const fascia = shared.led.clone();
    fascia.repeat.set(FASCIA_W / (16 * FASCIA_H), 1);
    return {
      crowd: crowdTexture,
      tifo: toTexture(tifo()),
      banners: toTexture(banners()),
      timing: toTexture(timingBoard()),
      tyre: toTexture(tyreWall()),
      fascia,
    };
  }, [shared.led]);

  const geometry = useMemo(() => {
    const rand = mulberry32(0x7e11);
    return {
      /* Each tier starts the crowd tile somewhere different, so no two
         tiers repeat in step. */
      crowd: merge(
        Array.from({ length: TIERS }, (_, i) => {
          const h = tierTop(i) - tierBottom(i);
          const u0 = rand();
          return panel(
            STAND_W,
            h,
            [0, GROUND + (tierBottom(i) + tierTop(i)) / 2, tierFront(i) - 0.01],
            [u0, u0 + STAND_W / CROWD_TILE, 1 - h / TIER_RISE, 1]
          );
        })
      ),
      /* Held up over five tiers, so it takes a slice of the image each. */
      tifo: merge(
        Array.from({ length: TIFO.tiers }, (_, k) => {
          const t = TIFO.from + k;
          return panel(
            TIFO.w,
            tierTop(t) - tierBottom(t),
            [TIFO.x, GROUND + (tierBottom(t) + tierTop(t)) / 2, tierFront(t) - 0.02],
            [0, 1, k / TIFO.tiers, (k + 1) / TIFO.tiers]
          );
        })
      ),
      banners: merge(
        BANNERS.map(({ x }, k) =>
          panel(BANNER_W, BANNER_H, [x, GROUND + 0.52, STAND_Z - 0.13], [0, 1, 1 - (k + 1) / BANNERS.length, 1 - k / BANNERS.length])
        )
      ),
    };
  }, []);

  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);
  useEffect(() => () => Object.values(geometry).forEach((g) => g.dispose()), [geometry]);

  return { textures, geometry };
}

export default function StandSide({ textures: shared }) {
  const { textures, geometry } = useStandAssets(shared);
  return (
    <group>
      <Barrier shared={shared} />
      <Verge />
      <RoadLights shared={shared} />
      <Grandstand textures={textures} geometry={geometry} shared={shared} />
      <Fans />
      <Kiosk sign={shared.signs[0]} glow={shared.glow} />
      <MarshalPost position={MARSHAL_POST} rotationY={Math.PI} glowTexture={shared.glow} />
      <CameraTower />
      <GiantTyre texture={textures.tyre} />
      <TimingBoard texture={textures.timing} />
      <ServiceCar position={SAFETY_CAR} body="#6b717a" stripe="#ff8a00" lights={["#ff8a00", "#27e05f"]} glow={shared.glow} />
      <ServiceCar position={MEDICAL_CAR} body="#e3e6ea" stripe={ACCENT} lights={["#2d6bff", "#f4f7ff"]} glow={shared.glow} />
    </group>
  );
}
