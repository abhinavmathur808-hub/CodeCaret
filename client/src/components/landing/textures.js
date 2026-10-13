import { useEffect, useState } from "react";
import * as THREE from "three";
import { N, P, TRACK_LENGTH, DS } from "./trackLayout.js";

/* ══════════════════════════════════════════════════════════════
   textures — every image the home page's scene uses, drawn in code
   on a canvas at load. No raster files ship with the page.
   ══════════════════════════════════════════════════════════════ */

export const MONO = '"JetBrains Mono", "Fira Code", Consolas, monospace';
export const SANS = 'Inter, "Segoe UI", system-ui, sans-serif';
/* The logo's lettering — the taglines on the boards and the ticker. */
export const BRAND = '"Kaushan Script", "Segoe Script", cursive';
/* The site's heading face — signs, hologram titles, labels, numerals. */
export const DISPLAY = 'Saira, "Segoe UI", system-ui, sans-serif';

/* Canvas text needs its webfonts actually loaded first, or the first
   draw silently falls back to a system face and stays that way. */
let fontsPromise = null;
export function loadFonts() {
  if (!fontsPromise) {
    const faces = [
      `500 32px ${MONO}`,
      `700 32px ${MONO}`,
      `800 32px ${SANS}`,
      `900 32px ${SANS}`,
      `600 32px ${SANS}`,
      `400 32px ${BRAND}`,
      `500 32px ${DISPLAY}`,
      `600 32px ${DISPLAY}`,
      `700 32px ${DISPLAY}`,
      `800 32px ${DISPLAY}`,
    ];
    const wait = document.fonts
      ? Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null)))
      : Promise.resolve();
    /* Never hold the scene hostage to a font CDN. */
    fontsPromise = Promise.race([wait, new Promise((r) => setTimeout(r, 2500))]);
  }
  return fontsPromise;
}

/* The logo (public/logo-mark.png: black line art, transparent), for
   drawing into canvas textures. Resolves null if it will not load —
   signs then fall back to lettering alone. */
let logoPromise = null;
export function loadLogo() {
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = "/logo-mark.png";
      setTimeout(() => resolve(null), 4000);
    });
  }
  return logoPromise;
}

/* Fonts and logo both in hand: the moment signs can be drawn. */
export function useBrandReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([loadFonts(), loadLogo()]).then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  return ready;
}

/* The loaded logo recoloured (white for dark signs, say). Cached per
   colour; null until loadLogo() has resolved with an image. */
let logoImage = null;
loadLogo().then((img) => {
  logoImage = img;
});
const tinted = new Map();
export function logoArt(colour = "#ffffff") {
  if (!logoImage) return null;
  let c = tinted.get(colour);
  if (!c) {
    c = document.createElement("canvas");
    c.width = logoImage.naturalWidth;
    c.height = logoImage.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(logoImage, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = colour;
    g.fillRect(0, 0, c.width, c.height);
    tinted.set(colour, c);
  }
  return c;
}

/** Draw the logo into a box, centred, keeping its proportions. */
export function drawLogo(ctx, x, y, w, h, colour = "#ffffff") {
  const art = logoArt(colour);
  if (!art) return false;
  const k = Math.min(w / art.width, h / art.height);
  const dw = art.width * k, dh = art.height * k;
  ctx.drawImage(art, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  return true;
}

/** A CanvasTexture drawn once by `draw(ctx, w, h)`. */
export function canvasTexture(width, height, draw, { srgb = true, repeat = false, anisotropy = 8 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* ── Glyph atlas for the rising code ─────────────────────────────
   8 × 8 cells of code punctuation and keywords, white on black; the
   shader reads the red channel as coverage. */
const GLYPHS = [
  "{", "}", "(", ")", "[", "]", "<", ">",
  ";", ":", "=", "+", "-", "*", "/", "%",
  "&", "|", "!", "?", "#", "$", "@", "_",
  "=>", "&&", "||", "::", "++", "!=", "==", "->",
  "0", "1", "2", "3", "4", "5", "6", "7",
  "8", "9", "x", "i", "n", "fn", "if", "def",
  "let", "for", "int", "var", "new", "try", "len", "map",
  "</>", "{}", "()", "[]", "//", "/*", "0x", "λ",
];

export function glyphAtlas() {
  return canvasTexture(
    512,
    512,
    (ctx) => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      GLYPHS.forEach((g, i) => {
        const x = (i % 8) * 64 + 32;
        const y = Math.floor(i / 8) * 64 + 34;
        const size = g.length === 1 ? 46 : g.length === 2 ? 34 : 26;
        ctx.font = `700 ${size}px ${MONO}`;
        ctx.fillText(g, x, y);
      });
    },
    { srgb: false, anisotropy: 4 }
  );
}

/* ── The circuit seen from above ─────────────────────────────────
   A soft white map of where the track runs. The floor shader uses it
   to pool the deck's glow on the ground beneath it; the city uses it
   to keep its towers out of the way. */
export const MASK_BOUNDS = (() => {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < N; i++) {
    minX = Math.min(minX, P[i * 3]);
    maxX = Math.max(maxX, P[i * 3]);
    minZ = Math.min(minZ, P[i * 3 + 2]);
    maxZ = Math.max(maxZ, P[i * 3 + 2]);
  }
  const pad = 420;
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const half = Math.max(maxX - minX, maxZ - minZ) / 2 + pad;
  return { minX: cx - half, minZ: cz - half, size: half * 2, cx, cz };
})();

export function trackMask() {
  const RES = 1024;
  const { minX, minZ, size } = MASK_BOUNDS;
  const k = RES / size;
  const path = (ctx) => {
    ctx.beginPath();
    for (let s = 0; s <= TRACK_LENGTH; s += 4) {
      const i = Math.round(s / DS) * 3;
      const x = (P[i] - minX) * k, y = (P[i + 2] - minZ) * k;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  };
  let data = null;
  const texture = canvasTexture(
    RES,
    RES,
    (ctx) => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, RES, RES);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#fff";
      /* Wide and faint for the glow, narrow and bright at the core. */
      ctx.filter = "blur(18px)";
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 120 * k;
      path(ctx);
      ctx.stroke();
      ctx.filter = "blur(4px)";
      ctx.globalAlpha = 1;
      ctx.lineWidth = 34 * k;
      path(ctx);
      ctx.stroke();
      data = ctx.getImageData(0, 0, RES, RES).data;
    },
    { srgb: false, anisotropy: 4 }
  );
  texture.flipY = false;
  texture.needsUpdate = true;
  /** 0–1 near-track-ness at a world (x, z). */
  const sample = (x, z) => {
    const u = Math.floor((x - minX) * k), v = Math.floor((z - minZ) * k);
    if (u < 0 || v < 0 || u >= RES || v >= RES) return 0;
    return data[(v * RES + u) * 4] / 255;
  };
  return { texture, sample };
}

/* Small deterministic PRNG, so the city is the same on every visit. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
