/* ══════════════════════════════════════════════════════════════
   BrandLogo — the CodeCaret logo, wherever the site shows its name.

   public/logo-mark.png is public/logo.png with its white paper
   knocked out (alpha from darkness), so it sits cleanly on any
   backdrop — a palette colour, a photo, a live WebGL scene. The art
   is black; dark palettes flip it white through the theme's own
   --cc-logo-filter token, light palettes leave it black.

   tone: "auto"  follow the active theme (default)
         "light" always white — for pages that are dark whatever the
                 theme (the home page's night circuit, the auth pages)
         "dark"  always black
   ══════════════════════════════════════════════════════════════ */

const FILTERS = {
  auto: "var(--cc-logo-filter, invert(1))",
  light: "invert(1)",
  dark: "none",
};

/* The logo's own proportions (1559 × 909), so a height alone sizes it
   without layout shift while the image loads. */
export const LOGO_ASPECT = 1559 / 909;

export default function BrandLogo({ tone = "auto", alt = "CodeCaret", className = "", style, ...rest }) {
  return (
    <img
      src="/logo-mark.png"
      alt={alt}
      width={1559}
      height={909}
      draggable={false}
      className={`cc-logo ${className}`}
      style={{ filter: FILTERS[tone] ?? FILTERS.auto, aspectRatio: LOGO_ASPECT, ...style }}
      {...rest}
    />
  );
}
