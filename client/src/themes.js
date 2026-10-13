import registry from "./themeRegistry.json";

/* ──────────────────────────────────────────────────────────────
   Theme registry.

   themeRegistry.json and the palette blocks in themes.css are both
   emitted by scripts/genThemes.cjs, which refuses to write either
   unless every palette clears its contrast gates. To add a theme,
   edit the generator and re-run `npm run themes`.

   The swatch colours here drive the settings preview only — the real
   palette lives in CSS, so switching themes is a single attribute
   write with no React re-render of the styled tree.
   ────────────────────────────────────────────────────────────── */

export const THEME_STORAGE_KEY = "cc_theme";

export const DEFAULT_THEME = "carbon";

/** All themes, in registry order. */
export const THEMES = registry;

/** Grouped for the picker: dark first, then light. */
export const THEME_GROUPS = [
  { scheme: "dark", label: "Dark", themes: THEMES.filter((t) => t.scheme === "dark") },
  { scheme: "light", label: "Light", themes: THEMES.filter((t) => t.scheme === "light") },
];

const BY_ID = new Map(THEMES.map((t) => [t.id, t]));

/** Look up a theme's metadata. */
export const getTheme = (id) => BY_ID.get(id) || BY_ID.get(DEFAULT_THEME);

/** The persisted theme id, or the default if unset/unknown. */
export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return BY_ID.has(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Apply a theme to the document and persist it.
 * Safe to call before React mounts.
 */
export function applyTheme(id) {
  const theme = BY_ID.has(id) ? id : DEFAULT_THEME;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable — the theme still applies for this session.
  }
  return theme;
}
