import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Prism from "prismjs";

/* ── Import Prism language grammars ─────────────────────────── */
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/themes/prism-tomorrow.css";

import useGhostLap from "../hooks/useGhostLap";
import { isEditableTarget } from "../utils/typingTarget";

/* ──────────────────────────────────────────────────────────────
   RaceTrack — core typing-race component with telemetry
   ────────────────────────────────────────────────────────────── */

/** Map snippet language strings to Prism grammar keys */
const LANG_MAP = {
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  jsx: "jsx",
  tsx: "tsx",
  python: "python",
  py: "python",
  c: "c",
  "c++": "cpp",
  cpp: "cpp",
  sql: "sql",
  css: "css",
  json: "json",
  bash: "bash",
  shell: "bash",
  /* Prose warm-ups. "plain" is not a Prism grammar, so the text goes
     through Prism.util.encode untouched — unlisted, it would fall back
     to JavaScript and colour "for", "if" and "new" inside sentences. */
  english: "plain",
};

const IGNORED_KEYS = new Set([
  "Shift", "Control", "Alt", "Meta", "CapsLock", "Escape",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Home", "End", "PageUp", "PageDown", "Insert", "Delete",
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
]);

/* ── Character → e.code mapping for keyboard feedback ────────── */
const CHAR_TO_CODE = {
  // Letters
  a: "KeyA", b: "KeyB", c: "KeyC", d: "KeyD", e: "KeyE",
  f: "KeyF", g: "KeyG", h: "KeyH", i: "KeyI", j: "KeyJ",
  k: "KeyK", l: "KeyL", m: "KeyM", n: "KeyN", o: "KeyO",
  p: "KeyP", q: "KeyQ", r: "KeyR", s: "KeyS", t: "KeyT",
  u: "KeyU", v: "KeyV", w: "KeyW", x: "KeyX", y: "KeyY",
  z: "KeyZ",
  // Digits
  "0": "Digit0", "1": "Digit1", "2": "Digit2", "3": "Digit3",
  "4": "Digit4", "5": "Digit5", "6": "Digit6", "7": "Digit7",
  "8": "Digit8", "9": "Digit9",
  // Shift-digit symbols
  "!": "Digit1", "@": "Digit2", "#": "Digit3", "$": "Digit4",
  "%": "Digit5", "^": "Digit6", "&": "Digit7", "*": "Digit8",
  "(": "Digit9", ")": "Digit0",
  // Punctuation
  "`": "Backquote", "~": "Backquote",
  "-": "Minus",     "_": "Minus",
  "=": "Equal",     "+": "Equal",
  "[": "BracketLeft",  "{": "BracketLeft",
  "]": "BracketRight", "}": "BracketRight",
  "\\": "Backslash",   "|": "Backslash",
  ";": "Semicolon",    ":": "Semicolon",
  "'": "Quote",        '"': "Quote",
  ",": "Comma",        "<": "Comma",
  ".": "Period",       ">": "Period",
  "/": "Slash",        "?": "Slash",
  // Whitespace & special
  " ": "Space",
  "\n": "Enter",
  "\t": "Tab",
};

/** Characters that require Shift to type */
const SHIFT_CHARS = new Set([
  "~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")",
  "_", "+", "{", "}", "|", ":", '"', "<", ">", "?",
]);

/** Left-hand keys — used to determine opposite-hand Shift */
const LEFT_HAND_CODES = new Set([
  "Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5",
  "Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT",
  "CapsLock", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG",
  "ShiftLeft", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB",
]);

/**
 * Resolve a character to its physical e.code + opposite-hand shift.
 * @returns {{ code: string, shiftCode: string|null } | null}
 */
function charToCode(ch) {
  const lower = ch.toLowerCase();
  const code = CHAR_TO_CODE[lower] || CHAR_TO_CODE[ch] || null;
  if (!code) return null;

  const needsShift =
    (ch.length === 1 && ch !== lower && /[A-Z]/.test(ch)) ||
    SHIFT_CHARS.has(ch);

  // Opposite-hand rule: left-hand key → ShiftRight, right-hand key → ShiftLeft
  const shiftCode = needsShift
    ? (LEFT_HAND_CODES.has(code) ? "ShiftRight" : "ShiftLeft")
    : null;

  return { code, shiftCode };
}

export default function RaceTrack({
  snippet,
  language = "javascript",
  onFinish,
  onProgress = null,
  onStats = null,
  keyboardRef = null,
  caretStyle = 'thin',
  freedomMode = false,
  /* Strict mode blocks the caret on a wrong character instead of
     advancing past it — the mistake has to be corrected before the
     race continues. Orthogonal to freedomMode, which governs what
     backspace is allowed to erase. */
  strictMode = false,
  /* When false, the racer types the leading whitespace of every line
     themselves instead of Enter carrying them to the first non-space
     character. */
  autoIndent = true,
  onKeystroke = null,
  /* Mistakes stay invisible until the race ends — you type on feel
     and find out afterwards. Everything is still recorded; only the
     rendering is withheld. */
  blindMode = false,
  /* What gets emphasised ahead of the caret:
     'character' (just the next key), 'word' (the word you are in) or
     'next-word' (the word after it, for readers who work ahead). */
  highlightMode = "character",
  caretBlink = true,
  smoothCaret = true,
  forceFinished = false,
  raceStarted = true,
  /* Catalogue id for the snippet being raced, used to key the ghost
     lap. Null for custom code, which has no stable identity to hang a
     personal best on. */
  snippetId = null,
  /* Replay your personal best on this snippet as a second caret. */
  ghostCaret = true,
  /* Someone else's lap to replay instead of your own best — the track
     record holder's, fetched by the caller: { times, wpm }. Ignored
     unless it was recorded on exactly this text. */
  ghostLap = null,
  /* Stop reading the keyboard entirely. Set while a dialog owns the
     screen: this component listens on `window`, so without it a race
     carries on consuming keystrokes aimed at whatever is on top of
     it — counting them as mistakes and swallowing them before the
     dialog's own fields can see them. */
  paused = false,
}) {
  /* ── Trim ALL leading/trailing whitespace from the snippet ──── */
  const trimmedSnippet = useMemo(() => (snippet || "").trim(), [snippet]);

  /* Array.from, not split(""): split cuts on UTF-16 code units, so
     anything outside the basic plane — an emoji pasted into a custom
     snippet — became two lone surrogate halves. Neither half can be
     typed, which left the caret stuck on a character the keyboard
     cannot produce and the race impossible to finish. */
  const chars = useMemo(() => Array.from(trimmedSnippet), [trimmedSnippet]);
  const len = chars.length;

  /* ── Prism-highlighted HTML for the background layer ──────── */
  const highlightedHTML = useMemo(() => {
    const grammarKey = LANG_MAP[language?.toLowerCase()] || "javascript";
    const grammar = Prism.languages[grammarKey];
    if (!grammar) return Prism.util.encode(trimmedSnippet);
    return Prism.highlight(trimmedSnippet, grammar, grammarKey);
  }, [trimmedSnippet, language]);

  /* ── render-triggering state ─────────────────────────────────
     Only what the code display itself draws. The live numbers (WPM,
     accuracy, keystroke counts) live in refs and reach the page
     through onStats / onFinish — the page owns every readout. */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [charStatuses, setCharStatuses] = useState(() =>
    new Array(len).fill(null)
  );
  const [finished, setFinished] = useState(false);

  /* ── non-render refs (perf) ──────────────────────────────── */
  const startTimeRef = useRef(null);
  const correctRef = useRef(0);
  const incorrectRef = useRef(0);
  const statusesRef = useRef(new Array(len).fill(null));
  /* Wrong keys pressed on each character, kept through corrections:
     a mistake you fixed was still a mistake, and the lap review and
     symbol fluency report want to know where they happened. */
  const missesRef = useRef(new Array(len).fill(0));
  const indexRef = useRef(0);
  const finishedRef = useRef(false);

  /* ── DOM refs ────────────────────────────────────────────── */
  const charSpansRef = useRef([]);
  const caretRef = useRef(null);
  const containerRef = useRef(null);
  const foregroundRef = useRef(null);
  const ghostCaretRef = useRef(null);

  /* ── Ghost lap ────────────────────────────────────────────────
     Recording runs whether or not the ghost is being displayed: it
     costs a couple of array writes per keystroke, and it means
     switching the ghost on later already has laps to replay instead
     of demanding you re-race everything first. `ghostCaret` gates
     playback only.
     ────────────────────────────────────────────────────────────── */
  const ghost = useGhostLap({ snippetId, len, override: ghostLap });
  const ghostIndexRef = useRef(0);
  const ghostVisible = ghostCaret && ghost.hasGhost;

  /* ── Latest parent callbacks, held in refs ────────────────────
     Callers rarely memoize these. Reading them through refs keeps
     the keydown listener and the WPM interval from being torn down
     and rebuilt on every parent render, and — more importantly —
     guarantees we never invoke a stale closure if a caller *does*
     memoize (which would silently freeze sector timing).
     ────────────────────────────────────────────────────────────── */
  const onProgressRef = useRef(onProgress);
  const onFinishRef = useRef(onFinish);
  const onStatsRef = useRef(onStats);
  const onKeystrokeRef = useRef(onKeystroke);
  useEffect(() => {
    onProgressRef.current = onProgress;
    onFinishRef.current = onFinish;
    onStatsRef.current = onStats;
    onKeystrokeRef.current = onKeystroke;
  });

  /* Held in refs for the same reason as the callbacks above: the hook
     hands back a fresh object every render, so referencing it directly
     from advanceChar or the keydown handler would rebuild the global
     listener on every parent render. */
  const ghostRecordRef = useRef(ghost.recordAdvance);
  const ghostRewindRef = useRef(ghost.rewindRecord);
  const ghostCommitRef = useRef(ghost.commitIfPersonalBest);
  const ghostIndexAtRef = useRef(ghost.indexAt);
  const ghostResetRef = useRef(ghost.resetPlayback);
  const ghostSnapshotRef = useRef(ghost.snapshot);
  useEffect(() => {
    ghostRecordRef.current = ghost.recordAdvance;
    ghostRewindRef.current = ghost.rewindRecord;
    ghostCommitRef.current = ghost.commitIfPersonalBest;
    ghostIndexAtRef.current = ghost.indexAt;
    ghostResetRef.current = ghost.resetPlayback;
    ghostSnapshotRef.current = ghost.snapshot;
  });

  /** Accuracy over real (non-auto-advanced) keystrokes. */
  const currentAccuracy = useCallback(() => {
    const total = correctRef.current + incorrectRef.current;
    return total > 0 ? Math.round((correctRef.current / total) * 100) : 100;
  }, []);

  /* ── Reset when the snippet changes ────────────────────────────
     Callers currently force a remount with `key`, which hides the
     fact that none of this state was ever reset. Without this, a
     plain `snippet` prop change would keep the old index, counters
     and a status array sized for the previous snippet.
     ────────────────────────────────────────────────────────────── */
  const loadedSnippetRef = useRef(trimmedSnippet);
  useEffect(() => {
    if (loadedSnippetRef.current === trimmedSnippet) return;
    loadedSnippetRef.current = trimmedSnippet;

    statusesRef.current = new Array(len).fill(null);
    missesRef.current = new Array(len).fill(0);
    indexRef.current = 0;
    correctRef.current = 0;
    incorrectRef.current = 0;
    finishedRef.current = false;
    startTimeRef.current = null;
    charSpansRef.current = [];

    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       This IS a reset-on-prop-change: when the snippet changes every
       piece of race state must go back to zero. Callers also remount
       via `key`, so in practice this is belt-and-braces, but a bare
       `snippet` swap has to be safe on its own. */
    setCharStatuses(new Array(len).fill(null));
    setCurrentIndex(0);
    setFinished(false);
  }, [trimmedSnippet, len]);

  /* ── Position a caret element over a character ────────────────
     Shared by the live caret and the ghost so the two can never
     drift apart: they measure the same spans against the same
     positioned parent, and a change to how one is placed is
     automatically a change to how both are.
     ────────────────────────────────────────────────────────────── */
  const placeCaret = useCallback((el, index, width, nudgeLeft = 0) => {
    const span = charSpansRef.current[index];
    const parent = foregroundRef.current;
    if (!span || !el || !parent) return false;

    const spanRect = span.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    el.style.left = `${spanRect.left - parentRect.left - nudgeLeft}px`;
    el.style.top = `${spanRect.top - parentRect.top}px`;
    el.style.width = `${width}px`;
    el.style.height = `${spanRect.height}px`;
    return true;
  }, []);

  /* ── Position the caret over the current character ───────── */
  const positionCaret = useCallback(() => {
    const isThick = caretStyle === 'thick';
    placeCaret(
      caretRef.current,
      indexRef.current,
      isThick ? 3.5 : 2,
      isThick ? 1 : 0
    );
  }, [caretStyle, placeCaret]);

  /* ── Position the ghost caret ─────────────────────────────────
     Hidden once the ghost crosses the finish line — a caret parked
     on the last character would read as "the ghost is still here",
     when what actually happened is that it already won.
     ────────────────────────────────────────────────────────────── */
  const positionGhostCaret = useCallback(() => {
    const el = ghostCaretRef.current;
    if (!el) return;

    const index = ghostIndexRef.current;
    if (index >= len || !placeCaret(el, index, 2)) {
      el.style.display = "none";
      return;
    }
    el.style.display = "";
  }, [len, placeCaret]);

  /* ── Keystroke handler ───────────────────────────────────── */
  /* ── Helper: record a single character match and advance ── */
  /**
   * Record one character and advance.
   *
   * `synthetic` marks characters the engine auto-advanced through
   * (an indent run covered by a single Tab, or the leading whitespace
   * skipped after Enter). Those are shown as correct but must not
   * earn WPM credit or enter the keystroke log — the racer only
   * pressed one key, and fake log entries with near-identical
   * timestamps look exactly like a macro to the anti-cheat.
   */
  const advanceChar = useCallback(
    (idx, typedChar, { synthetic = false } = {}) => {
      // Start the clock on first keystroke
      if (!startTimeRef.current) {
        startTimeRef.current = performance.now();
      }

      const isCorrect = typedChar === chars[idx];
      statusesRef.current[idx] = isCorrect ? "correct" : "incorrect";

      /* Ghost telemetry. Recorded here rather than in the keydown
         handler because this is the one place every kind of forward
         movement passes through — real keypresses and the synthetic
         runs a Tab or an auto-indent covers alike. The ghost has to
         reproduce the jump, not just the keypress that caused it.

         Deliberately before the `synthetic` early return, and
         deliberately not conditional on `isCorrect`: this records
         where the caret WAS, which is what a replay needs. */
      ghostRecordRef.current(idx, idx + 1, performance.now() - startTimeRef.current);

      if (synthetic) return idx + 1;

      if (isCorrect) correctRef.current++;
      else {
        incorrectRef.current++;
        missesRef.current[idx]++;
      }

      return idx + 1;
    },
    [chars]
  );

  /* ── Finish the race ─────────────────────────────────────── */
  const finishRace = useCallback(() => {
    finishedRef.current = true;
    setFinished(true);

    // A race can be force-finished before the first keystroke.
    const elapsedMs = startTimeRef.current
      ? performance.now() - startTimeRef.current
      : 0;
    const elapsedMin = elapsedMs / 60000;
    const finalWpm =
      elapsedMin > 0 ? Math.round(correctRef.current / 5 / elapsedMin) : 0;

    /* Whether the whole snippet was actually typed, as opposed to the
       race being cut short by the time limit. Both produce a real
       WPM, but only one of them is a lap — the distinction decides
       whether this can take a personal best or a track record. */
    const completed = indexRef.current >= len;

    const stats = {
      wpm: finalWpm,
      correctKeystrokes: correctRef.current,
      incorrectKeystrokes: incorrectRef.current,
      accuracy: currentAccuracy(),
      elapsedMs,
      completed,
    };

    /* Bank the lap if it beat the stored best. `completed` guards
       against a race cut short by the time limit: that produces a
       real WPM but only a partial set of timings, and storing it
       would leave a ghost that sprints and then freezes mid-snippet
       forever. */
    const pb = ghostCommitRef.current({ wpm: finalWpm, completed });

    onStatsRef.current?.(stats);

    onFinishRef.current?.({
      ...stats,
      /* `keystrokeLog` used to ride along here: a per-keystroke
         record of character, timestamp and correctness, built on
         every press and read by nobody. The server is sent
         `keystrokeTimestamps` instead, and the only consumer that
         ever wanted the richer shape — a per-character analyser —
         was itself never wired up. */
      /* Per-character arrival times for the portion actually typed —
         the same recording that drives the ghost. Sliced to the caret
         so an abandoned run does not ship a tail of zeros. The server
         re-derives WPM from this rather than trusting the number
         above it. */
      keystrokeTimestamps: ghostSnapshotRef.current(indexRef.current),
      /* So the results screen can celebrate without re-deriving any
         of it from storage. The commit above already happened, so
         these agree with what is on disk. `previousBest` is null on a
         first clean lap and the beaten record otherwise. */
      personalBest: pb.saved,
      previousBest: pb.previousWpm,
      /* Wrong keys per character, the same length as the snippet. */
      misses: missesRef.current.slice(),
    });
  }, [currentAccuracy, len]);

  /* ── External force-finish (e.g. time limit expired) ──────────
     Runs the normal finish path so the caller receives real final
     stats. It previously only flipped the local `finished` flag,
     leaving the parent to invent its own numbers.
     ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The trigger is a prop (the parent's time limit expiring), so an
       effect is the only place this can run. finishRace sets state
       synchronously by design — the race must be over in the same
       commit the flag arrives. */
    if (forceFinished && !finishedRef.current) finishRace();
  }, [forceFinished, finishRace]);

  /* ── Keystroke handler ───────────────────────────────────── */
  const handleKeyDown = useCallback(
    (e) => {
      if (finishedRef.current) return;
      /* Before anything else, and before any preventDefault: a key
         aimed at a dialog or at a form field is not a race keystroke,
         and must reach whatever it was aimed at untouched. */
      if (paused || isEditableTarget(e.target)) return;
      if (IGNORED_KEYS.has(e.key)) return;

      // Let modifier combos (Ctrl+R, Cmd+C, etc.) pass through to the browser
      // Exception: allow Ctrl/Cmd+Backspace in freedom mode for word deletion
      if (e.ctrlKey || e.metaKey || e.altKey) {
        if (freedomMode && e.key === "Backspace" && (e.ctrlKey || e.metaKey)) {
          // Fall through to the backspace handler below
        } else {
          return;
        }
      }

      // Always prevent default for Tab (focus steal) and Space (page scroll)
      if (e.key === "Tab" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
      }

      const idx = indexRef.current;

      /* ── Backspace ──────────────────────────────────────── */
      if (e.key === "Backspace") {
        e.preventDefault();
        if (idx === 0) return;

        /* Ctrl/Cmd+Backspace — delete to previous word boundary (freedom mode) */
        if (freedomMode && (e.ctrlKey || e.metaKey)) {
          let target = idx - 1;
          // Skip trailing whitespace
          while (target > 0 && /\s/.test(chars[target])) target--;
          // Skip the word characters
          while (target > 0 && !/\s/.test(chars[target - 1])) target--;

          // Clear all statuses from target to idx-1
          for (let i = target; i < idx; i++) {
            if (statusesRef.current[i] === "correct") correctRef.current--;
            if (statusesRef.current[i] === "incorrect") incorrectRef.current--;
            statusesRef.current[i] = null;
          }
          indexRef.current = target;
          /* Drop the timings for everything just erased, so a
             corrected mistake cannot leave the ghost a stale arrival
             time for a character that was typed twice. */
          ghostRewindRef.current(target);
          setCharStatuses([...statusesRef.current]);
          setCurrentIndex(target);
          onProgressRef.current?.(target, len);
          return;
        }

        /* Single-char backspace */
        const prev = idx - 1;

        // Lock correct characters when Freedom Mode is off
        if (!freedomMode && statusesRef.current[prev] === "correct") return;

        if (statusesRef.current[prev] === "correct") correctRef.current--;
        if (statusesRef.current[prev] === "incorrect") incorrectRef.current--;

        statusesRef.current[prev] = null;
        indexRef.current = prev;
        ghostRewindRef.current(prev);

        setCharStatuses([...statusesRef.current]);
        setCurrentIndex(prev);
        onProgressRef.current?.(prev, len);
        return;
      }

      /* ── Map special keys to their snippet characters ───── */
      let typedChar;
      if (e.key === "Enter") {
        typedChar = "\n";
      } else if (e.key === "Tab") {
        typedChar = "\t";
        // If the snippet uses spaces for indentation instead of \t,
        // auto-advance through the matching space run
        if (chars[idx] !== "\t" && chars[idx] === " ") {
          // Count how many leading spaces form this indent block (2 or 4)
          let spaceRun = 0;
          let k = idx;
          while (k < len && chars[k] === " " && spaceRun < 4) {
            spaceRun++;
            k++;
          }
          if (spaceRun >= 2) {
            // Advance through all spaces in this indent block. Only the
            // first counts — one Tab press is one keystroke, not four.
            let nextIdx = idx;
            for (let s = 0; s < spaceRun; s++) {
              nextIdx = advanceChar(nextIdx, " ", { synthetic: s > 0 });
            }
            indexRef.current = nextIdx;
            setCharStatuses([...statusesRef.current]);
            setCurrentIndex(nextIdx);
            onProgressRef.current?.(nextIdx, len);
            /* One Tab press is one key sound, however many spaces it
               covered. */
            onKeystrokeRef.current?.(true, "Tab");
            if (nextIdx >= len) finishRace();
            return;
          }
        }
      } else if (e.key.length === 1) {
        typedChar = e.key;
      } else {
        // Non-printable key we don't handle — ignore
        return;
      }

      e.preventDefault();

      /* ── Strict mode: refuse to move past a mistake ─────────
         The error is counted and shown exactly as it would be
         normally — it just doesn't carry the caret forward, so the
         racer has to type the right character before continuing.
         Backspace is untouched, which means a wrong key here costs
         one keystroke rather than two. */
      if (strictMode && typedChar !== chars[idx]) {
        if (!startTimeRef.current) startTimeRef.current = performance.now();

        incorrectRef.current++;
        missesRef.current[idx]++;
        statusesRef.current[idx] = "incorrect";
        setCharStatuses([...statusesRef.current]);

        if (keyboardRef?.current) {
          keyboardRef.current.flashFeedback(e.code, "wrong");
        }
        onKeystrokeRef.current?.(false, e.key);
        return;
      }

      /* ── Match the character ────────────────────────────── */
      let nextIdx = advanceChar(idx, typedChar);
      const wasCorrect = statusesRef.current[idx] === "correct";

      onKeystrokeRef.current?.(wasCorrect, e.key);

      /* ── Flash keyboard feedback (wrong keys only) ────── */
      if (keyboardRef?.current && !wasCorrect) {
        keyboardRef.current.flashFeedback(e.code, "wrong");
      }

      /* ── Auto-skip to the next line with content ─────────
         One Enter should always land the racer on the first real
         character of the next line. Blank lines are skipped along
         with the indentation: this loop used to stop at "\n", so a
         blank line ate an Enter and left the caret on an empty row —
         the feature appeared to work on most lines and silently fail
         on the 22% of snippets that contain a blank line.

         The Enter itself was counted above; everything skipped here
         is synthetic, so none of it earns WPM credit. */
      if (autoIndent && typedChar === "\n" && chars[idx] === "\n") {
        while (
          nextIdx < len &&
          (chars[nextIdx] === " " ||
            chars[nextIdx] === "\t" ||
            chars[nextIdx] === "\n")
        ) {
          nextIdx = advanceChar(nextIdx, chars[nextIdx], { synthetic: true });
        }
      }

      indexRef.current = nextIdx;
      setCharStatuses([...statusesRef.current]);
      setCurrentIndex(nextIdx);
      onProgressRef.current?.(nextIdx, len);

      if (nextIdx >= len) finishRace();
    },
    [
      chars,
      len,
      advanceChar,
      finishRace,
      keyboardRef,
      freedomMode,
      strictMode,
      autoIndent,
      paused,
    ]
  );

  /* ── Attach global keydown ───────────────────────────────── */
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  /* ── Highlight expected key on the virtual keyboard ─────── */
  useEffect(() => {
    if (!keyboardRef?.current) return;
    /* Don't highlight during pre-race overlay */
    if (!raceStarted) {
      keyboardRef.current.setExpectedKey(null);
      return;
    }
    if (finished || currentIndex >= len) {
      keyboardRef.current.setExpectedKey(null);
      return;
    }
    const expectedChar = chars[currentIndex];
    const result = charToCode(expectedChar);
    if (result) {
      keyboardRef.current.setExpectedKey(result.code, result.shiftCode);
    } else {
      keyboardRef.current.setExpectedKey(null);
    }
  }, [currentIndex, finished, chars, len, keyboardRef, raceStarted]);

  /* ── Live stats broadcast ────────────────────────────────── */
  useEffect(() => {
    const id = setInterval(() => {
      if (!startTimeRef.current || finishedRef.current) return;
      const elapsed = (performance.now() - startTimeRef.current) / 60000;
      if (elapsed <= 0) return;

      const nextWpm = Math.round(correctRef.current / 5 / elapsed);

      // Push live numbers to the parent. Previously parents scraped
      // these out of the DOM by Tailwind class name, which broke on
      // any restyle — this is the supported channel.
      onStatsRef.current?.({
        wpm: nextWpm,
        accuracy: currentAccuracy(),
        correctKeystrokes: correctRef.current,
        incorrectKeystrokes: incorrectRef.current,
        elapsedMs: performance.now() - startTimeRef.current,
      });
    }, 100);
    return () => clearInterval(id);
  }, [currentAccuracy]);

  /* ── Reposition caret on index change ────────────────────── */
  useEffect(() => {
    // Use rAF to ensure the browser has laid out the character spans
    // before we measure their bounding rects (critical for index 0).
    const id = requestAnimationFrame(() => positionCaret());
    return () => cancelAnimationFrame(id);
  }, [currentIndex, positionCaret]);

  /* ── Ghost playback ───────────────────────────────────────────
     A raw rAF loop that writes to the DOM directly. Deliberately no
     React state anywhere in here: the ghost moves up to 60 times a
     second, and routing that through setState would re-render the
     whole character list — hundreds of spans — on every frame, for
     an element that is two pixels wide. The live caret is positioned
     the same way for the same reason.

     The clock is `startTimeRef`, not the `raceStarted` prop, because
     that is the zero the timings were recorded against. The two
     differ: `raceStarted` flips when the parent says the race is on,
     while the recorded clock begins on the first actual keystroke.
     Racing a ghost against a different zero would make it look
     faster or slower than the lap it came from.
     ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!ghostVisible || finished) return undefined;

    let frame = 0;
    const tick = () => {
      const start = startTimeRef.current;
      /* Before the first keystroke there is no clock to replay
         against, so the ghost waits on the start line with us. */
      if (start !== null) {
        const next = ghostIndexAtRef.current(performance.now() - start);
        if (next !== ghostIndexRef.current) {
          ghostIndexRef.current = next;
          positionGhostCaret();
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ghostVisible, finished, positionGhostCaret]);

  /* Park the ghost on the start line whenever the lap it is replaying
     changes, and place it there so it is visible before the off. */
  useEffect(() => {
    ghostIndexRef.current = 0;
    ghostResetRef.current();
    if (ghostVisible) {
      const id = requestAnimationFrame(() => positionGhostCaret());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [ghostVisible, trimmedSnippet, positionGhostCaret]);

  /* ── Auto-scroll the code container (sliding window) ────── */
  useEffect(() => {
    if (!containerRef.current) return;

    const activeSpan = charSpansRef.current[currentIndex];
    if (!activeSpan) return;

    // activeSpan.offsetTop is relative to its positioned parent (foregroundRef).
    // Translate all layers upward so the active line stays near the top.
    const offset = Math.max(0, activeSpan.offsetTop - 50);

    const layers = containerRef.current.querySelectorAll('.rt-code-layer');
    layers.forEach((layer) => {
      layer.style.transform = `translateY(-${offset}px)`;
      layer.style.transition = 'transform 0.15s ease-out';
    });
  }, [currentIndex]);

  useEffect(() => {
    const handleResize = () => positionCaret();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [positionCaret]);

  /* ── Highlight span ──────────────────────────────────────────
     The half-open range of upcoming characters to emphasise. In
     'character' mode that is just the caret; the word modes widen it
     to a whitespace-delimited run, which is what lets someone read a
     word ahead instead of one key ahead. */
  const highlightRange = useMemo(() => {
    if (finished) return [-1, -1];
    if (highlightMode === "character") return [currentIndex, currentIndex + 1];

    const isBreak = (i) => i >= len || /\s/.test(chars[i]);

    /* The run of upcoming characters that starts at the caret. */
    const wordFrom = (i) => {
      let from = i;
      while (from < len && /\s/.test(chars[from])) from++;
      let to = from;
      while (!isBreak(to)) to++;
      return to;
    };

    /* Word containing (or starting at) the caret. */
    let start = currentIndex;
    while (start > 0 && !isBreak(start - 1)) start--;
    let end = currentIndex;
    while (!isBreak(end)) end++;

    if (highlightMode === "word") {
      /* When the caret sits ON whitespace, `end` collapses to the caret
         and `start` walks back over the word just typed — a range made
         entirely of characters that already carry a typed status, so
         nothing rendered as highlighted at all. Code is whitespace-heavy
         (every indent, every gap between tokens), so that blanked the
         highlight at 28% of caret positions across the snippet corpus.
         Highlight forward instead: the gap plus the word about to be
         typed, which is what "the word you're on" means at a break. */
      if (isBreak(currentIndex)) return [currentIndex, wordFrom(currentIndex)];
      return [start, end];
    }

    /* next-word: step over the gap, then take the following run. */
    let nextStart = end;
    while (nextStart < len && /\s/.test(chars[nextStart])) nextStart++;
    return [nextStart, wordFrom(nextStart)];
  }, [chars, len, currentIndex, highlightMode, finished]);

  /* ── Derived values ──────────────────────────────────────── */
  const getCharClass = (status, index) => {
    /* Blind mode withholds the verdict, not the fact that you typed
       something — everything already typed reads the same until the
       race ends, then the real statuses appear. */
    if (blindMode && !finished) {
      if (status === "correct" || status === "incorrect") {
        return "rt-char-typed";
      }
    } else {
      if (status === "correct") return "rt-char-correct";
      if (status === "incorrect") return "rt-char-incorrect";
    }

    if (index >= highlightRange[0] && index < highlightRange[1]) {
      return "rt-char-active";
    }
    return "rt-char-pending";
  };

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="w-full max-w-4xl mx-auto select-none">
      {/* ── Code display (dual-layer) ────────────────────── */}
      <div
        ref={containerRef}
        className="relative bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-2xl code-display focus:outline-none overflow-hidden"
        style={{ cursor: "text" }}
        tabIndex={0}
      >
        {/* CSS custom property for synchronized padding */}
        <style>{`
          .code-display { --editor-pad: 1.5rem; }
          @media (min-width: 768px) { .code-display { --editor-pad: 2rem; } }
        `}</style>

        {/* ── Layer stack ──────────────────────────────────────────
            In-flow and positioned, so the two absolute overlay layers
            below resolve `inset: 0` against THIS box. Anchored to the
            container instead, they resolved against its padding box —
            spanning the container's full width, ignoring its horizontal
            padding, and wrapping at a different width than the ghost
            that sizes the container.
            ──────────────────────────────────────────────────────── */}
        <div className="rt-layer-stack" style={{ position: "relative" }}>
        {/* Sizing ghost — invisible, in-flow, sets the container height */}
        <div
          className="rt-code-layer"
          style={{ visibility: "hidden" }}
          aria-hidden="true"
        >
          {chars.map((char, i) => (
            <span key={i} className="relative inline">
              {char}
            </span>
          ))}
        </div>

        {/* Background Layer: Prism-highlighted code (read-only) */}
        <pre
          className={`rt-code-layer language-${LANG_MAP[language?.toLowerCase()] || "javascript"}`}
          style={{
            background: "transparent",
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            padding: "var(--editor-pad)",
            overflow: "hidden",
          }}
          dangerouslySetInnerHTML={{ __html: highlightedHTML }}
        />

        {/* Foreground Layer: Typing feedback overlay */}
        <div
          ref={foregroundRef}
          className={`rt-code-layer${caretStyle === 'caret-only' ? ' hide-active-highlight' : ''}`}
          style={{
            position: "absolute",
            inset: 0,
            padding: "var(--editor-pad)",
            zIndex: 5,
          }}
        >
          {/* Ghost first in source order as well as behind in z-index:
              if both carets land on the same character, the live one
              must be the one you can see. */}
          {ghostVisible && !finished && (
            <div
              ref={ghostCaretRef}
              className="rt-ghost-caret absolute pointer-events-none"
              aria-hidden="true"
            />
          )}

          {!finished && (
            <div
              ref={caretRef}
              className={`caret absolute pointer-events-none z-10${caretStyle === 'thick' ? ' caret-thick' : ''}${caretBlink ? '' : ' caret-steady'}`}
              style={{
                /* Smooth glides between characters; off snaps, which
                   some people find easier to track at speed. */
                transition: smoothCaret
                  ? "left 90ms ease-out, top 90ms ease-out"
                  : "none",
                ...(caretStyle === 'thick'
                  ? { borderRadius: "1.5px" }
                  : {
                      background: "#e10600",
                      borderRadius: "1px",
                      filter: "drop-shadow(0 0 6px rgba(var(--cc-accent-rgb), 0.9)) drop-shadow(0 0 14px rgba(var(--cc-accent-rgb), 0.5))",
                    }),
              }}
            />
          )}

          {chars.map((char, i) => (
            <span
              key={i}
              ref={(el) => (charSpansRef.current[i] = el)}
              className={`relative inline ${getCharClass(charStatuses[i], i)}`}
            >
              {char}
            </span>
          ))}
        </div>
        </div>
      </div>

      {/* ── Highlighting CSS ──────────────────────────────── */}
      <style>{`
        .rt-char-pending {
          color: var(--color-untyped, rgba(255,255,255,0.35));
        }
        .rt-char-correct {
          color: var(--color-accent, #22c55e);
        }
        .rt-char-incorrect {
          background: rgba(var(--cc-error-rgb), 0.7);
          color: #fff;
          border-radius: 2px;
        }
        /* Blind mode: typed characters read identically whether they
           were right or wrong. Deliberately NOT the correct colour —
           a neutral tone avoids implying everything was correct. */
        .rt-char-typed {
          color: var(--cc-text-2, rgba(255,255,255,0.85));
        }
        /* ── Ghost caret ──────────────────────────────────────
           Your personal best, replayed. Purple because the app
           already uses purple for "fastest" (the engineer radio's
           purple-sector call), and translucent so it reads as a
           record of a lap rather than a second competitor.

           Never blinks: a blinking ghost reads as a cursor waiting
           for input, and this one is a moving object. The short
           linear transition carries it between characters — and
           across the multi-character jumps an auto-indented run
           replays as — instead of teleporting.

           z-index sits below the live caret's z-10 so that when
           both occupy the same character, yours is on top. */
        .rt-ghost-caret {
          z-index: 9;
          border-radius: 1px;
          background: rgba(167, 139, 250, 0.55);
          box-shadow: 0 0 8px rgba(167, 139, 250, 0.45);
          transition: left 90ms linear, top 90ms linear;
          animation: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .rt-ghost-caret { transition: none; }
        }

        /* Beats the themed rules that set the blink with !important. */
        .caret.caret-steady,
        .light-typing-sandbox .caret.caret-steady,
        .caret-thick.caret-steady {
          animation: none !important;
          opacity: 1 !important;
        }

        /* ── Lock down Prism — prevent ANY layout shift ────── */
        .code-display pre[class*="language-"],
        .code-display code[class*="language-"],
        .code-display .rt-code-layer {
          background: transparent !important;
          text-shadow: none !important;
          font-family: var(--global-font, "Fira Code", "Courier New", monospace) !important;
          /* font-size and line-height are controlled by TestTyping.css */
          letter-spacing: 0.02em !important;
          white-space: pre-wrap !important;
          word-break: normal !important;
          /* Last-resort break for a token too long to fit on its own
             line. Without it such a token overflows the editor and is
             clipped away invisibly. Applied to every layer so they all
             wrap at exactly the same points. */
          overflow-wrap: break-word !important;
          tab-size: 4 !important;
          -moz-tab-size: 4 !important;
          box-sizing: border-box !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          border-radius: 0 !important;
          overflow: visible !important;
        }

        /* The stack owns the geometry all three layers share. */
        .code-display .rt-layer-stack {
          width: 100%;
          min-width: 0;
        }

        /* Prism token spans must not inject their own spacing */
        .code-display .token {
          white-space: inherit !important;
          word-break: inherit !important;
          overflow-wrap: inherit !important;
          tab-size: inherit !important;
        }
      `}</style>
    </div>
  );
}
