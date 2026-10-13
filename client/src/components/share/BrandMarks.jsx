import { useId } from "react";

/* ══════════════════════════════════════════════════════════════
   BrandMarks — the share targets' logos, drawn here as SVG.

   lucide dropped its brand icons, and these are only ever shown at
   button size, so each is a white glyph on its brand colour, cut to
   a disc so the row reads as one set. Decorative: the button around
   each one carries its name.
   ══════════════════════════════════════════════════════════════ */

const GLYPHS = {
  whatsapp: {
    bg: "#25D366",
    scale: 0.6,
    paths: [
      "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z",
    ],
  },
  x: {
    bg: "#000000",
    ring: true,
    scale: 0.5,
    paths: ["M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"],
  },
  linkedin: {
    bg: "#0A66C2",
    scale: 1,
    paths: [
      "M5.65 9.9h3.1v8.6h-3.1z",
      "M10.6 9.9h2.95v1.25c.48-.86 1.6-1.45 2.95-1.45 2.55 0 3.25 1.62 3.25 4.02v4.78h-3.1v-4.25c0-1.12-.3-1.9-1.38-1.9-1.12 0-1.57.84-1.57 1.95v4.2H10.6z",
    ],
    dots: [[7.2, 7.25, 1.75]],
  },
  facebook: {
    bg: "#1877F2",
    scale: 1,
    paths: [
      "M13.5 24v-9.2h2.45l.37-2.85H13.5v-1.82c0-.82.23-1.38 1.41-1.38h1.5V6.2c-.26-.03-1.15-.11-2.19-.11-2.17 0-3.65 1.32-3.65 3.75v2.11H8.12v2.85h2.45V24z",
    ],
  },
  telegram: {
    bg: "#26A5E4",
    scale: 0.66,
    nudge: [-0.7, 0.4],
    paths: [
      "M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z",
    ],
  },
};

function Instagram({ size }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={id} cx="30%" cy="107%" r="150%">
          <stop offset="0" stopColor="#fdf497" />
          <stop offset="0.05" stopColor="#fdf497" />
          <stop offset="0.45" stopColor="#fd5949" />
          <stop offset="0.6" stopColor="#d6249f" />
          <stop offset="0.9" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill={`url(#${id})`} />
      <rect x="6.3" y="6.3" width="11.4" height="11.4" rx="3.4" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.75" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="15.35" cy="8.65" r="0.95" fill="#fff" />
    </svg>
  );
}

export default function BrandMark({ id, size = 40 }) {
  const clip = useId();
  if (id === "instagram") return <Instagram size={size} />;
  const g = GLYPHS[id];
  if (!g) return null;
  const [nx, ny] = g.nudge || [0, 0];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="12" fill={g.bg} />
      {g.ring && <circle cx="12" cy="12" r="11.4" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />}
      {/* Clipped outside the transform, so the disc stays the disc
          whatever the glyph is scaled by. */}
      <g clipPath={`url(#${clip})`}>
        <g fill="#fff" transform={`translate(${12 + nx} ${12 + ny}) scale(${g.scale}) translate(-12 -12)`}>
          {g.paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
          {(g.dots || []).map(([cx, cy, r], i) => (
            <circle key={`d${i}`} cx={cx} cy={cy} r={r} />
          ))}
        </g>
      </g>
    </svg>
  );
}
