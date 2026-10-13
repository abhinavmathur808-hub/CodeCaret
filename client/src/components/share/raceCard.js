/* ══════════════════════════════════════════════════════════════
   raceCard — the lap you just finished, drawn as a share image.

   Everything on the card is drawn here in canvas paths and text: the
   carbon weave, the waving chequered flag, the speed trace, the
   tiles. The only bitmap is the CodeCaret logo, recoloured white. It
   is a canvas rather than an SVG because the result has to become a
   PNG, and a canvas draws with the page's own webfonts — an SVG
   rasterised through <img> would fall back to system faces.

   Three sizes, one per kind of post:
     square  1080 × 1080   feed posts — Instagram, LinkedIn, X, WhatsApp
     story   1080 × 1920   Instagram and WhatsApp stories / status
     wide    1600 ×  900   X and LinkedIn timelines

   `card` is plain data assembled for the results screen — see the
   `shareCard` memo in TestTypingSandbox.jsx for what each field means.
   ══════════════════════════════════════════════════════════════ */

export const CARD_FORMATS = {
  square: { id: "square", label: "Square", hint: "Feed posts", w: 1080, h: 1080 },
  story: { id: "story", label: "Story", hint: "Stories & status", w: 1080, h: 1920 },
  wide: { id: "wide", label: "Wide", hint: "X & LinkedIn", w: 1600, h: 900 },
};

const DISPLAY = "Saira";
const BRAND = '"Kaushan Script"';
const MONO = '"JetBrains Mono"';

const INK = "#f4f5f7";
const INK_2 = "rgba(244, 245, 247, 0.74)";
const INK_3 = "rgba(244, 245, 247, 0.5)";
const INK_4 = "rgba(244, 245, 247, 0.3)";
const LINE = "rgba(255, 255, 255, 0.1)";

/* The results screen's award colours, so a card and the screen it
   came from agree: gold is a personal best, purple a track record
   (F1's fastest-lap purple), and the podium keeps its medals. */
const GOLD = "#facc15";
const PURPLE = "#c084fc";
const MEDAL = { 1: "#ffd700", 2: "#c0c0c0", 3: "#cd7f32" };
const GAIN = "#22c55e";
const LOSS = "#f87171";
const SECTOR_TONES = [null, "#3b82f6", "#ffd000"]; // S1 takes the accent

const font = (weight, size, family, italic = false) =>
  `${italic ? "italic " : ""}${weight} ${Math.round(size)}px ${family}`;

/* ── Assets ────────────────────────────────────────────────────
   Fonts are the page's own (index.css asks Google Fonts for them),
   but a canvas does not wait for a face the way a stylesheet does —
   draw before Saira has arrived and the card silently comes out in
   Arial. So every face the card uses is requested up front, with a
   cap: a font that never loads costs a fallback face, not a card. */
const FACES = [
  `800 100px ${DISPLAY}`,
  `italic 800 100px ${DISPLAY}`,
  `700 100px ${DISPLAY}`,
  `600 100px ${DISPLAY}`,
  `500 100px ${DISPLAY}`,
  `400 100px ${BRAND}`,
  `700 100px ${MONO}`,
  `500 100px ${MONO}`,
];

let assets = null;

function loadLogo() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      /* The art is black line-work; the card is dark. Filled white
         through its own alpha — `source-in` keeps the shape and
         swaps the colour — which, unlike ctx.filter, every browser
         that can share a file also supports. */
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      g.globalCompositeOperation = "source-in";
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, c.width, c.height);
      resolve(c);
    };
    img.onerror = () => resolve(null);
    img.src = "/logo-mark.png";
  });
}

/** Fonts and logo, loaded once per page and shared by every card. */
export function loadCardAssets() {
  if (!assets) {
    const fonts = document.fonts
      ? Promise.race([
          Promise.all(FACES.map((f) => document.fonts.load(f).catch(() => null))),
          new Promise((r) => setTimeout(r, 3000)),
        ])
      : Promise.resolve();
    assets = Promise.all([fonts, loadLogo()]).then(([, logo]) => ({ logo }));
  }
  return assets;
}

/* ── Small drawing helpers ───────────────────────────────────── */

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** A deterministic random stream, so one lap always draws one card. */
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function spacing(ctx, px) {
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** A parallelogram leaning right, the slant of a timing graphic. */
function slantPath(ctx, x, y, w, h, lean) {
  ctx.beginPath();
  ctx.moveTo(x + lean, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - lean, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

/** Largest size (down to `min`) at which `text` fits in `maxWidth`. */
function fitSize(ctx, text, maxWidth, size, min, make) {
  let s = size;
  for (;;) {
    ctx.font = make(s);
    if (ctx.measureText(text).width <= maxWidth || s <= min) return s;
    s -= 2;
  }
}

/** Trims `text` with an ellipsis until it fits at the current font. */
function ellipsize(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Draws `text` fitted to `maxWidth`: shrinks to `min`, then trims. */
function fittedText(ctx, text, x, y, maxWidth, size, min, make) {
  fitSize(ctx, text, maxWidth, size, min, make);
  const shown = ellipsize(ctx, text, maxWidth);
  ctx.fillText(shown, x, y);
  return ctx.measureText(shown).width;
}

/* ── Background ────────────────────────────────────────────────
   Carbon fibre, a red glow, speed streaks and the logo as a
   watermark. All quiet: the card's numbers are what carry it. */

function carbonPattern(ctx, cell) {
  const c = document.createElement("canvas");
  c.width = c.height = cell * 2;
  const g = c.getContext("2d");
  /* A 2×2 twill: each tow is a rounded bar lit along its length, the
     neighbours turned 90°, which is all the eye needs to read weave. */
  const tow = (x, y, horizontal) => {
    const grad = horizontal
      ? g.createLinearGradient(x, y, x, y + cell)
      : g.createLinearGradient(x, y, x + cell, y);
    grad.addColorStop(0, "#0b0c0f");
    grad.addColorStop(0.5, "#17191e");
    grad.addColorStop(1, "#08090b");
    g.fillStyle = grad;
    g.fillRect(x, y, cell, cell);
  };
  tow(0, 0, true);
  tow(cell, cell, true);
  tow(cell, 0, false);
  tow(0, cell, false);
  return ctx.createPattern(c, "repeat");
}

function paintBackground(ctx, W, H, accent, logo, rand, glow) {
  ctx.fillStyle = "#050608";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = carbonPattern(ctx, Math.round(Math.min(W, H) / 90));
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  /* The glow sits behind the big number, wherever a format puts it. */
  const g = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, glow.r);
  g.addColorStop(0, rgba(accent, 0.3));
  g.addColorStop(0.45, rgba(accent, 0.1));
  g.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  /* Speed streaks: long, thin, raked forward, fading at both ends. */
  ctx.save();
  ctx.translate(W / 2, glow.y);
  ctx.rotate(-0.32);
  const span = Math.hypot(W, H);
  for (let i = 0; i < 12; i++) {
    const y = (rand() - 0.5) * glow.r * 0.9;
    const len = span * (0.22 + rand() * 0.3);
    const x = (rand() - 0.5) * span * 0.5;
    const lit = rand() < 0.3;
    const grad = ctx.createLinearGradient(x - len / 2, 0, x + len / 2, 0);
    const tone = lit ? accent : "#ffffff";
    const peak = lit ? 0.22 + rand() * 0.18 : 0.04 + rand() * 0.06;
    grad.addColorStop(0, rgba(tone, 0));
    grad.addColorStop(0.5, rgba(tone, peak));
    grad.addColorStop(1, rgba(tone, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(x - len / 2, y, len, 1.5 + rand() * (lit ? 4 : 2.5));
  }
  ctx.restore();

  if (logo) {
    const h = Math.min(W, H) * 0.62;
    const w = (h * logo.width) / logo.height;
    ctx.save();
    ctx.globalAlpha = 0.045;
    ctx.translate(W - w * 0.42, H - h * 0.38);
    ctx.rotate(-0.16);
    ctx.drawImage(logo, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  /* Vignette, so the edges hold the eye in. */
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/* ── The chequered flag ────────────────────────────────────────
   A band of squares rippling along a sine, shaded by the slope of
   that same wave, so it reads as cloth in the wind. Light squares go
   down as one shape first and dark ones over them, which leaves no
   hairline seams between neighbours. */
function paintFlag(ctx, W, top, rows, size) {
  const amp = size * 0.3;
  const k = (Math.PI * 2) / (size * 11);
  const phase = 0.9;
  const lift = (x) => amp * Math.sin(k * x + phase);
  const height = rows * size;
  const cols = Math.ceil(W / size) + 1;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = size * 0.6;
  ctx.shadowOffsetY = size * 0.25;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, top + lift(x));
  for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, top + height + lift(x));
  ctx.closePath();
  ctx.fillStyle = "#e9eaec";
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#0d0e10";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2 === 0) continue;
      const x0 = c * size;
      const x1 = x0 + size;
      const y0 = top + r * size;
      const y1 = y0 + size;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + lift(x0));
      for (let x = x0 + 8; x < x1; x += 8) ctx.lineTo(x, y0 + lift(x));
      ctx.lineTo(x1, y0 + lift(x1));
      ctx.lineTo(x1, y1 + lift(x1));
      for (let x = x1 - 8; x > x0; x -= 8) ctx.lineTo(x, y1 + lift(x));
      ctx.lineTo(x0, y1 + lift(x0));
      ctx.closePath();
      ctx.fill();
    }
  }

  /* Folds: light where the cloth faces up the wave, shade where it
     turns away. Clipped to the band, multiplied over both colours. */
  ctx.save();
  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, top + lift(x));
  for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, top + height + lift(x));
  ctx.closePath();
  ctx.clip();
  const folds = ctx.createLinearGradient(0, 0, W, 0);
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const x = (W * i) / steps;
    const slope = Math.cos(k * x + phase);
    folds.addColorStop(
      i / steps,
      slope > 0 ? `rgba(255,255,255,${0.16 * slope})` : `rgba(0,0,0,${-0.42 * slope})`
    );
  }
  ctx.fillStyle = folds;
  ctx.fillRect(0, top - amp, W, height + amp * 2);
  ctx.restore();

  return top + height + amp;
}

/* ── Furniture ───────────────────────────────────────────────── */

function paintCorners(ctx, W, H, inset, len) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 3;
  ctx.lineCap = "square";
  for (const [x, y, dx, dy] of [
    [inset, H - inset, 1, -1],
    [W - inset, H - inset, -1, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * len, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * len);
    ctx.stroke();
  }
  ctx.restore();
}

function paintLogo(ctx, logo, x, y, h, align = "left") {
  if (!logo) {
    ctx.font = font(400, h * 0.5, BRAND);
    ctx.fillStyle = INK;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText("CodeCaret", x, y + h / 2);
    ctx.textBaseline = "alphabetic";
    return ctx.measureText("CodeCaret").width;
  }
  const w = (h * logo.width) / logo.height;
  const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.drawImage(logo, left, y, w, h);
  return w;
}

function dateLabel(date) {
  return date
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

/** The title block: eyebrow, track name, and what kind of track. */
function paintTrackBlock(ctx, card, x, y, maxW, s, align) {
  ctx.textAlign = align;
  ctx.fillStyle = card.accent;
  ctx.font = font(400, 50 * s, BRAND);
  ctx.fillText("Chequered flag", x, y);

  ctx.fillStyle = INK;
  fittedText(ctx, card.track.title, x, y + 60 * s, maxW, 48 * s, 30 * s, (z) => font(700, z, DISPLAY));

  const meta = [card.track.language, card.track.topic, card.track.length].filter(Boolean).join("  ·  ");
  ctx.fillStyle = INK_2;
  spacing(ctx, 0.5 * s);
  fittedText(ctx, meta, x, y + 106 * s, maxW, 28 * s, 20 * s, (z) => font(500, z, DISPLAY));
  spacing(ctx, 0);
  return y + 106 * s;
}

/** The achievement this lap earned, as a slanted timing-graphic tag. */
function achievementOf(card) {
  const a = card.achievement;
  if (!a) return null;
  if (a.kind === "record") return { tone: PURPLE, label: "New track record", detail: "Fastest lap by anyone" };
  if (a.kind === "pb")
    return { tone: GOLD, label: "New personal best", detail: `+${a.delta} WPM on your previous ${a.previous}` };
  if (a.kind === "podium") {
    const medal = MEDAL[a.position];
    return {
      tone: medal || INK,
      label: `P${a.position}`,
      detail: medal ? "on this track's podium" : "on this track's leaderboard",
    };
  }
  return null;
}

function paintBadge(ctx, card, x, y, s, align, maxW) {
  const a = achievementOf(card);
  if (!a) return 0;
  const h = 56 * s;
  const lean = 16 * s;
  const padX = 26 * s;
  ctx.font = font(800, 28 * s, DISPLAY, true);
  const lw = ctx.measureText(a.label).width;
  ctx.font = font(600, 24 * s, DISPLAY);
  const gap = 16 * s;
  let detail = a.detail;
  let dw = ctx.measureText(detail).width;
  const room = maxW - (padX * 2 + lw + gap + lean);
  if (dw > room) {
    detail = ellipsize(ctx, detail, Math.max(0, room));
    dw = ctx.measureText(detail).width;
  }
  const w = padX * 2 + lw + (detail ? gap + dw : 0) + lean;
  const left = align === "center" ? x - w / 2 : x;

  ctx.save();
  slantPath(ctx, left, y, w, h, lean);
  ctx.fillStyle = rgba(a.tone, 0.14);
  ctx.fill();
  ctx.strokeStyle = rgba(a.tone, 0.55);
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  /* The solid leading edge, like a timing tower's team colour. */
  slantPath(ctx, left, y, lean + 10 * s, h, lean);
  ctx.fillStyle = a.tone;
  ctx.fill();
  ctx.restore();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  let tx = left + lean + padX - 2 * s;
  ctx.fillStyle = a.tone;
  ctx.font = font(800, 28 * s, DISPLAY, true);
  ctx.fillText(a.label, tx, y + h / 2 + 1 * s);
  tx += lw + gap;
  if (detail) {
    ctx.fillStyle = INK_2;
    ctx.font = font(600, 24 * s, DISPLAY);
    ctx.fillText(detail, tx, y + h / 2 + 1 * s);
  }
  ctx.textBaseline = "alphabetic";
  return h;
}

/** The big number. Saira italic, the way a race graphic sets a time. */
function paintHero(ctx, card, x, baseline, size, align, accent) {
  const num = String(card.wpm);
  ctx.font = font(800, size, DISPLAY, true);
  const nw = ctx.measureText(num).width;
  const unitSize = size * 0.24;
  ctx.font = font(800, unitSize, DISPLAY, true);
  const uw = ctx.measureText("WPM").width;
  const gap = size * 0.06;
  const total = nw + gap + uw;
  const left = align === "center" ? x - total / 2 : x;

  ctx.textAlign = "left";
  ctx.save();
  ctx.shadowColor = rgba(accent, 0.55);
  ctx.shadowBlur = size * 0.22;
  ctx.font = font(800, size, DISPLAY, true);
  ctx.fillStyle = INK;
  ctx.fillText(num, left, baseline);
  ctx.restore();

  ctx.font = font(800, unitSize, DISPLAY, true);
  ctx.fillStyle = accent;
  ctx.fillText("WPM", left + nw + gap, baseline);
  ctx.font = font(600, unitSize * 0.42, DISPLAY);
  ctx.fillStyle = INK_3;
  spacing(ctx, 1);
  ctx.fillText("Average pace", left + nw + gap + 2, baseline - unitSize * 1.05);
  spacing(ctx, 0);
  return total;
}

function tilesFor(card) {
  const tiles = [
    { label: "Accuracy", value: `${card.accuracy}`, unit: "%" },
    { label: "Race time", value: card.timeLabel },
    { label: "Peak pace", value: `${card.peakWpm}`, unit: "WPM" },
  ];
  if (card.rating) {
    const d = card.rating.delta;
    tiles.push({
      label: "Rating",
      value: d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "0",
      unit: `${card.rating.value}`,
      tone: d > 0 ? GAIN : d < 0 ? LOSS : INK,
    });
  } else {
    tiles.push({ label: "Characters", value: `${card.characters}` });
  }
  return tiles;
}

function paintTiles(ctx, card, x, y, w, h, cols, s) {
  const tiles = tilesFor(card);
  const rows = Math.ceil(tiles.length / cols);
  const gap = 16 * s;
  const tw = (w - gap * (cols - 1)) / cols;
  const th = (h - gap * (rows - 1)) / rows;
  tiles.forEach((t, i) => {
    const tx = x + (i % cols) * (tw + gap);
    const ty = y + Math.floor(i / cols) * (th + gap);
    roundRectPath(ctx, tx, ty, tw, th, 6 * s);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();
    ctx.fillStyle = card.accent;
    ctx.fillRect(tx, ty + 18 * s, 4 * s, 30 * s);

    const pad = 24 * s;
    ctx.textAlign = "left";
    ctx.fillStyle = INK_3;
    ctx.font = font(600, 24 * s, DISPLAY);
    ctx.fillText(t.label, tx + pad, ty + 42 * s);

    const unit = t.unit ? (t.unit === "%" ? "%" : ` ${t.unit}`) : "";
    ctx.font = font(600, 24 * s, DISPLAY);
    const uw = unit ? ctx.measureText(unit).width : 0;
    const vs = fitSize(ctx, t.value, tw - pad * 2 - uw, Math.min(56 * s, th * 0.46), 26 * s, (z) => font(700, z, MONO));
    const vy = ty + th - 26 * s;
    ctx.fillStyle = t.tone || INK;
    ctx.font = font(700, vs, MONO);
    ctx.fillText(t.value, tx + pad, vy);
    if (unit) {
      const vw = ctx.measureText(t.value).width;
      ctx.fillStyle = INK_3;
      ctx.font = font(600, 24 * s, DISPLAY);
      ctx.fillText(unit, tx + pad + vw, vy);
    }
  });
}

/* ── Speed trace ───────────────────────────────────────────────
   The lap's WPM over time, as a monotone curve so it never
   overshoots between samples (the same interpolation the results
   screen's chart uses), with the sector splits marked on it. */

function tracePoints(trace) {
  const out = [];
  for (const p of trace || []) {
    if (!Number.isFinite(p.time) || !Number.isFinite(p.wpm)) continue;
    if (out.length && p.time <= out[out.length - 1].time) out[out.length - 1] = p;
    else out.push(p);
  }
  return out;
}

function monotone(ctx, pts) {
  const n = pts.length;
  const dx = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    m[i] = dx[i] ? (pts[i + 1].y - pts[i].y) / dx[i] : 0;
  }
  const t = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const q = a * a + b * b;
    if (q > 9) {
      const k = 3 / Math.sqrt(q);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    ctx.bezierCurveTo(pts[i].x + h, pts[i].y + t[i] * h, pts[i + 1].x - h, pts[i + 1].y - t[i + 1] * h, pts[i + 1].x, pts[i + 1].y);
  }
}

/** Curve, fill and peak dot for `raw` inside the given plot box. */
function paintCurve(ctx, card, raw, px, py, pw, ph, s) {
  const tMax = raw[raw.length - 1].time || 1;
  const vMax = Math.max(10, ...raw.map((p) => p.wpm)) * 1.12;
  const pts = raw.map((p) => ({ x: px + (p.time / tMax) * pw, y: py + ph - (p.wpm / vMax) * ph }));

  const fill = ctx.createLinearGradient(0, py, 0, py + ph);
  fill.addColorStop(0, rgba(card.accent, 0.42));
  fill.addColorStop(1, rgba(card.accent, 0));
  ctx.beginPath();
  monotone(ctx, pts);
  ctx.lineTo(pts[pts.length - 1].x, py + ph);
  ctx.lineTo(pts[0].x, py + ph);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  monotone(ctx, pts);
  ctx.strokeStyle = card.accent;
  ctx.lineWidth = 5 * s;
  ctx.lineJoin = "round";
  ctx.shadowColor = rgba(card.accent, 0.8);
  ctx.shadowBlur = 18 * s;
  ctx.stroke();
  ctx.restore();

  /* The peak, dotted — the last sample at the top speed. */
  let best = 0;
  raw.forEach((p, i) => {
    if (p.wpm >= raw[best].wpm) best = i;
  });
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = rgba(card.accent, 0.9);
  ctx.shadowBlur = 14 * s;
  ctx.beginPath();
  ctx.arc(pts[best].x, pts[best].y, 7 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return { tMax };
}

/** The trace in its own panel: title above, sector splits below. */
function paintTrace(ctx, card, x, y, w, h, s) {
  roundRectPath(ctx, x, y, w, h, 6 * s);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  const pad = 24 * s;
  ctx.textAlign = "left";
  ctx.fillStyle = INK_3;
  ctx.font = font(600, 24 * s, DISPLAY);
  ctx.fillText("Speed trace", x + pad, y + 40 * s);

  const raw = tracePoints(card.trace);
  if (raw.length < 2) return;
  const [s1, s2, s3] = card.sectors || [];
  const hasSectors = [s1, s2, s3].every((v) => Number.isFinite(v));
  const px = x + pad;
  const pw = w - pad * 2;
  const py = y + 62 * s;
  const ph = h - 62 * s - (hasSectors ? 58 : 22) * s;

  /* Faint grid, telemetry-screen style. */
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1 * s;
  for (let i = 0; i <= 4; i++) {
    const gy = py + (ph * i) / 4;
    ctx.beginPath();
    ctx.moveTo(px, gy);
    ctx.lineTo(px + pw, gy);
    ctx.stroke();
  }

  const { tMax } = paintCurve(ctx, card, raw, px, py, pw, ph, s);
  if (!hasSectors) return;

  /* Sector splits: S1 and S2 end where the next sector starts; each
     sector's time sits centred under its own stretch of the trace. */
  const ends = [s1, s1 + s2, tMax].map((t) => px + Math.min(1, t / tMax) * pw);
  const times = [s1, s2, s3];
  let from = px;
  ends.forEach((mx, i) => {
    const tone = SECTOR_TONES[i] || card.accent;
    if (i < 2) {
      ctx.save();
      ctx.setLineDash([6 * s, 8 * s]);
      ctx.strokeStyle = rgba(tone, 0.75);
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(mx, py);
      ctx.lineTo(mx, py + ph + 10 * s);
      ctx.stroke();
      ctx.restore();
    }
    const label = `S${i + 1}  ${times[i].toFixed(2)}s`;
    const room = mx - from - 8 * s;
    const size = fitSize(ctx, label, room, 22 * s, 15 * s, (z) => font(700, z, MONO));
    ctx.font = font(700, size, MONO);
    if (ctx.measureText(label).width <= room) {
      ctx.textAlign = "center";
      ctx.fillStyle = tone;
      ctx.fillText(label, (from + mx) / 2, py + ph + 42 * s);
    }
    from = mx;
  });
}

/** The trace with no frame, faded out at both ends — texture behind
    the big number on the square card, where the tiles carry figures. */
function paintTraceBackdrop(ctx, card, y, h, W, s, alpha) {
  const raw = tracePoints(card.trace);
  if (raw.length < 2) return;
  const layer = document.createElement("canvas");
  layer.width = W;
  layer.height = Math.ceil(y + h + 40 * s);
  const g = layer.getContext("2d");
  paintCurve(g, card, raw, 0, y, W, h, s);
  g.globalCompositeOperation = "destination-in";
  const mask = g.createLinearGradient(0, 0, W, 0);
  mask.addColorStop(0, "rgba(0,0,0,0)");
  mask.addColorStop(0.16, "rgba(0,0,0,1)");
  mask.addColorStop(0.86, "rgba(0,0,0,1)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = mask;
  g.fillRect(0, 0, W, layer.height);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

function paintFooter(ctx, card, x, right, baseline, s, align) {
  const cta = "Can you beat it?";
  ctx.fillStyle = card.accent;
  ctx.font = font(400, 44 * s, BRAND);
  if (align === "center") {
    ctx.textAlign = "center";
    ctx.fillText(cta, x, baseline);
    ctx.fillStyle = INK_2;
    ctx.font = font(500, 28 * s, MONO);
    ctx.fillText(card.link.label, x, baseline + 52 * s);
    return;
  }
  ctx.textAlign = "left";
  ctx.fillText(cta, x, baseline);
  ctx.textAlign = "right";
  ctx.fillStyle = INK_2;
  ctx.font = font(500, 28 * s, MONO);
  ctx.fillText(card.link.label, right, baseline - 4 * s);
}

function paintIdentity(ctx, card, x, y, s, align) {
  ctx.textAlign = align;
  ctx.fillStyle = INK_3;
  ctx.font = font(500, 24 * s, MONO);
  spacing(ctx, 2 * s);
  ctx.fillText(dateLabel(card.date), x, y);
  spacing(ctx, 0);
  if (card.driver) {
    ctx.fillStyle = INK;
    ctx.font = font(700, 34 * s, DISPLAY);
    ctx.fillText(`@${card.driver}`, x, y + 44 * s);
  }
}

/* ── Layouts ───────────────────────────────────────────────────── */

function drawSquare(ctx, card, W, H, logo, rand) {
  const pad = 64;
  paintBackground(ctx, W, H, card.accent, logo, rand, { x: W * 0.32, y: H * 0.58, r: W * 0.75 });
  const below = paintFlag(ctx, W, -10, 3, 36);
  paintCorners(ctx, W, H, 26, 30);

  paintLogo(ctx, logo, pad, below + 26, 86);
  paintIdentity(ctx, card, W - pad, below + 60, 1, "right");

  const blockTop = below + 196;
  paintTrackBlock(ctx, card, pad, blockTop, W - pad * 2, 1, "left");
  paintBadge(ctx, card, pad, blockTop + 136, 1, "left", W - pad * 2);

  /* Fixed from the bottom up, badge or no badge: tiles that stretch
     to fill whatever a missing badge leaves look half-empty. The
     trace runs behind the number, full width and faint — texture as
     much as data here, since the tiles carry the figures. */
  const tilesTop = H - 277;
  const heroBase = tilesTop - 44;
  paintTraceBackdrop(ctx, card, heroBase - 250, 250, W, 1, 0.55);
  paintHero(ctx, card, pad - 6, heroBase, 270, "left", card.accent);
  paintTiles(ctx, card, pad, tilesTop, W - pad * 2, 161, 4, 1);
  paintFooter(ctx, card, pad, W - pad, H - 50, 1, "left");
}

function drawStory(ctx, card, W, H, logo, rand) {
  const pad = 72;
  paintBackground(ctx, W, H, card.accent, logo, rand, { x: W * 0.5, y: 980, r: W * 0.95 });
  paintFlag(ctx, W, -12, 4, 40);
  paintCorners(ctx, W, H, 30, 36);

  const cx = W / 2;
  paintLogo(ctx, logo, cx, 196, 120, "center");
  paintIdentity(ctx, card, cx, 380, 1.1, "center");

  paintTrackBlock(ctx, card, cx, 540, W - pad * 2, 1.22, "center");
  paintBadge(ctx, card, cx, 704, 1.12, "center", W - pad * 2);

  paintHero(ctx, card, cx, 1110, 350, "center", card.accent);

  paintTiles(ctx, card, pad, 1166, W - pad * 2, 310, 2, 1.08);
  paintTrace(ctx, card, pad, 1504, W - pad * 2, 222, 1.08);
  paintFooter(ctx, card, cx, W - pad, 1806, 1.2, "center");
}

function drawWide(ctx, card, W, H, logo, rand) {
  const pad = 64;
  paintBackground(ctx, W, H, card.accent, logo, rand, { x: W * 0.26, y: H * 0.62, r: W * 0.55 });
  const below = paintFlag(ctx, W, -10, 3, 32);
  paintCorners(ctx, W, H, 26, 30);

  const leftW = 760;
  paintLogo(ctx, logo, pad, below + 26, 80);
  const blockTop = below + 196;
  paintTrackBlock(ctx, card, pad, blockTop, leftW, 1, "left");
  const badgeY = blockTop + 136;
  paintBadge(ctx, card, pad, badgeY, 1, "left", leftW);
  paintHero(ctx, card, pad - 6, H - 150, 270, "left", card.accent);

  const rx = pad + leftW + 56;
  const rw = W - pad - rx;
  paintIdentity(ctx, card, W - pad, below + 52, 1, "right");
  const tilesTop = below + 128;
  paintTiles(ctx, card, rx, tilesTop, rw, 300, 2, 1);
  paintTrace(ctx, card, rx, tilesTop + 324, rw, H - (tilesTop + 324) - 132, 1);
  paintFooter(ctx, card, rx, W - pad, H - 56, 1, "left");
}

const LAYOUTS = { square: drawSquare, story: drawStory, wide: drawWide };

/** Paints `card` onto `ctx` at the format's native size. */
export function drawRaceCard(ctx, card, formatId, logo) {
  const f = CARD_FORMATS[formatId] || CARD_FORMATS.square;
  const rand = seeded(card.wpm * 7919 + Math.round(card.accuracy * 31) + (card.timeMs || 0));
  ctx.save();
  ctx.textBaseline = "alphabetic";
  LAYOUTS[f.id](ctx, card, f.w, f.h, logo, rand);
  ctx.restore();
}

/** Renders `card` to a PNG blob. */
export async function renderRaceCard(card, formatId) {
  const { logo } = await loadCardAssets();
  const f = CARD_FORMATS[formatId] || CARD_FORMATS.square;
  const canvas = document.createElement("canvas");
  canvas.width = f.w;
  canvas.height = f.h;
  drawRaceCard(canvas.getContext("2d"), card, f.id, logo);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode the card"))), "image/png")
  );
}
