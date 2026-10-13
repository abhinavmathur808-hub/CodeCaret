/* ══════════════════════════════════════════════════════════════
   themeAccent — which accent colour the home page uses, read from
   the visitor's theme. Plain JavaScript, no three.js: the page shell
   (copy, HUD, loader) needs it before the 3D scene has downloaded.
   accent.js turns it into the scene's shared colour uniforms.
   ══════════════════════════════════════════════════════════════ */

export const BRAND_ACCENT = "#e10600";

/** The accent to use for the current <html data-theme>. Light themes
    keep CodeCaret red: their accents are tuned to sit on a white page
    and go muddy as light against a black sky. */
export function readThemeAccent() {
  try {
    const css = getComputedStyle(document.documentElement);
    const scheme = css.getPropertyValue("color-scheme").trim();
    const accent = css.getPropertyValue("--cc-accent").trim();
    if (!/^#[0-9a-f]{6}$/i.test(accent) || scheme === "light") return BRAND_ACCENT;
    return accent.toLowerCase();
  } catch {
    return BRAND_ACCENT;
  }
}

/** "225, 6, 0" — for rgba() in CSS. */
export function rgbTriplet(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** Calls fn now and whenever the theme changes; returns the stop. */
export function watchThemeAccent(fn) {
  const sync = () => fn(readThemeAccent());
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
