import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

/* ══════════════════════════════════════════════════════════════
   carGeometry — what the F1 GLB needs before it can be posed.
   Shared by the auth pages' assembling car (F1Car.jsx) and the
   home page's race car (landing/RaceCar.jsx).

   ── What the model actually contains ──────────────────────────
   f1-car-transformed.glb has THREE meshes, merged by MATERIAL and
   not by part:

     FRONT NOSE_Carbon Fiber - Twill_0   1,352,043 tris  (main body)
     Body122_Carbon Fiber - Plain_0        143,959 tris  (aero section)
     Body387_Rubber - Weathered_0          125,762 tris  (all four tyres)

   So there is no separate wheel, halo or wing node to grab:
   splitWheels() cuts the single rubber mesh into four, and
   splitBodyByHub() separates the rims and uprights (which live
   inside the body mesh) from the paintable bodywork.

   Both walk well over a million triangles, so the results are
   cached per source geometry: the two pages, and a remount of
   either, pay for the split once.
   ══════════════════════════════════════════════════════════════ */

export const MODEL_URL = "/f1-car-transformed.glb";

/* The model is Draco-compressed, and the decoder now comes from this
   site (public/draco/, copied from three's examples/jsm/libs/draco/gltf)
   instead of Google's CDN — drei's default. Fetching it from gstatic was
   the slowest step before the car could appear: ~1.2 s of a ~1.5 s
   decode locally, and 2.5 s on a first visit. Set here, once, before any
   page asks for the model. */
useGLTF.setDecoderPath("/draco/");

/* Model-space bounds, read straight out of the GLB's accessors. The car
   is authored ~100x too big, Y-up-along-its-length, and off-origin. */
export const FIT = {
  position: [0.0025, 0.349, 2.857], // centre it, then sit it on y=0
  rotation: [-Math.PI / 2, 0, 0], // model Y (length) → world Z
  scale: 0.01,
};

/* Split the merged tyre mesh into four wheels by triangle centroid.
   Each part is re-centred on its own axle so spinning it rotates in
   place rather than orbiting the car.

   Bucket order: index = (x < mid ? 0 : 1) + (y < mid ? 0 : 2). Model
   Y runs nose → tail (the nose is at low Y), so buckets 0 and 1 are
   the FRONT wheels and 2 and 3 the rears. */
function splitWheels(geometry) {
  const pos = geometry.attributes.position;
  const idx = geometry.index;
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const midX = (bb.min.x + bb.max.x) / 2;
  const midY = (bb.min.y + bb.max.y) / 2; // model Y is the car's length

  const buckets = [[], [], [], []];
  const triCount = idx ? idx.count / 3 : pos.count / 3;
  const at = (t, k) => (idx ? idx.getX(t * 3 + k) : t * 3 + k);

  for (let t = 0; t < triCount; t++) {
    const a = at(t, 0), b = at(t, 1), c = at(t, 2);
    const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
    const cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
    buckets[(cx < midX ? 0 : 1) + (cy < midY ? 0 : 2)].push(a, b, c);
  }

  /* Build a compact geometry per cluster rather than cloning and
     re-indexing. computeBoundingBox() measures the POSITION attribute,
     not the index, so a clone keeps all 63k vertices and every wheel
     reports the whole mesh's centre — which would pivot all four about
     the car's middle and make them orbit instead of spin. Copying only
     each cluster's own vertices gives it a correct centre, and lets
     frustum culling work per wheel. */
  const names = Object.keys(geometry.attributes);
  return buckets.map((tri) => {
    const remap = new Map();
    const out = {};
    names.forEach((n) => (out[n] = []));
    const indices = new Array(tri.length);

    for (let i = 0; i < tri.length; i++) {
      const v = tri[i];
      let n = remap.get(v);
      if (n === undefined) {
        n = remap.size;
        remap.set(v, n);
        for (const name of names) {
          const a = geometry.attributes[name];
          for (let k = 0; k < a.itemSize; k++) {
            out[name].push(a.array[v * a.itemSize + k]);
          }
        }
      }
      indices[i] = n;
    }

    const g = new THREE.BufferGeometry();
    for (const name of names) {
      g.setAttribute(
        name,
        new THREE.Float32BufferAttribute(out[name], geometry.attributes[name].itemSize)
      );
    }
    g.setIndex(indices);
    g.computeBoundingBox();
    const c = g.boundingBox.getCenter(new THREE.Vector3());
    g.translate(-c.x, -c.y, -c.z); // pivot on this wheel's own axle
    g.computeBoundingSphere();
    return { geometry: g, centre: [c.x, c.y, c.z] };
  });
}

/* Split the body mesh into painted bodywork and wheel hardware.

   Body122 turns out NOT to hold the rims and suspension — measured, its
   world bounds are x -2.32..-0.38, z ±0.54, a rear-centre structure that
   contains no wheel at all. The rims, brake assemblies and uprights live
   inside the big FRONT NOSE mesh, which is why painting that red turned
   them red too.

   They are still separable geometrically: the hardware sits inside a
   cylinder around each hub (the axle runs along the model's X axis).
   Rather than duplicate 687k vertices, this reorders the index buffer so
   bodywork triangles come first, then adds two draw groups over shared
   attributes — group 0 takes the paint, group 1 the dark metal. */
function splitBodyByHub(geometry, hubs) {
  const pos = geometry.attributes.position.array;
  const src = geometry.index.array;
  const triCount = src.length / 3;

  const RADIUS = 30; // model units; wheel radius is ~28.6
  const HALF_TREAD = 24;

  const paint = [];
  const hardware = [];
  for (let t = 0; t < triCount; t++) {
    const i0 = src[t * 3], i1 = src[t * 3 + 1], i2 = src[t * 3 + 2];
    const a = i0 * 3, b = i1 * 3, c = i2 * 3;
    const cx = (pos[a] + pos[b] + pos[c]) / 3;
    const cy = (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3;
    const cz = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;

    let isHardware = false;
    for (let h = 0; h < hubs.length; h++) {
      const dy = cy - hubs[h][1];
      const dz = cz - hubs[h][2];
      if (
        dy * dy + dz * dz < RADIUS * RADIUS &&
        Math.abs(cx - hubs[h][0]) < HALF_TREAD
      ) {
        isHardware = true;
        break;
      }
    }
    const dst = isHardware ? hardware : paint;
    dst.push(i0, i1, i2);
  }

  const g = new THREE.BufferGeometry();
  /* Attributes are shared by reference, so this costs no extra memory. */
  for (const name of Object.keys(geometry.attributes)) {
    g.setAttribute(name, geometry.attributes[name]);
  }
  g.setIndex(paint.concat(hardware));
  g.clearGroups();
  g.addGroup(0, paint.length, 0);
  g.addGroup(paint.length, hardware.length, 1);
  g.boundingBox = geometry.boundingBox;
  g.boundingSphere = geometry.boundingSphere;
  return g;
}

const wheelCache = new WeakMap();
const bodyCache = new WeakMap();

/** The four wheels of the rubber mesh — [{ geometry, centre }]. */
export function wheelsOf(rubberGeometry) {
  let wheels = wheelCache.get(rubberGeometry);
  if (!wheels) {
    wheels = splitWheels(rubberGeometry);
    wheelCache.set(rubberGeometry, wheels);
  }
  return wheels;
}

/** The body with draw group 0 = paint, group 1 = wheel hardware. */
export function paintedBodyOf(bodyGeometry, wheels) {
  let body = bodyCache.get(bodyGeometry);
  if (!body) {
    body = splitBodyByHub(bodyGeometry, wheels.map((w) => w.centre));
    bodyCache.set(bodyGeometry, body);
  }
  return body;
}
