import * as THREE from "three";
import { BRAND_ACCENT } from "./themeAccent.js";

/* ══════════════════════════════════════════════════════════════
   accent — the theme colour the 3D scene is lit with.

   The home page is a night circuit whatever the palette, but its
   neon follows the visitor's chosen theme: red on Carbon (the
   default), sky blue on Midnight, emerald on Verdant… Light themes
   keep CodeCaret red, because their accents are tuned to sit on a
   white page and go muddy as light against a black sky.

   ACCENT and PAINT are uniform objects shared by every landing
   shader, so a theme switch (settings sync can land one a second
   after load) is a colour copy, not a rebuild. Which colour the
   theme asks for is read in themeAccent.js, which the page shell
   uses too without pulling three.js in.
   ══════════════════════════════════════════════════════════════ */

const BRAND_PAINT = "#a6051a"; // the auth pages' car, kept on Carbon

export const ACCENT = { value: new THREE.Color(BRAND_ACCENT) };
export const PAINT = { value: new THREE.Color(BRAND_PAINT) };

const listeners = new Set();

/** Subscribe to accent changes; returns the unsubscribe. */
export function onAccent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applyAccent(hex) {
  ACCENT.value.set(hex);
  if (hex === BRAND_ACCENT) {
    PAINT.value.set(BRAND_PAINT);
  } else {
    /* A deep, saturated version of the accent: the paint has a full
       clearcoat, so a bright base reads as plastic. Near-grey
       accents (Graphite, Steel) stay near-grey — a silver car. */
    const hsl = {};
    new THREE.Color(hex).getHSL(hsl, THREE.SRGBColorSpace);
    const sat = hsl.s < 0.25 ? hsl.s : Math.max(0.55, hsl.s * 0.92);
    PAINT.value.setHSL(hsl.h, sat, hsl.s < 0.25 ? 0.42 : 0.33, THREE.SRGBColorSpace);
  }
  listeners.forEach((fn) => fn());
}
