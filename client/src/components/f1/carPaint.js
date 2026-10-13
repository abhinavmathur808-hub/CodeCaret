import * as THREE from "three";
import { CAR_PAINT } from "./theme";

/* ══════════════════════════════════════════════════════════════
   carPaint — the auth car's two materials, made once and shared.

   F1Car paints the model with them, and the stage compiles their
   shader alongside the circuit's while the model is still on its way
   (PAINT_PROBE in StageCanvas.jsx), so the car's first frame finds it
   ready instead of stalling on a compile. Being module-level, they also
   outlive a remount: moving between /signin and /signup no longer
   builds a fresh pair each time.
   ══════════════════════════════════════════════════════════════ */

/* The GLB ships bare carbon — every body material is near-black (base
   colour 0.098) at metalness ~0.76, which reads as a grey car. This
   paints the bodywork in the matte crimson modern Ferraris use to save
   weight. The tyres keep the model's own rubber material. */
export const carPaint = new THREE.MeshPhysicalMaterial({
  color: CAR_PAINT, // Ferrari Rosso Corsa
  metalness: 0.1, // solid-colour paint, not a metal
  roughness: 0.3, // smooth base coat
  clearcoat: 1.0, // full lacquer clearcoat — the showroom shine
  clearcoatRoughness: 0.1, // tight, wet-looking reflections
  envMapIntensity: 1.3, // let the studio strips read on the paint
});

/* The aero, suspension and rims, which should read as machined metal
   rather than painted bodywork. */
export const carMetal = new THREE.MeshPhysicalMaterial({
  color: "#080808", // deep carbon black
  metalness: 0.8, // high metalness for carbon reflection
  roughness: 0.5, // matte finish on the wings and floor
  clearcoat: 0.1,
  clearcoatRoughness: 0.6,
});
