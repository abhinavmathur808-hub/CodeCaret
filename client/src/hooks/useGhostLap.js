import { useCallback, useRef, useState } from "react";

/* ══════════════════════════════════════════════════════════════
   useGhostLap — record and replay your personal best on a snippet.

   The ghost is a second caret that re-runs the exact timing of your
   fastest completed lap on this specific snippet, so a solo time
   trial has something to race against.

   ── Storage shape ────────────────────────────────────────────
   localStorage["cc_ghost_data"] = {
     "cpp-s-1": { wpm, savedAt, len, times: [120, 250, 310, …] }
   }

   `times[j]` is the elapsed ms at which the caret PASSED index j —
   so the array is one entry per character and strictly non-
   decreasing. That makes playback a counting problem: the ghost's
   caret position at elapsed E is simply how many entries are <= E.

   Characters the engine auto-advances through (a Tab covering an
   indent run, the whitespace skipped after Enter) all share one
   timestamp. The ghost then jumps them in a single frame, exactly
   as the original run did — which is why this stores a per-index
   array rather than one entry per keypress.

   `len` is stored and checked on load: a ghost recorded against a
   different string would put the caret in meaningless places, and
   silently misplacing it is worse than having no ghost.
   ══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "cc_ghost_data";

/* Ghosts are the only unbounded thing this app writes to storage —
   one entry per snippet character, for every snippet you ever set a
   PB on. Capped and evicted oldest-first so a long-lived profile
   cannot fill the origin's quota. */
const MAX_GHOSTS = 50;

/** Read the whole ghost store. Never throws. */
function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    /* Unavailable (private mode) or corrupt. Either way the feature
       degrades to "no ghost" rather than taking the race down. */
    return {};
  }
}

/** Evict oldest-first until the store is within cap. */
function prune(store, keep = MAX_GHOSTS) {
  const ids = Object.keys(store);
  if (ids.length <= keep) return store;

  ids
    .sort((a, b) => (store[a]?.savedAt || 0) - (store[b]?.savedAt || 0))
    .slice(0, ids.length - keep)
    .forEach((id) => delete store[id]);

  return store;
}

/** Write the store back, shedding old entries if the quota complains. */
function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prune(store)));
    return true;
  } catch {
    /* Almost certainly QuotaExceededError. Drop to half the cap and
       try once more before giving up — losing old ghosts is a much
       better outcome than losing the new personal best. */
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(prune(store, Math.floor(MAX_GHOSTS / 2)))
      );
      return true;
    } catch {
      return false;
    }
  }
}

/* The "nothing was banked" result. Module scope and frozen: a fresh
   object per render would make it a dependency of the commit
   callback, rebuilding it on every render for no reason. */
const NO_COMMIT = Object.freeze({ saved: false, previousWpm: null });

/**
 * The stored lap for a snippet, or an empty record.
 * `times` is null unless there is a usable, length-matched replay.
 */
function loadLap(snippetId, len) {
  if (!snippetId || !(len > 0)) return { times: null, wpm: null };

  const entry = readStore()[snippetId];
  const times = entry?.times;

  return {
    times:
      Array.isArray(times) && times.length === len ? times : null,
    wpm: Number.isFinite(entry?.wpm) ? entry.wpm : null,
  };
}

/**
 * @param {object}  opts
 * @param {string?} opts.snippetId  Catalogue id. Null for custom code,
 *                                  which has no stable identity to key a
 *                                  personal best on.
 * @param {number}  opts.len        Character count of the current snippet.
 * @param {object?} opts.override   Someone else's lap to replay instead
 *                                  of your own best — { times, wpm }.
 *                                  Used only when it fits this text.
 */
export default function useGhostLap({ snippetId, len, override = null }) {
  const lapKey = snippetId ? `${snippetId}:${len}` : null;

  /* The lap being replayed, held in state so render can read it
     without touching a ref.

     Loaded by React's documented "adjust state when a prop changes"
     pattern rather than an effect: the stored lap is a pure function
     of (snippetId, len) and reading it is a synchronous, idempotent
     localStorage get. An effect would mean rendering once with no
     ghost and again with one — the cascading render that pattern
     exists to avoid. Setting state during render of the same
     component re-runs it immediately without committing. */
  const [lap, setLap] = useState(() => loadLap(snippetId, len));
  const [loadedKey, setLoadedKey] = useState(lapKey);

  if (loadedKey !== lapKey) {
    setLoadedKey(lapKey);
    setLap(loadLap(snippetId, len));
  }

  /* The lap actually replayed. Recording and saving your own best are
     unaffected by an override — it only changes whose caret you race. */
  const borrowed =
    Array.isArray(override?.times) && override.times.length === len && len > 0;
  const replay = borrowed ? override : lap;
  const replayKey = lapKey && `${lapKey}:${borrowed ? "borrowed" : "own"}`;

  /* ── Refs: never read during render, only from callbacks ──────
     The recording buffer and the playback cursor both change many
     times per race and must not trigger one render between them.
     ────────────────────────────────────────────────────────────── */
  const recordRef = useRef(null);
  const recordKeyRef = useRef(null);
  const cursorRef = useRef(0);
  const cursorKeyRef = useRef(null);
  const lastElapsedRef = useRef(0);

  /* Recording is keyed separately from replay. A custom snippet has no
     catalogue id, so it can never hold a personal best — but its laps
     still get submitted, and the server verifies every submission
     against this telemetry. Keying the buffer on `lapKey` meant custom
     races recorded nothing and arrived unverifiable. */
  const bufferKey = lapKey ?? `custom:${len}`;

  /** Lazily (re)allocate the recording buffer for the current lap. */
  const buffer = useCallback(() => {
    if (!(len > 0)) return null;
    if (recordKeyRef.current !== bufferKey) {
      recordKeyRef.current = bufferKey;
      recordRef.current = new Array(len).fill(0);
    }
    return recordRef.current;
  }, [bufferKey, len]);

  /**
   * The recorded timings for the portion actually typed.
   *
   * Sliced to `count` because the buffer is allocated for the whole
   * snippet and pre-filled with zeros: a race abandoned or cut short
   * leaves a tail of zeros that would read as thousands of
   * instantaneous keystrokes to anything analysing it.
   */
  const snapshot = useCallback(
    (count) => {
      const times = recordRef.current;
      if (!times) return [];
      const end = Math.max(0, Math.min(count ?? times.length, times.length));
      return times.slice(0, end);
    },
    []
  );

  /**
   * Note forward progress: the caret moved from `from` to `to` at
   * `elapsedMs` after the race clock started.
   *
   * Called on every advance including auto-advanced runs, because the
   * ghost has to reproduce the jump, not just the keypress. Mistakes
   * never reach here in strict mode — the caret does not move on one.
   */
  const recordAdvance = useCallback(
    (from, to, elapsedMs) => {
      const times = buffer();
      if (!times) return;

      /* Integer ms: the extra precision is invisible at 60fps and
         would roughly double what each ghost costs in storage. */
      const t = Math.round(elapsedMs);
      for (let j = from; j < to && j < times.length; j++) times[j] = t;
    },
    [buffer]
  );

  /** Undo a backspace so a corrected mistake leaves no stale time. */
  const rewindRecord = useCallback(
    (to) => {
      const times = buffer();
      if (!times) return;
      for (let j = to; j < times.length; j++) times[j] = 0;
    },
    [buffer]
  );

  /** Put playback back to the start line. */
  const resetPlayback = useCallback(() => {
    cursorRef.current = 0;
    lastElapsedRef.current = 0;
  }, []);

  /**
   * Where the ghost's caret sits at `elapsedMs` — i.e. how many
   * characters it had completed by then.
   *
   * O(1) amortized via a forward-only cursor: walking it across a
   * whole race costs one step per character in total, rather than a
   * scan of the array on every one of the ~60 frames per second this
   * is called at. Seeking backwards (a restart) rewinds and re-walks.
   */
  const indexAt = useCallback(
    (elapsedMs) => {
      const times = replay.times;
      if (!times) return 0;

      /* A different lap means the old cursor is meaningless. */
      if (cursorKeyRef.current !== replayKey) {
        cursorKeyRef.current = replayKey;
        cursorRef.current = 0;
        lastElapsedRef.current = 0;
      }

      if (elapsedMs < lastElapsedRef.current) cursorRef.current = 0;
      lastElapsedRef.current = elapsedMs;

      let i = cursorRef.current;
      while (i < times.length && times[i] <= elapsedMs) i++;
      cursorRef.current = i;
      return i;
    },
    [replay, replayKey]
  );

  /**
   * Persist the lap just finished, if it beat the stored best.
   *
   * `completed` matters: a race cut short by the time limit produces
   * a perfectly real WPM but only a partial set of timings, and
   * saving that would leave a ghost that sprints and then freezes
   * mid-snippet forever. Only a full lap is a lap.
   *
   * @returns {{saved: boolean, previousWpm: number|null}}
   *   `previousWpm` is the record that was beaten, or null when this
   *   was the first clean lap on the snippet. The caller needs the
   *   difference: "you beat your old time by 27 WPM" and "you have
   *   now set a time here" are not the same event, and celebrating
   *   both identically makes the first one feel hollow.
   */
  const commitIfPersonalBest = useCallback(
    ({ wpm, completed }) => {
      const times = buffer();
      if (!snippetId || !times || !completed) return NO_COMMIT;
      if (!Number.isFinite(wpm) || wpm <= 0) return NO_COMMIT;

      const store = readStore();
      const previous = store[snippetId];
      const previousWpm =
        previous && Number.isFinite(previous.wpm) ? previous.wpm : null;

      if (previousWpm !== null && previousWpm >= wpm) return NO_COMMIT;

      const saved = times.slice();
      store[snippetId] = {
        wpm,
        savedAt: Date.now(),
        len: saved.length,
        times: saved,
      };

      if (!writeStore(store)) return NO_COMMIT;

      /* The new best becomes the ghost straight away — synchronously,
         before this returns and therefore before onFinish reaches the
         results screen. By the time the banner renders, storage and
         the in-memory lap already agree, so hitting "retry" races the
         lap you just set rather than the one you beat. */
      resetPlayback();
      cursorKeyRef.current = null;
      setLap({ times: saved, wpm });
      return { saved: true, previousWpm };
    },
    [snippetId, buffer, resetPlayback]
  );

  return {
    hasGhost: Boolean(replay.times),
    /* Whose lap the ghost is: false for your own best. */
    borrowed,
    pbWpm: lap.wpm,
    snapshot,
    recordAdvance,
    rewindRecord,
    indexAt,
    resetPlayback,
    commitIfPersonalBest,
  };
}

/* Exported for tests and for any UI that wants to report or clear
   stored laps without going through the hook. */
export const ghostStore = {
  read: readStore,
  write: writeStore,
  load: loadLap,
  key: STORAGE_KEY,
  max: MAX_GHOSTS,
};
