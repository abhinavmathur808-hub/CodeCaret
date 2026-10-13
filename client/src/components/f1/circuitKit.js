import * as THREE from "three";
import { STAGE_FLOOR_Y } from "./theme";

/* ══════════════════════════════════════════════════════════════
   circuitKit — the layout and texture helpers shared by the night
   circuit (CircuitScene.jsx) and its pit lane (PitLane.jsx).

   World: metres, y up, the car at the origin pointing down +x.
   Track along x, pit lane and garages on −z, grandstand on +z.
   ══════════════════════════════════════════════════════════════ */

/* Just under the pedestal's own floor layers (shadow catcher at
   −0.223), so they never fight it for depth. */
export const GROUND = STAGE_FLOOR_Y - 0.006;
export const LENGTH = 220; // straight drawn along x; fog takes the ends
export const TRACK_HALF = 9;
export const KERB_Z = 9.65;
export const WALL_Z = -12.6; // track face of the pit wall
export const WALL_H = 1.15;
export const WALL_DEPTH = 0.64;
export const GARAGE_Z = -27; // garage fronts
export const GARAGE_PITCH = 7;
export const GARAGE_W = 5.4;
export const GARAGE_H = 4.3;
export const BARRIER_Z = TRACK_HALF + 3.6; // track face of the grandstand-side barrier
export const STAND_Z = 22; // front of the grandstand's bottom tier

/* Grid slots behind the car on pole: [x of the slot line, z]. */
export const GRID_SLOTS = [
  [-12, -3.3],
  [-20, 3.3],
  [-28, -3.3],
  [-36, 3.3],
  [-44, -3.3],
];

/* The low-detail cars (ProxyCar): axle positions from the car's centre,
   and the wheel centres' distance either side of its centre line. */
export const FRONT_AXLE = 1.6;
export const REAR_AXLE = -1.55;
export const TRACK_HALF_WIDTH = 0.82;

/* Team colours, one per garage in turn. */
export const TEAMS = ["#e10600", "#27f4d2", "#ff8000", "#3671c6", "#229971", "#ff87bc", "#b6babd", "#fff500"];

/* Developer-flavoured team names, matching the timing screens. */
export const TEAM_NAMES = ["CODECARET", "VIM RACING", "GIT GP", "NPM", "TSX", "API", "CSS", "REGEX"];

export const GARAGES = Math.floor(LENGTH / GARAGE_PITCH);
export const garageX = (i) => -LENGTH / 2 + GARAGE_PITCH / 2 + i * GARAGE_PITCH;
export const garageTeam = (i) => i % TEAMS.length;

export function makeCanvas(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext("2d")];
}

/* Seeded, so the scenery is the same on every load. */
export function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function toTexture(canvas, { srgb = true, repeat } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  texture.anisotropy = 8;
  return texture;
}

/* One canvas, several views of it: offset and repeat live on the texture
   object, so each tile of an atlas needs its own. `tiles` across, one row. */
export function atlas(canvas, tiles) {
  return Array.from({ length: tiles }, (_, i) => {
    const t = toTexture(canvas);
    t.repeat.set(1 / tiles, 1);
    t.offset.set(i / tiles, 0);
    return t;
  });
}
