import { useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════════════
   Onboarding — the first visit's four tips, once.

   The race screen is a lot of instrument panel for someone who has
   never seen it, and the two rules that trip newcomers up — the
   clock starts on your first key, and Enter jumps the indentation
   for you — are not things anyone guesses. Shown on the first visit
   to /test, dismissed for good with one button (or Esc).
   ══════════════════════════════════════════════════════════════ */

export const ONBOARDED_KEY = "cc_onboarded";

const Icon = ({ children }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export default function Onboarding({ touch = false, onClose }) {
  const startRef = useRef(null);

  useEffect(() => {
    startRef.current?.focus();
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const tips = [
    {
      icon: (
        <Icon>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
        </Icon>
      ),
      title: "Type the code exactly",
      text: touch
        ? "Tap the code to bring up your keyboard. The clock starts on your first key, not before."
        : "The clock starts on your first key, not before. Mistakes show in red; strict mode makes you fix them.",
    },
    {
      icon: (
        <Icon>
          <path d="M9 10 4 15l5 5" />
          <path d="M20 4v7a4 4 0 0 1-4 4H4" />
        </Icon>
      ),
      title: "Enter skips the indent",
      text: "Enter lands you on the next line's first character, and Tab covers an indent, as in an editor.",
    },
    {
      icon: (
        <Icon>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </Icon>
      ),
      title: touch ? "Restart any time" : "Tab + Enter restarts",
      text: touch
        ? "Retry and next track wait on the results screen, along with a replay of your lap."
        : "Hold Tab and press Enter to restart a lap. On the results, Enter races the next track.",
    },
    {
      icon: (
        <Icon>
          <path d="M9 10h.01M15 10h.01" />
          <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 3 2.5-3 2.5 3 2.5-3 3 3V10a8 8 0 0 0-8-8z" />
        </Icon>
      ),
      title: "Race your ghost",
      text: "Your best lap on each track comes back as a faint caret to beat, or race the record holder's.",
    },
  ];

  return (
    <>
      <div className="settings-modal-backdrop" onClick={onClose} />
      <div className="onboard" role="dialog" aria-modal="true" aria-labelledby="onboard-title" aria-describedby="onboard-sub">
        <p className="cc-brand onboard-eyebrow">Welcome to the grid</p>
        <h2 id="onboard-title" className="onboard-title">How a lap works</h2>
        <p id="onboard-sub" className="onboard-sub">
          Four things worth knowing before lights out.
        </p>
        <ol className="onboard-tips">
          {tips.map((t) => (
            <li key={t.title} className="onboard-tip">
              <span className="onboard-icon">{t.icon}</span>
              <span>
                <strong>{t.title}</strong>
                <span>{t.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="onboard-foot">
          Languages, length, ghosts and themes are under <strong>Change setup</strong>, below the code.
        </p>
        <button ref={startRef} type="button" className="f1-btn primary onboard-go" onClick={onClose}>
          Start racing →
        </button>
      </div>
    </>
  );
}
