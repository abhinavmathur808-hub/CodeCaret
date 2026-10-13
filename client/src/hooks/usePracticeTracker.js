import { useCallback, useEffect, useRef, useState } from "react";

/* ══════════════════════════════════════════════════════════════
   usePracticeTracker — daily "active practice" clock.

   Counts ONLY the time a race is actually running. Menus, the
   settings modal, the results screen and idle time on the
   formation lap are all excluded, because the caller decides what
   "racing" means and the timer exists only while that is true.

   Progress is stored per-day under `practice_stats` and resets on
   the first tick of a new local day.
   ══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "practice_stats";
const GOAL_KEY = "practice_goal_ms";

const TICK_MS = 1000;

/* A tick credits real elapsed wall-clock time rather than a flat
   TICK_MS, because browsers throttle timers in background tabs and a
   fixed increment would quietly under-count. The credit is capped at
   two ticks so the opposite failure — a tab hidden for ten minutes
   mid-race dumping ten minutes of "practice" in on the next tick —
   can't happen either. Neither case is real typing time. */
const MAX_TICK_CREDIT_MS = TICK_MS * 2;

export const DEFAULT_GOAL_MS = 15 * 60 * 1000;

/** Options offered by the settings UI. */
export const GOAL_OPTIONS = [
  { label: "5m", ms: 5 * 60 * 1000 },
  { label: "15m", ms: 15 * 60 * 1000 },
  { label: "30m", ms: 30 * 60 * 1000 },
  { label: "60m", ms: 60 * 60 * 1000 },
];

/* Local calendar date, deliberately not toISOString().slice(0, 10) —
   that is UTC, so anyone west of Greenwich would see their day roll
   over in the middle of the evening. */
function todayKey(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const emptyDay = () => ({ date: todayKey(), accumulatedMs: 0, alarmFired: false });

/** Read today's progress, discarding anything left over from a past day. */
function readStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDay();
    const parsed = JSON.parse(raw);
    if (parsed?.date !== todayKey()) return emptyDay();
    return {
      date: parsed.date,
      accumulatedMs: Number(parsed.accumulatedMs) || 0,
      /* Persisted so a reload after hitting the goal doesn't re-fire
         the alarm on the very next tick. */
      alarmFired: Boolean(parsed.alarmFired),
    };
  } catch {
    // Storage unavailable (private mode, blocked cookies) — run in memory.
    return emptyDay();
  }
}

function readGoal() {
  try {
    const stored = Number(localStorage.getItem(GOAL_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_GOAL_MS;
  } catch {
    return DEFAULT_GOAL_MS;
  }
}

function writeStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Non-fatal: the in-memory count still drives the UI this session.
  }
}

/**
 * @param {boolean} isRacing        True only while a race is under way.
 * @param {{ onGoalReached?: (accumulatedMs: number, goalMs: number) => void }} [options]
 *        onGoalReached fires once per day, the moment the goal is crossed.
 *        The hook stays free of any UI dependency — the caller decides
 *        whether that means a toast, a sound or nothing.
 */
export default function usePracticeTracker(isRacing, options = {}) {
  const { onGoalReached } = options;

  const [stats, setStats] = useState(readStats);
  const [dailyGoalMs, setDailyGoalMs] = useState(readGoal);

  /* The interval reads and writes through refs so it never closes over
     a stale count, and so it doesn't have to be torn down and rebuilt
     every single second as the state changes. */
  const statsRef = useRef(stats);
  const goalRef = useRef(dailyGoalMs);
  const onGoalRef = useRef(onGoalReached);
  const mountedRef = useRef(true);

  useEffect(() => {
    goalRef.current = dailyGoalMs;
  }, [dailyGoalMs]);

  useEffect(() => {
    onGoalRef.current = onGoalReached;
  }, [onGoalReached]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const commit = useCallback((next) => {
    statsRef.current = next;
    writeStats(next);
    if (mountedRef.current) setStats(next);
  }, []);

  /* ── The clock ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!isRacing) return undefined;

    let lastTick = Date.now();

    const credit = () => {
      const now = Date.now();
      const delta = Math.min(now - lastTick, MAX_TICK_CREDIT_MS);
      lastTick = now;
      if (delta <= 0) return;

      const previous = statsRef.current;
      const day = todayKey();
      /* A session running across midnight starts the new day clean,
         alarm re-armed — otherwise the count would keep climbing
         against yesterday's total until the next reload. */
      const base = previous.date === day ? previous : emptyDay();

      const next = {
        date: day,
        accumulatedMs: base.accumulatedMs + delta,
        alarmFired: base.alarmFired,
      };

      if (!next.alarmFired && next.accumulatedMs >= goalRef.current) {
        next.alarmFired = true;
        onGoalRef.current?.(next.accumulatedMs, goalRef.current);
      }

      commit(next);
    };

    const id = setInterval(credit, TICK_MS);
    return () => {
      clearInterval(id);
      /* Bank the part-second since the last tick, so stopping and
         starting races repeatedly doesn't shave time off the total. */
      credit();
    };
  }, [isRacing, commit]);

  /* ── Goal configuration ────────────────────────────────────── */
  const setDailyGoal = useCallback(
    (ms) => {
      const value = Number(ms);
      if (!Number.isFinite(value) || value <= 0) return;

      setDailyGoalMs(value);
      goalRef.current = value;
      try {
        localStorage.setItem(GOAL_KEY, String(value));
      } catch {
        // Non-fatal — the goal just won't survive a reload.
      }

      /* Raising the goal above today's progress re-arms the alarm so
         the new target still announces itself when it is crossed. */
      const current = statsRef.current;
      if (current.alarmFired && current.accumulatedMs < value) {
        commit({ ...current, alarmFired: false });
      }
    },
    [commit]
  );

  const accumulatedMs = stats.accumulatedMs;

  return {
    accumulatedMs,
    dailyGoalMs,
    alarmFired: stats.alarmFired,
    goalReached: accumulatedMs >= dailyGoalMs,
    progress: dailyGoalMs > 0 ? Math.min(accumulatedMs / dailyGoalMs, 1) : 0,
    setDailyGoal,
  };
}

/* "45s", "12m", "1h 05m" — compact enough for a dashboard module.

   Seconds are shown below a minute rather than flooring to "0m": a
   fresh day would otherwise read zero for a full minute of real
   practice, which looks like the tracker is broken. */
export function formatPractice(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}
