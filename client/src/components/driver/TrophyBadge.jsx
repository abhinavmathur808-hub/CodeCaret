import { useId } from "react";
import { trophyById } from "../../utils/trophies";

/* ══════════════════════════════════════════════════════════════
   TrophyBadge — one trophy, drawn: a struck medal in its tier's
   metal with the trophy's emblem pressed into it. A trophy not yet
   earned is the same medal in bare steel, so the shelf shows what is
   still out there.
   ══════════════════════════════════════════════════════════════ */

const METALS = {
  bronze: ["#f0b27a", "#cd7f32", "#7a4416"],
  silver: ["#f4f6fa", "#b9c1cc", "#5f6875"],
  gold: ["#fff3a6", "#f2c230", "#94680a"],
  locked: ["#5a5f66", "#3a3e44", "#202328"],
};

/* Emblems on a 64×64 face centred on (32, 32), in the medal's ink. */
function Glyph({ glyph, label, ink }) {
  const stroke = { fill: "none", stroke: ink, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (glyph) {
    case "flag":
      return (
        <g>
          <path d="M23 46V18" {...stroke} />
          <path d="M23 19h19l-4 6 4 6H23" fill={ink} />
          <path d="M28 19v12M33 19v12" stroke="rgba(255,255,255,0.55)" strokeWidth="2.4" />
          <path d="M23 25h19" stroke="rgba(255,255,255,0.55)" strokeWidth="2.4" />
        </g>
      );
    case "flame":
      return (
        <g>
          <path
            d="M32 15c2 7 10 10 10 20a10 10 0 0 1-20 0c0-5 3-8 5-10 0 4 2 6 4 6-1-6 0-11 1-16z"
            fill={ink}
          />
          <text x="32" y="42" textAnchor="middle" fontFamily="Saira, sans-serif" fontWeight="800" fontSize={label.length > 1 ? 10 : 12} fill="rgba(255,255,255,0.92)">
            {label}
          </text>
        </g>
      );
    case "calendar":
      return (
        <g>
          <rect x="19" y="20" width="26" height="24" rx="3" {...stroke} />
          <path d="M19 27h26M25 16v7M39 16v7" {...stroke} />
          <path d="M26 35l4 4 8-8" {...stroke} />
        </g>
      );
    case "braces":
      return (
        <g {...stroke}>
          <path d="M26 18c-4 0-5 2-5 5v4c0 3-2 5-4 5 2 0 4 2 4 5v4c0 3 1 5 5 5" />
          <path d="M38 18c4 0 5 2 5 5v4c0 3 2 5 4 5-2 0-4 2-4 5v4c0 3-1 5-5 5" />
          <circle cx="32" cy="32" r="1.6" fill={ink} />
        </g>
      );
    case "gauge":
      return (
        <g>
          <path d="M18 40a14 14 0 1 1 28 0" {...stroke} />
          <path d="M32 40l8-11" {...stroke} />
          <circle cx="32" cy="40" r="2.6" fill={ink} />
          <text x="32" y="51" textAnchor="middle" fontFamily="Saira, sans-serif" fontWeight="800" fontSize="9" fill={ink}>
            {label}
          </text>
        </g>
      );
    case "diamond":
      return (
        <g {...stroke}>
          <path d="M22 26l5-7h10l5 7-10 16z" />
          <path d="M22 26h20M27 19l5 23M37 19l-5 23" strokeWidth="2" />
        </g>
      );
    case "podium":
      return (
        <g fill={ink}>
          <rect x="26" y="26" width="12" height="18" rx="1.5" />
          <rect x="15" y="32" width="11" height="12" rx="1.5" opacity="0.8" />
          <rect x="38" y="35" width="11" height="9" rx="1.5" opacity="0.65" />
          <text x="32" y="38" textAnchor="middle" fontFamily="Saira, sans-serif" fontWeight="800" fontSize="9" fill="rgba(255,255,255,0.92)">1</text>
          <circle cx="32" cy="20" r="3" />
        </g>
      );
    case "laps":
      return (
        <g>
          <circle cx="32" cy="32" r="13" {...stroke} strokeDasharray="5 3.4" />
          <path d="M41 21l3-4 1 6" {...stroke} />
          <text x="32" y="36" textAnchor="middle" fontFamily="Saira, sans-serif" fontWeight="800" fontSize="11" fill={ink}>
            {label}
          </text>
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M19 41l-2-17 9 7 6-11 6 11 9-7-2 17z" fill={ink} />
          <path d="M20 45h24" {...stroke} />
          <circle cx="32" cy="34" r="2.4" fill="rgba(255,255,255,0.85)" />
        </g>
      );
    default:
      return null;
  }
}

export default function TrophyBadge({ id, earned = true, size = 56, title }) {
  const uid = useId().replace(/:/g, "");
  const trophy = trophyById(id);
  if (!trophy) return null;
  const [hi, mid, lo] = METALS[earned ? trophy.tier : "locked"];
  const ink = earned ? lo : "#6e747c";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title ?? `${trophy.title}${earned ? "" : " (not earned yet)"}`}
      className={`trophy-badge${earned ? "" : " is-locked"}`}
    >
      <defs>
        <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={hi} />
          <stop offset="0.5" stopColor={mid} />
          <stop offset="1" stopColor={lo} />
        </linearGradient>
        <radialGradient id={`${uid}-face`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={hi} />
          <stop offset="0.65" stopColor={mid} />
          <stop offset="1" stopColor={lo} />
        </radialGradient>
      </defs>
      {/* Ribbon tails behind the medal. */}
      <path d="M20 46l-5 15 8-4 4 6 4-15z" fill={earned ? "rgba(var(--cc-accent-rgb), 0.9)" : "#33373d"} />
      <path d="M44 46l5 15-8-4-4 6-4-15z" fill={earned ? "rgba(var(--cc-accent-rgb), 0.75)" : "#2b2f34"} />
      {/* Scalloped rim, then the struck face. */}
      <path
        d="M32 3l4.6 3.4 5.6-1 2.6 5 5.4 1.9-.1 5.7 4 4.1-2.4 5.2 2.4 5.2-4 4.1.1 5.7-5.4 1.9-2.6 5-5.6-1L32 53l-4.6-3.4-5.6 1-2.6-5-5.4-1.9.1-5.7-4-4.1 2.4-5.2-2.4-5.2 4-4.1-.1-5.7 5.4-1.9 2.6-5 5.6 1z"
        transform="translate(0 2)"
        fill={`url(#${uid}-rim)`}
      />
      <circle cx="32" cy="30" r="19" fill={`url(#${uid}-face)`} stroke={lo} strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="32" cy="30" r="16" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
      <g transform="translate(0 -2)">
        <Glyph glyph={trophy.glyph} label={trophy.label ?? ""} ink={ink} />
      </g>
      {/* Specular glint. */}
      <path d="M18 22a16 16 0 0 1 12-9" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
