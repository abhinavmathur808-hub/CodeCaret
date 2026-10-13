/* Single source of truth for every CodeCaret palette.
   Verifies WCAG contrast, then emits the theme blocks for themes.css.
   Nothing is written unless every palette passes. */

const fs = require("fs");
const path = require("path");

const hex = (h) => {
  h = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const rgbTriple = (h) => hex(h).join(", ");
const lum = (h) =>
  hex(h)
    .map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    })
    .reduce((a, c, i) => a + [0.2126, 0.7152, 0.0722][i] * c, 0);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/** Hue in degrees (0–360). */
const hue = (h) => {
  const [r, g, b] = hex(h).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  let deg;
  if (max === r) deg = ((g - b) / d) % 6;
  else if (max === g) deg = (b - r) / d + 2;
  else deg = (r - g) / d + 4;
  return (deg * 60 + 360) % 360;
};

/** Shortest angular distance between two hues. */
const hueGap = (a, b) => {
  const d = Math.abs(hue(a) - hue(b)) % 360;
  return d > 180 ? 360 - d : d;
};

/**
 * Two signal colours are telling apart if they differ clearly in hue
 * OR clearly in lightness. Luminance contrast alone is the wrong test:
 * a blue accent and a red error can have near-identical luminance and
 * still be completely unambiguous.
 */
const distinguishable = (a, b) => hueGap(a, b) >= 35 || ratio(a, b) >= 1.7;

/* ── Palettes ─────────────────────────────────────────────────
   scheme: drives color-scheme + whether hover tints lift (white)
   or deepen (black), and whether the logo needs inverting.      */
const P = [];
const dark = (o) => P.push({ ...o, scheme: "dark" });
const light = (o) => P.push({ ...o, scheme: "light" });

/* ══ Existing five — untouched ══ */
dark({ id:"carbon", label:"Carbon", blurb:"F1 livery — black & racing red",
  bg:"#0a0a0a", bg2:"#0d0d0d", surface:"#111111", overlay:"#1a1a1a", elevated:"#1e1e1e",
  border:"#2a2a2a", borderStrong:"#333333",
  accent:"#e10600", accentBright:"#ff1801", accentDim:"#cc0500", onAccent:"#ffffff",
  text:"#ffffff", text2:"#e0e0e0", text3:"#8a8a8a", text4:"#5a5a5a", untyped:"#5a5a5a",
  error:"#ff4444", success:"#00d26a", warning:"#ffd000", legacy:true });

dark({ id:"midnight", label:"Midnight", blurb:"Deep navy with a sky-blue accent",
  bg:"#060910", bg2:"#090e19", surface:"#0c1220", overlay:"#121a2c", elevated:"#16203a",
  border:"#223049", borderStrong:"#2e4062",
  accent:"#38bdf8", accentBright:"#7dd3fc", accentDim:"#0ea5e9", onAccent:"#04121f",
  text:"#f0f6ff", text2:"#d7e3f4", text3:"#8ea3c0", text4:"#5c6f8c", untyped:"#3a4761",
  error:"#ff5c5c", success:"#34d399", warning:"#fbbf24" });

dark({ id:"verdant", label:"Verdant", blurb:"Forest black with emerald",
  bg:"#05100b", bg2:"#071510", surface:"#0a1a12", overlay:"#10241a", elevated:"#142c20",
  border:"#1e3d2c", borderStrong:"#2a5240",
  accent:"#34d399", accentBright:"#6ee7b7", accentDim:"#10b981", onAccent:"#04140d",
  text:"#eefaf3", text2:"#cfe9dc", text3:"#86a99a", text4:"#5a7568", untyped:"#38524a",
  error:"#ff6b6b", success:"#34d399", warning:"#fbbf24" });

dark({ id:"solar", label:"Solar", blurb:"Warm espresso with amber",
  bg:"#100b04", bg2:"#161007", surface:"#1b1309", overlay:"#251b0e", elevated:"#2d2112",
  border:"#3d2e18", borderStrong:"#54401f",
  accent:"#fbbf24", accentBright:"#fcd34d", accentDim:"#d97706", onAccent:"#171003",
  text:"#fff7ea", text2:"#f0e0c8", text3:"#b39a72", text4:"#7d6a4d", untyped:"#574833",
  error:"#ff5f56", success:"#4ade80", warning:"#fbbf24" });

dark({ id:"nebula", label:"Nebula", blurb:"Deep violet with orchid",
  bg:"#0a0714", bg2:"#0e0a1b", surface:"#130d22", overlay:"#1b1330", elevated:"#221840",
  border:"#2f2150", borderStrong:"#433070",
  accent:"#c084fc", accentBright:"#d8b4fe", accentDim:"#9333ea", onAccent:"#10061f",
  text:"#f5f0ff", text2:"#ddd2f5", text3:"#9d8fc0", text4:"#6b5f8c", untyped:"#584e73",
  error:"#ff6b81", success:"#4ade80", warning:"#fbbf24" });

/* ══ New dark five ══ */
dark({ id:"lagoon", label:"Lagoon", blurb:"Abyssal teal with turquoise",
  bg:"#04131a", bg2:"#061a22", surface:"#08222c", overlay:"#0c2d39", elevated:"#0f3746",
  border:"#17495a", borderStrong:"#216478",
  accent:"#2dd4bf", accentBright:"#5eead4", accentDim:"#0d9488", onAccent:"#02191c",
  text:"#e8fbf8", text2:"#c2ece6", text3:"#7fb0a9", text4:"#568680", untyped:"#33605d",
  error:"#ff6b6b", success:"#34d399", warning:"#fbbf24" });

dark({ id:"ember", label:"Ember", blurb:"Warm charcoal with burnt orange",
  bg:"#120e0a", bg2:"#181310", surface:"#1f1813", overlay:"#2a201a", elevated:"#332720",
  border:"#46362b", borderStrong:"#5f4a3a",
  accent:"#fb923c", accentBright:"#fdba74", accentDim:"#ea580c", onAccent:"#1a0d03",
  text:"#fff4ec", text2:"#f2ddcd", text3:"#b8947c", text4:"#856a58", untyped:"#5e4b3e",
  error:"#f43f5e", success:"#4ade80", warning:"#fcd34d" });

dark({ id:"fuchsia", label:"Fuchsia", blurb:"Ink black with hot pink",
  bg:"#0f0810", bg2:"#150c17", surface:"#1c111f", overlay:"#26172a", elevated:"#301d35",
  border:"#432a49", borderStrong:"#5d3b64",
  accent:"#f472b6", accentBright:"#f9a8d4", accentDim:"#db2777", onAccent:"#1a0512",
  text:"#fdf2fa", text2:"#f0d8e8", text3:"#bb92b0", text4:"#8a6a82", untyped:"#634f5d",
  error:"#dc2626", success:"#4ade80", warning:"#fbbf24" });

dark({ id:"graphite", label:"Graphite", blurb:"Monochrome slate with platinum",
  bg:"#0e0e10", bg2:"#131316", surface:"#191a1d", overlay:"#212225", elevated:"#2a2b2f",
  border:"#3a3b40", borderStrong:"#4f5157",
  accent:"#d4d4d8", accentBright:"#f4f4f5", accentDim:"#a1a1aa", onAccent:"#111113",
  text:"#fafafa", text2:"#e0e0e2", text3:"#9b9ba1", text4:"#6e6e75", untyped:"#4f4f56",
  error:"#f87171", success:"#4ade80", warning:"#fbbf24" });

dark({ id:"steel", label:"Steel", blurb:"Arctic slate with frost blue",
  bg:"#20242e", bg2:"#252a35", surface:"#2b313d", overlay:"#343b49", elevated:"#3d4553",
  border:"#4a5364", borderStrong:"#5e6a7e",
  accent:"#88c0d0", accentBright:"#a9d5e2", accentDim:"#5e9aad", onAccent:"#0f1720",
  text:"#eceff4", text2:"#d8dee9", text3:"#a3adbd", text4:"#7d879a", untyped:"#5c6678",
  error:"#f2777a", success:"#a3be8c", warning:"#ebcb8b" });

/* ══ New light five ══
   Same token names, inverted ramp: bg is lightest, text is darkest,
   and accentBright is a *deeper* shade so hover reads as more intense. */
light({ id:"daylight", label:"Daylight", blurb:"Clean white with a cobalt accent",
  bg:"#ffffff", bg2:"#fafbfc", surface:"#f4f6f8", overlay:"#eaeef2", elevated:"#e1e6ec",
  border:"#d5dce4", borderStrong:"#b4bfcc",
  accent:"#2563eb", accentBright:"#1d4ed8", accentDim:"#1e40af", onAccent:"#ffffff",
  text:"#0f172a", text2:"#243043", text3:"#566072", text4:"#7b8697", untyped:"#9ba1ab",
  error:"#dc2626", success:"#15803d", warning:"#b45309" });

light({ id:"parchment", label:"Parchment", blurb:"Warm cream with sepia ink",
  bg:"#fdf8ee", bg2:"#faf3e4", surface:"#f5ecd9", overlay:"#eee2c8", elevated:"#e6d8b8",
  border:"#dbc9a3", borderStrong:"#bfa87c",
  accent:"#a16207", accentBright:"#854d0e", accentDim:"#713f12", onAccent:"#fffbf2",
  text:"#2e2417", text2:"#453724", text3:"#6b5942", text4:"#8a765c", untyped:"#a99a7f",
  error:"#b91c1c", success:"#15803d", warning:"#a16207" });

light({ id:"sage", label:"Sage", blurb:"Soft eucalyptus with forest green",
  bg:"#f5f9f5", bg2:"#eef4ee", surface:"#e7efe7", overlay:"#dde8dd", elevated:"#d2e0d2",
  border:"#c2d4c2", borderStrong:"#9db69d",
  accent:"#15803d", accentBright:"#166534", accentDim:"#14532d", onAccent:"#f6fbf6",
  text:"#14251a", text2:"#26392c", text3:"#4f6455", text4:"#71887a", untyped:"#909f93",
  error:"#b91c1c", success:"#15803d", warning:"#a16207" });

light({ id:"porcelain", label:"Porcelain", blurb:"Cool porcelain with indigo",
  bg:"#f8fafc", bg2:"#f1f5f9", surface:"#e9eef5", overlay:"#dfe6f0", elevated:"#d3dcea",
  border:"#c5d0e0", borderStrong:"#a3b2c8",
  accent:"#4f46e5", accentBright:"#4338ca", accentDim:"#3730a3", onAccent:"#ffffff",
  text:"#111827", text2:"#26324a", text3:"#525f78", text4:"#77839b", untyped:"#959eae",
  error:"#dc2626", success:"#15803d", warning:"#b45309" });

light({ id:"blush", label:"Blush", blurb:"Pale rose with deep plum",
  bg:"#fdf7f8", bg2:"#fbeff1", surface:"#f7e6ea", overlay:"#f0dae0", elevated:"#e8ccd4",
  border:"#dfbcc6", borderStrong:"#c3949f",
  accent:"#86198f", accentBright:"#701a75", accentDim:"#581c87", onAccent:"#fdf4ff",
  text:"#2b1119", text2:"#43222b", text3:"#6d4650", text4:"#8e6670", untyped:"#c9a3ad",
  error:"#b91c1c", success:"#15803d", warning:"#a16207" });

/* ── Contrast gate ────────────────────────────────────────── */
const CHECKS = (t) => [
  ["body text on bg", t.text, t.bg, 7, null],
  ["typed text on bg", t.text2, t.bg, 7, null],
  ["secondary on bg", t.text3, t.bg, 4.5, null],
  ["muted on surface", t.text4, t.surface, 2.6, null],
  ["untyped on bg", t.untyped, t.bg, 2.0, 4.2],
  ["accent on bg", t.accent, t.bg, 4.5, null],
  ["accent on surface", t.accent, t.surface, 4.0, null],
  ["on-accent / accent", t.onAccent, t.accent, 4.5, null],
  ["on-accent / accentBright", t.onAccent, t.accentBright, 4.5, null],
  ["error on bg", t.error, t.bg, 4.0, null],
  ["success on bg", t.success, t.bg, 3.5, null],
  ["warning on bg", t.warning, t.bg, 3.5, null],
  ["border visible on bg", t.border, t.bg, 1.12, null],
  // Dashboard/modal cards are painted with `surface` on top of `bg`;
  // if those collapse together the cards vanish (which is exactly what
  // happened on the light palettes before the header was fixed).
  ["surface reads as a card", t.surface, t.bg, 1.04, null],
  ["card edge visible", t.border, t.surface, 1.12, null],
];

let failed = 0;
const rows = [];
for (const t of P) {
  const bad = [];
  for (const [name, fg, bg, min, max] of CHECKS(t)) {
    const r = ratio(fg, bg);
    if (r < min || (max !== null && r > max)) {
      bad.push(`${name} ${r.toFixed(2)} (want ${max ? `${min}-${max}` : `>=${min}`})`);
    }
  }
  // A mistake must never be confusable with the brand accent.
  if (!distinguishable(t.error, t.accent)) {
    bad.push(
      `error/accent too alike (hue gap ${hueGap(t.error, t.accent).toFixed(0)}deg, ` +
      `lum ${ratio(t.error, t.accent).toFixed(2)})`
    );
  }
  rows.push([t.id, t.scheme, bad]);
  if (bad.length && !t.legacy) failed++;
}

for (const [id, scheme, bad] of rows) {
  const tag = bad.length === 0 ? "OK  " : "FAIL";
  console.log(`${tag} ${id.padEnd(11)} ${scheme.padEnd(6)} ${bad.join(" | ") || ""}`);
}

if (failed > 0) {
  console.log(`\n${failed} palette(s) failed — no CSS written.`);
  process.exit(1);
}

/* ── Emit CSS ─────────────────────────────────────────────── */
const block = (t) => {
  const sel =
    t.id === "carbon"
      ? ':root,\n:root[data-theme="carbon"]'
      : `:root[data-theme="${t.id}"]`;
  const isDark = t.scheme === "dark";
  return `/* ── ${t.label} — ${t.blurb} ${"─".repeat(Math.max(2, 44 - t.label.length - t.blurb.length))} */
${sel} {
  color-scheme: ${t.scheme};
  /* Overlays lift on dark palettes and deepen on light ones. */
  --cc-tint-rgb: ${isDark ? "255, 255, 255" : "0, 0, 0"};
  /* The wordmark art is dark-on-white. Dark UIs invert it and screen
     away the black; light UIs keep it and multiply away the white. */
  --cc-logo-filter: ${isDark ? "invert(1)" : "none"};
  --cc-logo-blend: ${isDark ? "screen" : "multiply"};
  /* Drop shadows: near-black and full strength on dark palettes, a
     soft cool tint at ~a third the alpha on light ones, where a heavy
     black shadow reads as a smudge. */
  --cc-shadow-rgb: ${isDark ? "0, 0, 0" : "15, 23, 42"};
  --cc-shadow-strength: ${isDark ? "1" : "0.3"};

  --cc-bg: ${t.bg};
  --cc-bg-2: ${t.bg2};
  --cc-surface: ${t.surface};
  --cc-surface-rgb: ${rgbTriple(t.surface)};
  --cc-overlay: ${t.overlay};
  --cc-elevated: ${t.elevated};
  --cc-border: ${t.border};
  --cc-border-strong: ${t.borderStrong};

  --cc-accent: ${t.accent};
  --cc-accent-rgb: ${rgbTriple(t.accent)};
  --cc-accent-bright: ${t.accentBright};
  --cc-accent-bright-rgb: ${rgbTriple(t.accentBright)};
  --cc-accent-dim: ${t.accentDim};
  --cc-on-accent: ${t.onAccent};

  --cc-text: ${t.text};
  --cc-text-2: ${t.text2};
  --cc-text-3: ${t.text3};
  --cc-text-4: ${t.text4};
  --cc-untyped: ${t.untyped};

  --cc-error: ${t.error};
  --cc-error-rgb: ${rgbTriple(t.error)};
  --cc-success: ${t.success};
  --cc-warning: ${t.warning};
}`;
};

/* Rewrite only the palette blocks in src/themes.css, keeping the
   hand-written header and the token bridge below them intact. */
const OUT = path.join(__dirname, "..", "src", "themes.css");
const CARBON_MARK = "/* ── Carbon";
const BRIDGE_MARK = "/* ═══";

const existing = fs.readFileSync(OUT, "utf8");
if (!existing.includes(CARBON_MARK) || !existing.includes(BRIDGE_MARK)) {
  console.error("themes.css markers missing — refusing to overwrite.");
  process.exit(1);
}

const header = existing.slice(0, existing.indexOf(CARBON_MARK));
const bridge = existing.slice(existing.indexOf(BRIDGE_MARK, existing.indexOf(CARBON_MARK)));

fs.writeFileSync(OUT, header + P.map(block).join("\n\n") + "\n\n" + bridge);

fs.writeFileSync(
  path.join(__dirname, "..", "src", "themeRegistry.json"),
  JSON.stringify(
    P.map((t) => ({
      id: t.id, label: t.label, blurb: t.blurb, scheme: t.scheme,
      swatch: { bg: t.bg, surface: t.elevated, accent: t.accent, text: t.text },
    })),
    null, 2
  )
);

console.log(`\n✅ ${P.length} palettes verified (${P.filter(t=>t.scheme==="dark").length} dark, ${P.filter(t=>t.scheme==="light").length} light)`);
console.log("   wrote src/themes.css + src/themeRegistry.json");
