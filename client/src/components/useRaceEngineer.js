import { useState, useEffect, useRef, useCallback } from "react";

/* ──────────────────────────────────────────────────────────────
   useRaceEngineer — F1 Race Engineer Radio Comms
   ──────────────────────────────────────────────────────────────
   Turns live race telemetry into toast-style "radio" messages.

   The caller pushes telemetry in from its own event handlers
   (report*) rather than the hook watching props via effects:
   these messages are events, not derived state, and triggering
   them from effects meant a setState on every WPM tick.
   ────────────────────────────────────────────────────────────── */

const TOAST_DURATION = 4000; // ms before auto-dismiss
const MAX_TOASTS = 3;

/** Correct chars in a row before "purple sector" fires. */
const PURPLE_STREAK = 10;
/** Cooldown before purple sector can fire again. */
const PURPLE_COOLDOWN = 5000;
const PACE_DROP_COOLDOWN = 8000;
const ACCURACY_COOLDOWN = 10000;

/* Message definitions.

   `critical` marks the messages that survive at the "Critical only"
   verbosity: the two that bookend a race, plus the accuracy warning,
   which is the one piece of genuinely actionable feedback. Everything
   else is encouragement — good to have, first to go when someone finds
   the radio distracting mid-race. */
const MESSAGES = {
  PURPLE_SECTOR: {
    id: "purple_sector",
    icon: "🟣",
    text: "Purple sector. Keep pushing.",
    priority: 2,
    critical: false,
  },
  ACCURACY_DROP: {
    id: "accuracy_drop",
    icon: "⚠️",
    text: "Accuracy dropping. Steady the pace.",
    priority: 3,
    critical: true,
  },
  DRS_ENABLED: {
    id: "drs_enabled",
    icon: "🚀",
    text: "DRS enabled. Go go go!",
    priority: 1,
    critical: false,
  },
  PACE_DROP: {
    id: "pace_drop",
    icon: "📻",
    text: "Box box box. Reset the pace.",
    priority: 2,
    critical: false,
  },
  CHEQUERED_FLAG: {
    id: "chequered_flag",
    icon: "🏁",
    text: "Chequered flag! Great drive.",
    priority: 0,
    critical: true,
  },
  GOOD_START: {
    id: "good_start",
    icon: "🟢",
    text: "Lights out and away we go!",
    priority: 0,
    critical: true,
  },
};

export const ENGINEER_VERBOSITY = [
  { id: "off", label: "Off" },
  { id: "critical", label: "Critical" },
  { id: "full", label: "Full" },
];

export const DEFAULT_VERBOSITY = "full";

/** Per-race tracking state. */
const freshState = () => ({
  streak: 0,
  lastCorrect: 0,
  lastIncorrect: 0,
  peakWpm: 0,
  lastAccuracy: 100,
  fired: new Set(),
  finished: false,
});

export default function useRaceEngineer(verbosity = DEFAULT_VERBOSITY) {
  const [messages, setMessages] = useState([]);

  /* Read through a ref so addMessage keeps a stable identity — it is a
     dependency of every report* callback, which the caller wires into
     hot paths. */
  const verbosityRef = useRef(verbosity);
  useEffect(() => {
    verbosityRef.current = verbosity;
  }, [verbosity]);

  const timersRef = useRef(new Map());
  /** Monotonic, so no two toasts can ever share an id. */
  const toastSeqRef = useRef(0);
  const stateRef = useRef(freshState());
  /** Cooldown timers, tracked separately so reset() can cancel them. */
  const cooldownsRef = useRef(new Set());

  /* ── Timer bookkeeping ────────────────────────────────────── */
  const clearToastTimer = useCallback((uniqueId) => {
    const timer = timersRef.current.get(uniqueId);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersRef.current.delete(uniqueId);
    }
  }, []);

  const dismissMessage = useCallback(
    (uniqueId) => {
      setMessages((prev) => prev.filter((m) => m.uniqueId !== uniqueId));
      clearToastTimer(uniqueId);
    },
    [clearToastTimer]
  );

  const addMessage = useCallback(
    (msg) => {
      /* Filtered here rather than at each call site, so the per-race
         `fired` bookkeeping still runs exactly as it does at full
         verbosity — turning the radio down must not change when a
         message would have been re-armed. */
      const level = verbosityRef.current;
      if (level === "off") return;
      if (level === "critical" && !msg.critical) return;

      /* A counter, not a timestamp. `${id}_${Date.now()}` collides
         whenever two messages land in the same millisecond, and
         this id is both a React key and the handle used to cancel
         the toast's dismissal timer — a collision cancels the wrong
         one and leaves a toast on screen for good. */
      const uniqueId = `${msg.id}_${++toastSeqRef.current}`;

      setMessages((prev) => {
        const next = [...prev, { ...msg, uniqueId, timestamp: Date.now() }];
        // Drop the oldest toast — and its pending timer, which the
        // previous implementation leaked.
        while (next.length > MAX_TOASTS) {
          const dropped = next.shift();
          clearToastTimer(dropped.uniqueId);
        }
        return next;
      });

      timersRef.current.set(
        uniqueId,
        setTimeout(() => {
          setMessages((prev) => prev.filter((m) => m.uniqueId !== uniqueId));
          timersRef.current.delete(uniqueId);
        }, TOAST_DURATION)
      );
    },
    [clearToastTimer]
  );

  /** Re-arm a one-shot message after a cooldown. */
  const rearm = useCallback((key, delay) => {
    const id = setTimeout(() => {
      stateRef.current.fired.delete(key);
      cooldownsRef.current.delete(id);
    }, delay);
    cooldownsRef.current.add(id);
  }, []);

  /* ── Public reporting API ─────────────────────────────────── */

  /** Clear all comms and per-race tracking. Call when a race restarts. */
  const reset = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
    cooldownsRef.current.forEach((t) => clearTimeout(t));
    cooldownsRef.current.clear();
    stateRef.current = freshState();
    setMessages([]);
  }, []);

  const reportStart = useCallback(() => {
    const s = stateRef.current;
    if (s.fired.has("good_start")) return;
    s.fired.add("good_start");
    addMessage(MESSAGES.GOOD_START);
  }, [addMessage]);

  const reportFinish = useCallback(() => {
    const s = stateRef.current;
    if (s.fired.has("chequered")) return;
    s.fired.add("chequered");
    s.finished = true;
    addMessage(MESSAGES.CHEQUERED_FLAG);
  }, [addMessage]);

  /**
   * Feed a telemetry sample in.
   * @param {{wpm:number, accuracy:number, correctKeystrokes:number, incorrectKeystrokes:number}} sample
   */
  const reportStats = useCallback(
    ({ wpm = 0, accuracy = 100, correctKeystrokes = 0, incorrectKeystrokes = 0 }) => {
      const s = stateRef.current;
      if (s.finished) return;

      /* ── Streak: only *correct* keystrokes extend it ───────
         The old version counted any forward index movement, so
         mistakes (which also advance the caret) grew the streak. */
      if (incorrectKeystrokes > s.lastIncorrect) {
        s.streak = 0;
      } else if (correctKeystrokes > s.lastCorrect) {
        s.streak += correctKeystrokes - s.lastCorrect;
      }
      s.lastCorrect = correctKeystrokes;
      s.lastIncorrect = incorrectKeystrokes;

      if (s.streak >= PURPLE_STREAK && !s.fired.has("purple")) {
        s.fired.add("purple");
        s.streak = 0;
        addMessage(MESSAGES.PURPLE_SECTOR);
        rearm("purple", PURPLE_COOLDOWN);
      }

      /* ── WPM: DRS + pace drop ──────────────────────────── */
      if (wpm > s.peakWpm) s.peakWpm = wpm;

      if (wpm >= 100 && !s.fired.has("drs")) {
        s.fired.add("drs");
        addMessage(MESSAGES.DRS_ENABLED);
      }

      if (s.peakWpm > 40 && wpm < s.peakWpm - 20 && !s.fired.has("pace_drop")) {
        s.fired.add("pace_drop");
        addMessage(MESSAGES.PACE_DROP);
        rearm("pace_drop", PACE_DROP_COOLDOWN);
      }

      /* ── Accuracy: crossing below 95% ──────────────────── */
      if (s.lastAccuracy >= 95 && accuracy < 95 && !s.fired.has("accuracy")) {
        s.fired.add("accuracy");
        addMessage(MESSAGES.ACCURACY_DROP);
        rearm("accuracy", ACCURACY_COOLDOWN);
      }
      s.lastAccuracy = accuracy;
    },
    [addMessage, rearm]
  );

  /* ── Cancel every pending timer on unmount ────────────────── */
  useEffect(() => {
    const toasts = timersRef.current;
    const cooldowns = cooldownsRef.current;
    return () => {
      toasts.forEach((t) => clearTimeout(t));
      toasts.clear();
      cooldowns.forEach((t) => clearTimeout(t));
      cooldowns.clear();
    };
  }, []);

  return {
    messages,
    dismissMessage,
    reset,
    reportStart,
    reportStats,
    reportFinish,
  };
}
