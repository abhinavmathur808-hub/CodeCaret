import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  FRONT_AXLE,
  GARAGE_H,
  GARAGE_PITCH,
  GARAGE_W,
  GARAGE_Z,
  GARAGES,
  GROUND,
  REAR_AXLE,
  TEAMS,
  TRACK_HALF_WIDTH,
  WALL_DEPTH,
  WALL_Z,
  garageTeam,
  garageX,
  makeCanvas,
  mulberry32,
  toTexture,
} from "./circuitKit";
import { Instances, Matte, ProxyCar } from "./circuitParts";

/* ══════════════════════════════════════════════════════════════
   PitLane — life in the pit lane behind the pit wall.

   From the default camera this is the band across the top-left of
   the stage, 20–45 m away, so it is built to read at that distance:
   strong silhouettes, team colour, and light.

     - team stands on the pit wall: engineers behind monitor banks,
       a lit team strip, canopies with work lights
     - painted pit boxes with stop marks, and the fast-lane line
     - two cars stopped in their boxes, full crews around them —
       wheel-gun men kneeling at each corner, jack men, wing men —
       and a third crew waiting with fresh tyres
     - overhead pit gantries with stop lights (green where a car is
       in the box), air lines, blanket-covered tyre stacks, a few
       half-closed garage shutters

   Everything repeated is instanced: the whole pit lane is a few
   dozen draw calls. Layout is computed once at module load from a
   seeded RNG, so it is identical on every visit.
   ══════════════════════════════════════════════════════════════ */

/* Garages dressed in full: the stretch the camera sees at the default
   angle and on its way round. Beyond this the fog has them anyway. */
const DRESSED = Array.from({ length: GARAGES }, (_, i) => i).filter((i) => {
  const x = garageX(i);
  return x > -60 && x < 84;
});
/* Car in the box: x = 12.5 (left of frame), 26.5 (centre), 40.5 (right). */
const ACTIVE = [17, 19, 21];
const PREPPING = [18]; // crew out with tyres, waiting for their car
const SHUTTERED = DRESSED.filter((i) => i % 5 === 3 && !ACTIVE.includes(i) && !PREPPING.includes(i));

const BOX_Z = GARAGE_Z + 3.2; // centre of a pit box
const BOX_DEPTH = 5.4;
const BOX_WIDTH = GARAGE_PITCH - 0.8;

const flat = [-Math.PI / 2, 0, 0];
const darker = (hex, k) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;

/* ── Pit box markings ──────────────────────────────────────────── */

const BOX_FILLS = DRESSED.map((i) => ({
  position: [garageX(i), GROUND + 0.004, BOX_Z],
  scale: [BOX_WIDTH, BOX_DEPTH, 1],
  rotation: flat,
  colour: TEAMS[garageTeam(i)],
}));

const BOX_LINES = DRESSED.flatMap((i) => {
  const x = garageX(i);
  const y = GROUND + 0.005;
  const zFront = BOX_Z + BOX_DEPTH / 2;
  return [
    { position: [x, y, zFront], scale: [BOX_WIDTH, 0.1, 1], rotation: flat },
    { position: [x - BOX_WIDTH / 2, y, BOX_Z], scale: [0.1, BOX_DEPTH, 1], rotation: flat },
    { position: [x + BOX_WIDTH / 2, y, BOX_Z], scale: [0.1, BOX_DEPTH, 1], rotation: flat },
    /* stop marks for the front wheels */
    { position: [x + FRONT_AXLE, y, BOX_Z - TRACK_HALF_WIDTH], scale: [0.08, 0.6, 1], rotation: flat },
    { position: [x + FRONT_AXLE, y, BOX_Z + TRACK_HALF_WIDTH], scale: [0.08, 0.6, 1], rotation: flat },
  ];
});

/* Dashed line between the working lane and the fast lane. */
const FAST_LANE = Array.from({ length: 48 }, (_, k) => ({
  position: [-60 + k * 3, GROUND + 0.005, BOX_Z + BOX_DEPTH / 2 + 1.4],
  scale: [1.5, 0.12, 1],
  rotation: flat,
}));

const placeBoxFill = (i) => BOX_FILLS[i];
const placeBoxLine = (i) => BOX_LINES[i];
const placeFastLane = (i) => FAST_LANE[i];

/* ── Crew ──────────────────────────────────────────────────────── */

/* One person: legs, torso, helmet. Standing is 1.76 m; kneeling (the
   wheel-gun men) about 1.3 m. */
function person(x, z, pose, team, helmet) {
  const suit = TEAMS[team];
  const legs = darker(suit, 0.45);
  /* Arms hang either side of the torso, turned to face along z so the
     shoulders show from the track. */
  const arms = (y) =>
    [-0.27, 0.27].map((dx) => ({ position: [x + dx, y, z], rotation: [0, 0, dx * 0.4], colour: suit }));
  if (pose === "kneel") {
    return {
      legs: { position: [x, GROUND + 0.22, z], scale: [0.36, 0.44, 0.5], colour: legs },
      torso: { position: [x, GROUND + 0.72, z], scale: [1, 0.6, 1], colour: suit },
      head: { position: [x, GROUND + 1.17, z], colour: helmet },
      arms: arms(GROUND + 0.7),
    };
  }
  return {
    legs: { position: [x, GROUND + 0.43, z], scale: [0.36, 0.86, 0.24], colour: legs },
    torso: { position: [x, GROUND + 1.16, z], scale: [1, 0.62, 1], colour: suit },
    head: { position: [x, GROUND + 1.62, z], colour: helmet },
    arms: arms(GROUND + 1.12),
  };
}

const CREW = (() => {
  const rand = mulberry32(0x91c);
  const people = [];
  /* A few centimetres of jitter on everyone: without it the crews stand
     on a ruled grid and read as markers, not people. */
  const add = (x, z, pose, team, spread = 0.12) => {
    const helmet = rand() < 0.5 ? "#e8eaee" : TEAMS[team];
    const jx = (rand() - 0.5) * 2 * spread;
    const jz = (rand() - 0.5) * 2 * spread;
    people.push(person(x + jx, z + jz, pose, team, helmet));
  };

  for (const i of ACTIVE) {
    const cx = garageX(i);
    const team = garageTeam(i);
    for (const axle of [FRONT_AXLE, REAR_AXLE]) {
      for (const side of [-1, 1]) {
        const wz = BOX_Z + side * (TRACK_HALF_WIDTH + 0.55);
        add(cx + axle, wz, "kneel", team); // wheel gun
        add(cx + axle + 0.6, wz + side * 0.45, "stand", team); // tyre off
        add(cx + axle - 0.6, wz + side * 0.45, "stand", team); // tyre on
      }
    }
    add(cx + 3.3, BOX_Z, "stand", team); // front jack
    add(cx - 3.2, BOX_Z, "stand", team); // rear jack
    add(cx + 2.6, BOX_Z + 1.35, "stand", team); // front wing
    add(cx + 2.6, BOX_Z - 1.35, "stand", team);
    add(cx - 0.3, BOX_Z + 1.75, "stand", team); // stabilisers
    add(cx - 0.3, BOX_Z - 1.75, "stand", team);
  }

  for (const i of PREPPING) {
    const cx = garageX(i);
    const team = garageTeam(i);
    for (let k = 0; k < 8; k++) {
      add(cx - 2.8 + k * 0.8, BOX_Z + BOX_DEPTH / 2 - 0.6, "stand", team, 0.3);
    }
    add(cx - 1, GARAGE_Z + 0.9, "stand", team);
    add(cx + 1.2, GARAGE_Z + 1.1, "stand", team);
  }

  for (const i of DRESSED) {
    if (ACTIVE.includes(i) || PREPPING.includes(i)) continue;
    const cx = garageX(i);
    const team = garageTeam(i);
    const n = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      add(cx + (rand() - 0.5) * 4.4, GARAGE_Z + 0.6 + rand() * 1.6, "stand", team);
    }
  }
  return people;
})();

const ARMS = CREW.flatMap((p) => p.arms);

const placeLegs = (i) => CREW[i].legs;
const placeTorso = (i) => CREW[i].torso;
const placeHead = (i) => CREW[i].head;
const placeArm = (i) => ARMS[i];

/* ── Tyres ─────────────────────────────────────────────────────── */

/* Sets of four under electric blankets in team colour, stacked by
   every garage door; for the active boxes, the fresh set is out on
   the ground beside the car. */
const BLANKET_STACKS = DRESSED.flatMap((i) => {
  const x = garageX(i);
  const colour = TEAMS[garageTeam(i)];
  return [-2.35, 2.35].map((dx) => ({
    position: [x + dx, GROUND + 0.66, GARAGE_Z + 0.55],
    scale: [0.36, 1.32, 0.36],
    colour,
  }));
});
const LOOSE_TYRES = ACTIVE.concat(PREPPING).flatMap((i) => {
  const x = garageX(i);
  return [
    [x + 2.2, BOX_Z + 2.4],
    [x + 1.4, BOX_Z + 2.4],
    [x - 1.4, BOX_Z + 2.4],
    [x - 2.2, BOX_Z + 2.4],
  ].map(([tx, tz]) => ({ position: [tx, GROUND + 0.18, tz], scale: [0.36, 0.36, 0.36] }));
});
const placeBlanket = (i) => BLANKET_STACKS[i];
const placeLooseTyre = (i) => LOOSE_TYRES[i];

/* ── Pit gantries ──────────────────────────────────────────────── */

/* A boom off the garage front over each box, carrying the stop light
   and the air line. Green where a car is being worked on. */
const GANTRY_Y = GROUND + 5.05;
const LIGHT_Z = BOX_Z + BOX_DEPTH / 2 - 0.35;

const GANTRY_STEEL = DRESSED.flatMap((i) => {
  const x = garageX(i);
  return [
    { position: [x, GANTRY_Y, (GARAGE_Z + LIGHT_Z) / 2], scale: [0.16, 0.2, LIGHT_Z - GARAGE_Z + 0.2] },
    { position: [x, GANTRY_Y - 0.3, LIGHT_Z], scale: [0.04, 0.4, 0.04] },
    { position: [x, GANTRY_Y - 0.82, LIGHT_Z], scale: [0.34, 0.7, 0.26] },
    /* the air line dropping to the box */
    { position: [x - 0.3, GANTRY_Y - 1.4, LIGHT_Z - 0.2], scale: [0.03, 2.8, 0.03] },
  ];
});
const STOP_LAMPS = DRESSED.flatMap((i) => {
  const x = garageX(i);
  const working = ACTIVE.includes(i);
  const lamp = (dy, on, colour) => ({
    position: [x, GANTRY_Y - 0.82 + dy, LIGHT_Z + 0.135],
    scale: [0.17, 0.17, 1],
    colour: on ? colour : "#1a1c20",
  });
  return [lamp(0.21, !working, "#ff2a1f"), lamp(0, false, "#ffb000"), lamp(-0.21, working, "#2bff6a")];
});
const placeGantrySteel = (i) => GANTRY_STEEL[i];
const placeStopLamp = (i) => STOP_LAMPS[i];

/* ── Pit wall stands ───────────────────────────────────────────── */

/* The team stands on the pit wall: engineers facing the track over a
   bank of monitors. Seen from the track you get the backs of the
   monitors with a lit team strip along the top, the engineers' heads,
   and the canopy lights. */
const STAND_BACK = WALL_Z - WALL_DEPTH; // pit-lane face of the wall
/* Every 9 m, except the ones in the camera's line of sight to the working
   boxes: from the default angle those sightlines cross the wall at about
   x = 6.5, 16 and 26, so leaving 9, 18 and 27 empty opens a window onto
   the cars and their crews instead of the back of a monitor bank. */
const STANDS = [-54, -45, -36, -27, -18, -9, 0, 36, 45, 54, 63, 72].map((x, k) => ({
  x,
  team: (k * 3) % TEAMS.length,
}));

const STAND_BLOCKS = STANDS.flatMap(({ x }) => [
  { position: [x, GROUND + 0.65, STAND_BACK - 1.1], scale: [7.2, 1.3, 2.2] }, // base
  { position: [x, GROUND + 1.68, STAND_BACK - 0.2], scale: [6.6, 0.76, 0.28] }, // monitor bank
  { position: [x, GROUND + 3.42, STAND_BACK - 1.0], scale: [7.6, 0.12, 2.9] }, // canopy
  { position: [x - 3.6, GROUND + 2.36, STAND_BACK - 2.3], scale: [0.08, 2.1, 0.08] },
  { position: [x + 3.6, GROUND + 2.36, STAND_BACK - 2.3], scale: [0.08, 2.1, 0.08] },
]);
const STAND_STRIPS = STANDS.map(({ x, team }) => ({
  position: [x, GROUND + 2.09, STAND_BACK - 0.2],
  scale: [6.6, 0.06, 0.3],
  colour: TEAMS[team],
}));
/* Three engineers per stand, in team shirts — no helmets on the pit
   wall — heads and shoulders showing over the monitors. */
const SKIN = ["#c98f6b", "#8d5a3b", "#e2b48f", "#a8714f", "#5e3a26"];
const ENGINEERS = STANDS.flatMap(({ x, team }, k) =>
  [-1.9, 0.1, 2.0].map((dx, j) => ({ x: x + dx, team, skin: SKIN[(k + j * 2) % SKIN.length] }))
);
const placeStandBlock = (i) => STAND_BLOCKS[i];
const placeStandStrip = (i) => STAND_STRIPS[i];
const placeEngineerHead = (i) => ({
  position: [ENGINEERS[i].x, GROUND + 2.21, STAND_BACK - 0.75],
  colour: ENGINEERS[i].skin,
});
const placeEngineerBody = (i) => ({
  position: [ENGINEERS[i].x, GROUND + 1.93, STAND_BACK - 0.78],
  scale: [0.44, 0.4, 0.28],
  colour: darker(TEAMS[ENGINEERS[i].team], 0.3),
});
const placeCanopyLight = (i) => ({
  position: [STANDS[i].x, GROUND + 3.355, STAND_BACK - 1.0],
  scale: [7, 2.4, 1],
  rotation: [Math.PI / 2, 0, 0],
});
const placeMonitorGlow = (i) => ({
  position: [STANDS[i].x, GROUND + 1.72, STAND_BACK - 0.345],
  scale: [6.2, 0.6, 1],
  rotation: [0, Math.PI, 0],
});

/* ── Textures ──────────────────────────────────────────────────── */

/* Corrugated shutter, team stripe along the bottom edge. */
function shutter() {
  const [canvas, g] = makeCanvas(128, 128);
  for (let y = 0; y < 128; y += 4) {
    g.fillStyle = y % 8 ? "#3b4048" : "#2a2e35";
    g.fillRect(0, y, 128, 4);
  }
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(0, 112, 128, 16);
  return canvas;
}

export default function PitLane() {
  const shutterTexture = useMemo(() => toTexture(shutter()), []);
  useEffect(() => () => shutterTexture.dispose(), [shutterTexture]);

  return (
    <group>
      {/* Painted boxes: a wash of team colour, white outline, stop marks. */}
      <Instances count={BOX_FILLS.length} place={placeBoxFill} renderOrder={-1}>
        <planeGeometry />
        <meshBasicMaterial transparent opacity={0.16} depthWrite={false} />
      </Instances>
      <Instances count={BOX_LINES.length} place={placeBoxLine}>
        <planeGeometry />
        <Matte color="#d8dbdf" roughness={0.6} />
      </Instances>
      <Instances count={FAST_LANE.length} place={placeFastLane}>
        <planeGeometry />
        <Matte color="#d8dbdf" roughness={0.6} />
      </Instances>

      {/* Crew. */}
      <Instances count={CREW.length} place={placeLegs}>
        <boxGeometry />
        <Matte roughness={0.8} />
      </Instances>
      {/* Capsule torsos: rounded shoulders read as people at 30 m, where
          a tapered cylinder reads as a chess piece. */}
      <Instances count={CREW.length} place={placeTorso}>
        <capsuleGeometry args={[0.2, 0.45, 4, 10]} />
        <Matte roughness={0.7} />
      </Instances>
      <Instances count={ARMS.length} place={placeArm}>
        <capsuleGeometry args={[0.065, 0.46, 3, 6]} />
        <Matte roughness={0.7} />
      </Instances>
      <Instances count={CREW.length} place={placeHead}>
        <sphereGeometry args={[0.15, 10, 8]} />
        <Matte roughness={0.3} metalness={0.2} />
      </Instances>

      {/* Tyres: blanketed stacks at the doors, fresh sets on the ground. */}
      <Instances count={BLANKET_STACKS.length} place={placeBlanket}>
        <cylinderGeometry args={[1, 1, 1, 14]} />
        <Matte roughness={0.85} />
      </Instances>
      <Instances count={LOOSE_TYRES.length} place={placeLooseTyre}>
        <cylinderGeometry args={[1, 1, 1, 14]} />
        <Matte color="#141518" roughness={0.8} />
      </Instances>

      {/* Pit gantries and their stop lights. */}
      <Instances count={GANTRY_STEEL.length} place={placeGantrySteel}>
        <boxGeometry />
        <Matte color="#20242b" roughness={0.6} metalness={0.4} />
      </Instances>
      <Instances count={STOP_LAMPS.length} place={placeStopLamp}>
        <circleGeometry args={[0.5, 12]} />
        <meshBasicMaterial toneMapped={false} />
      </Instances>

      {/* Pit wall stands. */}
      <Instances count={STAND_BLOCKS.length} place={placeStandBlock}>
        <boxGeometry />
        <Matte color="#16191f" roughness={0.75} />
      </Instances>
      <Instances count={STAND_STRIPS.length} place={placeStandStrip}>
        <boxGeometry />
        <meshBasicMaterial toneMapped={false} />
      </Instances>
      <Instances count={ENGINEERS.length} place={placeEngineerBody}>
        <boxGeometry />
        <Matte roughness={0.8} />
      </Instances>
      <Instances count={ENGINEERS.length} place={placeEngineerHead}>
        <sphereGeometry args={[0.11, 10, 8]} />
        <Matte roughness={0.7} />
      </Instances>
      {/* Dimmer than a work light would be up close: at full white their
          reflections spread across the wet track as glare. */}
      <Instances count={STANDS.length} place={placeCanopyLight}>
        <planeGeometry />
        <meshBasicMaterial color="#a39784" toneMapped={false} side={THREE.DoubleSide} />
      </Instances>
      <Instances count={STANDS.length} place={placeMonitorGlow}>
        <planeGeometry />
        <meshBasicMaterial color="#3d7fd0" toneMapped={false} />
      </Instances>

      {/* Half-closed shutters on a few garages, for variety. */}
      {SHUTTERED.map((i) => (
        <mesh key={i} position={[garageX(i), GROUND + GARAGE_H * 0.73, GARAGE_Z - 0.35]}>
          <planeGeometry args={[GARAGE_W, GARAGE_H * 0.54]} />
          <Matte map={shutterTexture} metalness={0.4} roughness={0.6} />
        </mesh>
      ))}

      {ACTIVE.map((i) => (
        <ProxyCar key={i} position={[garageX(i), GROUND, BOX_Z]} colour={TEAMS[garageTeam(i)]} />
      ))}
    </group>
  );
}
