import { useRef, useEffect, useImperativeHandle, forwardRef, memo } from "react";
import "./VirtualKeyboard.css";

/* ═══════════════════════════════════════════════════════════════
   VirtualKeyboard — Ref-Mapped Architecture (Zero Re-renders)
   ─────────────────────────────────────────────────────────────
   Every key DOM node is stored in a Map keyed by e.code.
   keydown/keyup listeners do direct classList toggle —
   no React state, no reconciliation, no lag.

   Maps are used instead of plain objects to eliminate
   prototype-pollution vectors flagged by static analysis.
   ═══════════════════════════════════════════════════════════════ */

/* ── SVG icon constants — rendered as React elements ─────────── */
const ICON_PROPS = { viewBox: "0 0 24 24", width: "16", height: "16", stroke: "currentColor", strokeWidth: "2", fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };

const SVGS = {
  backspace: <svg {...ICON_PROPS}><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" /></svg>,
  enter: <svg {...ICON_PROPS}><polyline points="9 10 4 15 9 20" /><path d="M20 4v7a4 4 0 0 1-4 4H4" /></svg>,
  shift: <svg {...ICON_PROPS}><path d="M12 3l8 10h-5v8H9v-8H4z" /></svg>,
  tab: <svg {...ICON_PROPS}><line x1="21" y1="6" x2="21" y2="18" /><polyline points="14 8 18 12 14 16" /><line x1="3" y1="12" x2="18" y2="12" /></svg>,
};

/* ── ANSI Layout — 5 rows ────────────────────────────────────── */
const ROWS = [
  /* Row 0 — Number row */
  [
    { label: "`",  shiftLabel: "~", code: "Backquote" },
    { label: "1",  shiftLabel: "!", code: "Digit1" },
    { label: "2",  shiftLabel: "@", code: "Digit2" },
    { label: "3",  shiftLabel: "#", code: "Digit3" },
    { label: "4",  shiftLabel: "$", code: "Digit4" },
    { label: "5",  shiftLabel: "%", code: "Digit5" },
    { label: "6",  shiftLabel: "^", code: "Digit6" },
    { label: "7",  shiftLabel: "&", code: "Digit7" },
    { label: "8",  shiftLabel: "*", code: "Digit8" },
    { label: "9",  shiftLabel: "(", code: "Digit9" },
    { label: "0",  shiftLabel: ")", code: "Digit0" },
    { label: "-",  shiftLabel: "_", code: "Minus" },
    { label: "=",  shiftLabel: "+", code: "Equal" },
    { label: "Backspace", code: "Backspace", width: "backspace", modifier: true },
  ],
  /* Row 1 — QWERTY */
  [
    { label: "Tab", icon: SVGS.tab, code: "Tab", width: "tab", modifier: true },
    { label: "Q",    code: "KeyQ", alpha: true },
    { label: "W",    code: "KeyW", alpha: true },
    { label: "E",    code: "KeyE", alpha: true },
    { label: "R",    code: "KeyR", alpha: true },
    { label: "T",    code: "KeyT", alpha: true },
    { label: "Y",    code: "KeyY", alpha: true },
    { label: "U",    code: "KeyU", alpha: true },
    { label: "I",    code: "KeyI", alpha: true },
    { label: "O",    code: "KeyO", alpha: true },
    { label: "P",    code: "KeyP", alpha: true },
    { label: "[",    shiftLabel: "{", code: "BracketLeft" },
    { label: "]",    shiftLabel: "}", code: "BracketRight" },
    { label: "\\",   shiftLabel: "|", code: "Backslash", width: "backslash" },
  ],
  /* Row 2 — Home row */
  [
    { label: "Caps Lock", code: "CapsLock", width: "caps", modifier: true },
    { label: "A",      code: "KeyA", alpha: true },
    { label: "S",      code: "KeyS", alpha: true },
    { label: "D",      code: "KeyD", alpha: true },
    { label: "F",      code: "KeyF", alpha: true },
    { label: "G",      code: "KeyG", alpha: true },
    { label: "H",      code: "KeyH", alpha: true },
    { label: "J",      code: "KeyJ", alpha: true },
    { label: "K",      code: "KeyK", alpha: true },
    { label: "L",      code: "KeyL", alpha: true },
    { label: ";",      shiftLabel: ":", code: "Semicolon" },
    { label: "'",      shiftLabel: "\"", code: "Quote" },
    { label: "Enter", icon: SVGS.enter, code: "Enter", width: "enter", modifier: true },
  ],
  /* Row 3 — Bottom alpha row */
  [
    { label: "Shift", icon: SVGS.shift, code: "ShiftLeft", width: "shift-l", modifier: true },
    { label: "Z",      code: "KeyZ", alpha: true },
    { label: "X",      code: "KeyX", alpha: true },
    { label: "C",      code: "KeyC", alpha: true },
    { label: "V",      code: "KeyV", alpha: true },
    { label: "B",      code: "KeyB", alpha: true },
    { label: "N",      code: "KeyN", alpha: true },
    { label: "M",      code: "KeyM", alpha: true },
    { label: ",",      shiftLabel: "<", code: "Comma" },
    { label: ".",      shiftLabel: ">", code: "Period" },
    { label: "/",      shiftLabel: "?", code: "Slash" },
    { label: "Shift", icon: SVGS.shift, code: "ShiftRight", width: "shift-r", modifier: true },
  ],
  /* Row 4 — Space bar row */
  [
    { label: "Ctrl",  code: "ControlLeft",  width: "ctrl", modifier: true },
    { label: "Win",   code: "MetaLeft",     width: "meta", modifier: true },
    { label: "Alt",   code: "AltLeft",      width: "alt",  modifier: true },
    { label: "",      code: "Space",        width: "space" },
    { label: "Alt",   code: "AltRight",     width: "alt",  modifier: true },
    { label: "Fn",    code: "Fn",           width: "fn",   modifier: true },
    { label: "Ctrl",  code: "ControlRight", width: "ctrl", modifier: true },
  ],
];

/* Set of valid key codes derived from the layout — used to guard
   Map lookups and prevent access to unrecognised codes. */
const VALID_CODES = new Set(ROWS.flat().map((k) => k.code));

/* ── Component ───────────────────────────────────────────────── */
const VirtualKeyboard = forwardRef(function VirtualKeyboard(_, ref) {
  /* Maps avoid prototype-pollution vectors that plain objects expose */
  const keyRefs = useRef(new Map());
  const feedbackTimers = useRef(new Map());
  const containerRef = useRef(null);
  const currentExpected = useRef(null);

  /* ── Expose keyRefs + helpers to parent via ref ─────────────── */
  useImperativeHandle(ref, () => ({
    /** Direct access to DOM nodes by e.code */
    keyRefs: keyRefs.current,

    /**
     * Flash a key with "correct" or "wrong" feedback.
     * Auto-clears after `durationMs` (default 250ms).
     * @param {string} code   - e.code (e.g. "KeyA", "Space")
     * @param {"correct"|"wrong"} type
     * @param {number} durationMs
     */
    flashFeedback(code, type, durationMs = 250) {
      if (!VALID_CODES.has(code)) return;
      const el = keyRefs.current.get(code);
      if (!el) return;

      // Clear any existing timer for this key
      const existing = feedbackTimers.current.get(code);
      if (existing !== undefined) {
        clearTimeout(existing);
      }

      el.setAttribute("data-feedback", type);

      feedbackTimers.current.set(code, setTimeout(() => {
        el.removeAttribute("data-feedback");
        feedbackTimers.current.delete(code);
      }, durationMs));
    },

    /**
     * Highlight the next expected key with a blue glow.
     * Optionally highlights the correct opposite-hand Shift key
     * for proper touch-typing form.
     * Clears all previous expected keys automatically.
     * @param {string|null} code      - e.code, or null to clear
     * @param {string|null} shiftCode - "ShiftLeft" or "ShiftRight", or null
     */
    setExpectedKey(code, shiftCode = null) {
      // Remove all previous expected highlights
      if (currentExpected.current) {
        for (const prevCode of currentExpected.current) {
          const prev = keyRefs.current.get(prevCode);
          if (prev) prev.classList.remove("expected");
        }
        currentExpected.current = null;
      }

      // Apply new expected highlights
      if (code && VALID_CODES.has(code)) {
        const codes = [code];
        const el = keyRefs.current.get(code);
        if (el) el.classList.add("expected");

        // Highlight the specific opposite-hand Shift key
        if (shiftCode && VALID_CODES.has(shiftCode)) {
          const shiftEl = keyRefs.current.get(shiftCode);
          if (shiftEl) { shiftEl.classList.add("expected"); codes.push(shiftCode); }
        }

        currentExpected.current = codes;
      }
    },
    // Everything above reads through refs, so the handle never needs
    // to be rebuilt — without this the parent got a new object on
    // every render of the keyboard.
  }), []);

  useEffect(() => {
    const timers = feedbackTimers.current;
    const keys = keyRefs.current;

    /* ── Sync caps-active class with OS CapsLock state ──────── */
    const syncCapsLock = (e) => {
      if (!containerRef.current) return;
      const isCaps = e.getModifierState("CapsLock");
      containerRef.current.classList.toggle("caps-active", isCaps);
    };

    const handleKeyDown = (e) => {
      syncCapsLock(e);

      if (!VALID_CODES.has(e.code)) return;
      const el = keyRefs.current.get(e.code);
      if (el) el.classList.add("pressed");
    };

    const handleKeyUp = (e) => {
      syncCapsLock(e);

      if (!VALID_CODES.has(e.code)) return;
      const el = keyRefs.current.get(e.code);
      if (el) el.classList.remove("pressed");
    };

    /* Releasing a key while the window is blurred never fires keyup,
       which left keys stuck in the "pressed" state. */
    const releaseAll = () => {
      keys.forEach((el) => el.classList.remove("pressed"));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", releaseAll);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", releaseAll);
      // Clear all pending feedback timers
      timers.forEach((timerId) => clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  return (
    <div className="vk-container" id="virtual-keyboard" ref={containerRef}>
      {ROWS.map((row, ri) => (
        <div className="vk-row" key={ri}>
          {row.map((k) => (
            <div
              key={k.code}
              ref={(el) => {
                if (el && VALID_CODES.has(k.code)) keyRefs.current.set(k.code, el);
              }}
              data-code={k.code}
              className={
                "vk-key" +
                (k.width ? ` vk-key--${k.width}` : "") +
                (k.modifier ? " vk-key--modifier" : "") +
                (k.alpha ? " vk-key-alpha" : "")
              }
            >
              {k.shiftLabel ? (
                <>
                  <span className="vk-shift-label">{k.shiftLabel}</span>
                  <span className="vk-primary-label">{k.label}</span>
                </>
              ) : k.icon && (k.code === 'ShiftLeft' || k.code === 'Tab') ? (
                <>
                  <span className="vk-modifier-icon">{k.icon}</span>
                  <span className="vk-modifier-text">{k.label}</span>
                </>
              ) : k.icon ? (
                <>
                  <span className="vk-modifier-text">{k.label}</span>
                  <span className="vk-modifier-icon">{k.icon}</span>
                </>
              ) : (
                k.label
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});

export default memo(VirtualKeyboard);
