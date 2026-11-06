import { useState } from "react";

/* ══════════════════════════════════════════════════════════════
   MobileNotice — on phones only, a polite note that CodeCaret is built
   for a keyboard and a large screen.

   Hidden from Tailwind's md breakpoint (768px) up, so laptops and
   desktops never see it. Dismissing it is remembered on this device.
   It sits above the page but below dialogs (z-index 450; dialogs use
   500 and up), so it never covers a dialog's buttons.
   ══════════════════════════════════════════════════════════════ */

const DISMISSED_KEY = "cc_mobile_notice_dismissed";

export default function MobileNotice() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) !== "1";
    } catch {
      return true;
    }
  });

  if (!open) return null;

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage blocked: it shows again next visit, which is harmless.
    }
  };

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[450] flex items-center gap-3
                 rounded-2xl border border-[var(--cc-border-strong)] bg-[var(--cc-elevated)] py-3 pr-2 pl-3.5
                 text-[var(--cc-text)] shadow-[0_12px_32px_rgba(0,0,0,0.45)] md:hidden"
    >
      <svg
        className="h-5 w-5 shrink-0 text-[var(--cc-accent)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="16" height="11" rx="1.5" />
        <path d="M2 19h20" />
      </svg>
      <p className="m-0 flex-1 text-[0.85rem] leading-snug text-[var(--cc-text-2)]">
        For the best experience, please view this website on a laptop or desktop screen.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss this notice"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--cc-text-3)] transition-colors
                   hover:bg-[var(--cc-surface)] hover:text-[var(--cc-text)]
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cc-accent)]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
