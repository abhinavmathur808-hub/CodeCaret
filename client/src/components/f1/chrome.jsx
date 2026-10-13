import { motion as Motion } from "framer-motion";
import { ACCENT } from "./theme";

/* ══════════════════════════════════════════════════════════════
   Shared panel furniture for the F1 auth pages — the instrument
   surface, the registration marks, the readouts. The page frame
   itself (backdrop, columns, form panel) is AuthLayout.jsx.
   ══════════════════════════════════════════════════════════════ */

/* Engineering-paper grid, barely there — it gives the form panel a
   measured, instrument-like surface without competing with the artwork
   bleeding through the frost. */
export function PanelGrid() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.045]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
        backgroundSize: "34px 34px",
      }}
    />
  );
}

/* Corner registration marks, like a spec drawing. */
export function CornerMarks() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-4 sm:inset-6"
    >
      <span className="absolute top-0 left-0 h-4 w-4 border-t border-l border-white/20" />
      <span className="absolute top-0 right-0 h-4 w-4 border-t border-r border-white/20" />
      <span className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-white/20" />
      <span className="absolute right-0 bottom-0 h-4 w-4 border-r border-b border-white/20" />
    </div>
  );
}

/* Live status line above the heading: a pulsing tally light, what this
   panel is (in the logo's lettering), and a telemetry count on the right. */
export function ReadoutHeader({ label, tally, reduced }) {
  return (
    <div className="flex items-center gap-2 text-white/60">
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        {!reduced && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
            style={{ backgroundColor: ACCENT }}
          />
        )}
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: ACCENT }}
        />
      </span>
      <span className="cc-brand text-[1.05rem] leading-none">{label}</span>
      <span className="ml-auto font-mono text-[0.6rem] tracking-[0.28em] tabular-nums text-white/35 uppercase">
        {tally}
      </span>
    </div>
  );
}

/* Segmented progress meter — one segment per required field. */
export function SegmentMeter({ segments, reduced }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {segments.map((filled, i) => (
        <div
          key={i}
          className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10"
        >
          <Motion.div
            className="h-full w-full origin-left rounded-full"
            initial={false}
            animate={{ scaleX: filled ? 1 : 0 }}
            transition={
              reduced ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
            }
            style={{
              backgroundColor: ACCENT,
              boxShadow: "0 0 10px rgba(225,6,0,0.85)",
            }}
          />
        </div>
      ))}
    </div>
  );
}
