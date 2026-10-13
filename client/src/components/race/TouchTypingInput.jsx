import { useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════════════
   TouchTypingInput — lets a phone race.

   The race engine listens for keydown on `window`, because the code
   on screen is painted text with nothing focusable under it. On a
   phone that is a dead end: no focused field, no on-screen keyboard,
   and the keyboards that do appear mostly report every key as
   "Unidentified".

   This is a transparent field laid over the code. Tapping the code
   focuses it, which is what brings the keyboard up (iOS will only do
   that from a real tap). Whatever the keyboard then inserts is read
   from `beforeinput` and replayed as the plain keydown events the
   page already understands, dispatched on `window` — so the engine,
   the start lights, the sounds and the Tab+Enter restart all work
   exactly as they do on a desktop, with no second code path.

   The field's own key events never double up: they are aimed at a
   form field, which every race listener already ignores
   (utils/typingTarget.js).
   ══════════════════════════════════════════════════════════════ */

/* Kept in the field so Backspace always has something to delete:
   several Android keyboards send nothing at all for Backspace in an
   empty field. */
const SENTINEL = " ";

/* iOS "smart punctuation" curls quotes even with autocorrect off;
   code needs the straight ones. */
const STRAIGHTEN = { "‘": "'", "’": "'", "“": '"', "”": '"' };

function press(key) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

function typeText(text) {
  for (const ch of text || "") press(ch === "\n" ? "Enter" : STRAIGHTEN[ch] ?? ch);
}

export default function TouchTypingInput({ disabled = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reset = () => {
      el.value = SENTINEL;
      el.setSelectionRange(SENTINEL.length, SENTINEL.length);
    };
    reset();

    const onBeforeInput = (e) => {
      switch (e.inputType) {
        case "insertText":
        case "insertReplacementText":
          e.preventDefault();
          typeText(e.data ?? e.dataTransfer?.getData("text/plain"));
          break;
        case "insertLineBreak":
        case "insertParagraph":
          e.preventDefault();
          press("Enter");
          break;
        case "deleteContentBackward":
        case "deleteWordBackward":
        case "deleteSoftLineBackward":
          e.preventDefault();
          press("Backspace");
          break;
        default:
          /* Composition (a keyboard building a word) cannot be
             cancelled; its text is taken whole at compositionend. */
          break;
      }
    };
    const onCompositionEnd = (e) => {
      typeText(e.data);
      reset();
    };
    /* Anything that got past beforeinput — a keyboard that ignored
       preventDefault — is dropped rather than left to build up. */
    const onInput = (e) => {
      if (!e.isComposing) reset();
    };
    /* A tap moves the field's own caret; keep it at the end so the
       next Backspace still has the sentinel to eat. */
    const onSelect = () => {
      if (el.selectionStart !== SENTINEL.length) el.setSelectionRange(SENTINEL.length, SENTINEL.length);
    };

    el.addEventListener("beforeinput", onBeforeInput);
    el.addEventListener("compositionend", onCompositionEnd);
    el.addEventListener("input", onInput);
    el.addEventListener("select", onSelect);
    return () => {
      el.removeEventListener("beforeinput", onBeforeInput);
      el.removeEventListener("compositionend", onCompositionEnd);
      el.removeEventListener("input", onInput);
      el.removeEventListener("select", onSelect);
    };
  }, []);

  /* A dialog opening, or the lap ending, puts the keyboard away. */
  useEffect(() => {
    if (disabled) ref.current?.blur();
  }, [disabled]);

  return (
    <textarea
      ref={ref}
      className="race-touch-input"
      aria-label="Type the code shown here"
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      inputMode="text"
      enterKeyHint="enter"
      rows={1}
      disabled={disabled}
      data-race-input=""
    />
  );
}
