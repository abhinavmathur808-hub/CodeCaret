import { useEffect } from "react";
import { formatPractice } from "../hooks/usePracticeTracker";

/* ══════════════════════════════════════════════════════════════
   PracticeGoalAlert — the daily-target announcement.

   Deliberately NOT a race-engineer radio toast: those are
   in-race chatter that auto-expire in four seconds and stack
   three deep. Hitting a daily goal happens once a day and is
   worth stopping for, so it gets its own pit-wall readout —
   chequered header strip, telemetry type, segmented bar.

   Dismisses on its own after AUTO_DISMISS_MS, on click, or on
   Escape, so it can never trap a typist mid-race.
   ══════════════════════════════════════════════════════════════ */

const AUTO_DISMISS_MS = 8000;
const SEGMENTS = 12;

export default function PracticeGoalAlert({ accumulatedMs, goalMs, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    const onKey = (e) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [onDismiss]);

  return (
    <div className="pg-alert-layer" role="status" aria-live="polite">
      <div className="pg-alert">
        {/* Chequered strip — the one literal flag reference, kept to a
            3px band so it reads as trim rather than decoration. */}
        <div className="pg-alert-flag" aria-hidden="true" />

        {/* Registration marks, matching the spec-drawing language used
            on the auth pages. */}
        <span className="pg-alert-mark pg-alert-mark-tl" aria-hidden="true" />
        <span className="pg-alert-mark pg-alert-mark-tr" aria-hidden="true" />
        <span className="pg-alert-mark pg-alert-mark-bl" aria-hidden="true" />
        <span className="pg-alert-mark pg-alert-mark-br" aria-hidden="true" />

        <div className="pg-alert-head">
          <span className="pg-alert-led" aria-hidden="true" />
          <span className="pg-alert-channel">Pit Wall</span>
          <span className="pg-alert-status">Target Met</span>
        </div>

        <div className="pg-alert-body">
          <span className="pg-alert-eyebrow">Daily practice complete</span>
          <span className="pg-alert-time">{formatPractice(accumulatedMs)}</span>
          <span className="pg-alert-target">
            Target {formatPractice(goalMs)} · active typing only
          </span>

          <div className="pg-alert-bars" aria-hidden="true">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span
                key={i}
                className="pg-alert-bar"
                /* Staggered so the bar sweeps left to right on entry
                   rather than snapping on all at once. */
                style={{ animationDelay: `${i * 45}ms` }}
              />
            ))}
          </div>

          <p className="pg-alert-msg">
            That&apos;s the session. Box for a break, or keep pushing.
          </p>
        </div>

        <button type="button" className="pg-alert-dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
