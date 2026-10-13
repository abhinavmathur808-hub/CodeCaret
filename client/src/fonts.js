/* ──────────────────────────────────────────────────────────────
   Typing fonts.

   Chosen for VISUAL SEPARATION, not for how many names are on the
   list. Most "coding" monospace faces (JetBrains Mono, IBM Plex
   Mono, Source Code Pro, Roboto Mono, DM Mono…) share a 0.6em set
   width and near-identical humanist letterforms — side by side in a
   picker they are indistinguishable, so only one of that family is
   kept. Everything else here differs in width, texture or category:
   condensed, extra-wide, geometric, angular, eccentric, typewriter,
   distressed, CRT, bitmap, handwritten.

   `id` is what lands in localStorage (cc_globalFont). The five
   original ids — Default, Handwritten, Pixel, Typewriter, Space —
   are kept verbatim so existing saved preferences survive. Ids that
   no longer exist fall back to Default via getFont().

   `stack` feeds the --global-font custom property on the sandbox.
   "inherit" is deliberate for Default: it makes --global-font
   resolve to nothing, so every consumer falls through to its own
   `var(--global-font, …)` fallback — the app's Fira Code stack for
   the typing area, the system stack for the keyboard.

   Webfonts are requested in components/TestTyping.css. Faces whose
   metrics are far from the norm get keycap compensation there too,
   keyed on [data-font].
   ────────────────────────────────────────────────────────────── */

export const FONTS = [
  // ── Workhorses ──
  { id: "Default",     label: "Default",     note: "Fira Code — the house face, ligatures", stack: "inherit",
    /* `stack` is "inherit" so consumers fall through to their own
       defaults, but the picker must still show the real face. */
    preview: "'Fira Code', monospace" },
  { id: "Inconsolata", label: "Condensed",   note: "Inconsolata — narrow, high density",    stack: "'Inconsolata', monospace" },
  { id: "Martian",     label: "Wide",        note: "Martian Mono — extra-wide grotesque",   stack: "'Martian Mono', monospace" },
  { id: "Azeret",      label: "Geometric",   note: "Azeret Mono — square, mechanical",      stack: "'Azeret Mono', monospace" },

  // ── Character ──
  { id: "Space",       label: "Retro",       note: "Space Mono — quirky 70s tech",          stack: "'Space Mono', monospace" },
  { id: "ShareTech",   label: "Terminal",    note: "Share Tech Mono — angular, techy",      stack: "'Share Tech Mono', monospace" },
  { id: "Syne",        label: "Eccentric",   note: "Syne Mono — thin, off-kilter",          stack: "'Syne Mono', monospace" },
  { id: "Typewriter",  label: "Typewriter",  note: "Courier Prime — clean typewriter",      stack: "'Courier Prime', monospace" },
  { id: "Vintage",     label: "Vintage",     note: "Special Elite — distressed, inked",     stack: "'Special Elite', cursive" },

  // ── Display ──
  { id: "Pixel",       label: "CRT",         note: "VT323 — phosphor terminal",             stack: "'VT323', monospace" },
  { id: "Bitmap",      label: "Bitmap",      note: "Silkscreen — chunky 8-bit",             stack: "'Silkscreen', monospace" },
  { id: "Handwritten", label: "Handwritten", note: "Architects Daughter — hand-drawn",      stack: "'Architects Daughter', cursive" },
];

const BY_ID = new Map(FONTS.map((f) => [f.id, f]));

export const DEFAULT_FONT = "Default";

/** Metadata for a font id, falling back to Default for unknown ids. */
export const getFont = (id) => BY_ID.get(id) || BY_ID.get(DEFAULT_FONT);

/** The face to render a picker sample in. */
export const fontPreview = (id) => {
  const f = getFont(id);
  return f.preview || f.stack;
};

/** The value to assign to --global-font for a font id. */
export const fontStack = (id) => getFont(id).stack;
