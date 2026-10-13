import { useId } from "react";

/* ══════════════════════════════════════════════════════════════
   OffTrackArt — the 404 page's picture: the car, seen from above,
   spun across the kerb and beached in the gravel, its skid marks
   tracing how it got there. Drawn, like the rest of the art, and in
   the theme's accent so the livery matches the site.
   ══════════════════════════════════════════════════════════════ */

/* Top-down car pointing along +x, centred on the origin. */
function CarTopDown({ id }) {
  return (
    <g>
      {/* Tyres first, so the body sits over their inner edges. */}
      {[
        [44, -33, 28, 13],
        [44, 20, 28, 13],
        [-70, -36, 32, 15],
        [-70, 21, 32, 15],
      ].map(([x, y, w, h]) => (
        <rect key={`${x}${y}`} x={x} y={y} width={w} height={h} rx="4" fill="#0c0c0f" />
      ))}
      {/* Suspension arms. */}
      <g stroke="#0c0c0f" strokeWidth="3">
        <path d="M58 -22 30 -8M58 22 30 8M-54 -24-30 -12M-54 24-30 12" />
      </g>
      {/* Front wing, rear wing. */}
      <rect x="74" y="-34" width="14" height="68" rx="3" fill="#121216" />
      <rect x="74" y="-34" width="14" height="7" fill={`url(#${id}-paint)`} />
      <rect x="74" y="27" width="14" height="7" fill={`url(#${id}-paint)`} />
      <rect x="-98" y="-30" width="16" height="60" rx="3" fill="#121216" />
      {/* Nose, chassis, sidepods, engine cover. */}
      <path
        d="M82 -5C66 -7 40 -9 26 -12 12 -24-14 -27-34 -26-56 -24-72 -14-84 -9V9C-72 14-56 24-34 26-14 27 12 24 26 12 40 9 66 7 82 5z"
        fill={`url(#${id}-paint)`}
      />
      <path d="M26 -12C12 -24-14 -27-34 -26" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" />
      {/* Cockpit, helmet, halo. */}
      <ellipse cx="2" cy="0" rx="17" ry="9" fill="#0c0c0f" />
      <circle cx="-1" cy="0" r="7" fill="#f2c230" />
      <path d="M-4 -4h6v8h-6z" fill="#14161a" opacity="0.8" />
      <path d="M18 0C14 -10 4 -12-10 -10M18 0C14 10 4 12-10 10" fill="none" stroke="#0c0c0f" strokeWidth="3" />
      {/* Livery stripe. */}
      <path d="M-62 -2h52v4h-52z" fill="rgba(255,255,255,0.8)" />
    </g>
  );
}

export default function OffTrackArt() {
  const id = `ot${useId().replace(/:/g, "")}`;

  return (
    <svg
      className="offtrack-art"
      style={{
        display: "block",
        width: "min(640px, 100%)",
        height: "auto",
        borderRadius: 22,
        boxShadow: "0 24px 60px rgba(var(--cc-shadow-rgb), calc(0.45 * var(--cc-shadow-strength)))",
      }}
      viewBox="0 0 640 300"
      role="img" aria-label="The CodeCaret car, spun off the track and stuck in the gravel">
      <defs>
        <pattern id={`${id}-gravel`} width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill="#8c806a" />
          <circle cx="4" cy="5" r="1.8" fill="#a5987f" />
          <circle cx="15" cy="3" r="1.3" fill="#6f6553" />
          <circle cx="10" cy="12" r="2" fill="#7a6f5c" />
          <circle cx="19" cy="15" r="1.6" fill="#b3a68c" />
          <circle cx="5" cy="18" r="1.4" fill="#675d4c" />
          <circle cx="14" cy="19" r="1" fill="#9d907a" />
        </pattern>
        <pattern id={`${id}-kerb`} width="36" height="16" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)">
          <rect width="18" height="16" fill="#e10600" />
          <rect x="18" width="18" height="16" fill="#f4f4f5" />
        </pattern>
        <linearGradient id={`${id}-asphalt`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24262b" />
          <stop offset="1" stopColor="#2f3238" />
        </linearGradient>
        <linearGradient id={`${id}-paint`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "color-mix(in srgb, var(--cc-accent) 70%, #fff)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--cc-accent)" }} />
          <stop offset="1" style={{ stopColor: "color-mix(in srgb, var(--cc-accent) 50%, #000)" }} />
        </linearGradient>
        <radialGradient id={`${id}-dust`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#d9cfb9" stopOpacity="0.5" />
          <stop offset="1" stopColor="#d9cfb9" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-frame`}>
          <rect width="640" height="300" rx="22" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${id}-frame)`}>
        {/* Gravel trap, track, the white line and the kerb between. */}
        <rect width="640" height="300" fill={`url(#${id}-gravel)`} />
        <path d="M0 0h640v86C480 104 260 118 0 128z" fill={`url(#${id}-asphalt)`} />
        <path d="M0 116C260 106 480 92 640 74" fill="none" stroke="#f4f4f5" strokeWidth="4" opacity="0.85" />
        <path d="M0 128C260 118 480 104 640 86v14C480 118 260 132 0 142z" fill={`url(#${id}-kerb)`} />

        {/* Racing line, then the skid marks: the car went straight on
            where the track turned, snapped round and slid backwards. */}
        <path d="M-10 60C140 52 360 40 650 20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="26" />
        <g fill="none" stroke="#141417" strokeLinecap="round" opacity="0.7">
          <path d="M60 70C190 66 300 80 352 112 392 136 420 170 452 196" strokeWidth="6" />
          <path d="M66 92C196 90 300 104 342 132 376 154 400 186 424 218" strokeWidth="6" />
        </g>
        <g fill="none" stroke="#5b5242" strokeLinecap="round" opacity="0.55">
          <path d="M360 150C392 172 414 196 444 216" strokeWidth="9" strokeDasharray="2 7" />
          <path d="M344 162C368 184 392 210 414 232" strokeWidth="9" strokeDasharray="2 7" />
        </g>

        {/* Thrown gravel and settling dust. */}
        <ellipse cx="470" cy="214" rx="120" ry="60" fill={`url(#${id}-dust)`} />
        {[
          [520, 168, 2.4], [538, 186, 1.8], [552, 210, 2.2], [506, 150, 1.6], [560, 236, 1.6],
          [528, 248, 2], [494, 262, 1.4], [575, 196, 1.3], [544, 160, 1.2], [482, 140, 1.5],
        ].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#b9ad94" />
        ))}

        {/* The car, nose pointing back the way it came. */}
        <g transform="translate(468 214) rotate(-152) scale(1.05)">
          <ellipse cx="0" cy="4" rx="96" ry="40" fill="rgba(0,0,0,0.28)" />
          <CarTopDown id={id} />
        </g>

        {/* A marshal's yellow flag at the barrier. */}
        <g transform="translate(70 232)">
          <rect x="-2" y="-46" width="4" height="58" rx="2" fill="#d1d5db" />
          <path d="M2 -46c12-4 22 4 34 0v24c-12 4-22-4-34 0z" fill="#f2c230" />
        </g>
      </g>
    </svg>
  );
}
