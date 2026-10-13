import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  lazy,
  Suspense,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { challengeLink, dailyKey, dailyTrack, readDrillLink, readSpecialTrack } from "../utils/specialTracks";
import { recordSymbolStats } from "../utils/lapAnalysis";
import { pickDrillSnippet } from "../utils/symbolDrill";
import Onboarding, { ONBOARDED_KEY } from "./race/Onboarding";
import { Flame } from "lucide-react";
import RaceTrack from "./RaceTrack";
import VirtualKeyboard from "./VirtualKeyboard";
import useRaceEngineer, { DEFAULT_VERBOSITY } from "./useRaceEngineer";
import useTypingSound, { DEFAULT_SOUND_PROFILE, DEFAULT_VOLUME } from "../hooks/useTypingSound";
import usePracticeTracker from "../hooks/usePracticeTracker";
import PracticeGoalAlert from "./PracticeGoalAlert";
import BrandLogo from "./BrandLogo";
import { useAuth } from "../context/useAuth";
import { API_URL } from "../config";
import { applyTheme, getStoredTheme } from "../themes";
import { resetSettings } from "../utils/settingsRegistry";
import { isEditableTarget } from "../utils/typingTarget";
import { readString, readJSON, readNumber } from "../utils/safeStorage";
import { fontStack } from "../fonts";
import "./TestTyping.css";
import LeaderboardModal from "./LeaderboardModal";
import ResultsScreen from "./race/ResultsScreen";
import SettingsModal from "./race/SettingsModal";
import TouchTypingInput from "./race/TouchTypingInput";
import useTrackBoard from "../hooks/useTrackBoard";
import { readThemeAccent } from "./landing/themeAccent";
import {
  PRISM_LANGUAGE,
  CODE_LANGUAGES,
  isWarmup,
  CATALOGUE,
  MAX_WPM_POINTS,
  formatRaceTime,
  readStoredLanguages,
  TOPIC_OPTIONS,
  topicLabelOf,
  poolFor,
  drawSnippet,
} from "../utils/snippetPool";

/* The share dialog and the card renderer behind it only matter after a
   race, so they arrive as their own chunk — fetched while the results
   screen is up (see the prefetch beside shareCard), not with the page. */
const ShareCardDialog = lazy(() => import("./share/ShareCardDialog"));

/**
 * TestTypingSandbox — F1 Telemetry Racing Dashboard.
 * Gamified typing sandbox with steering wheel dashboard, track bar,
 * race engineer radio comms, sector timing, ghost laps and track boards.
 */
export default function TestTypingSandbox() {
  const navigate = useNavigate();
  const {
    user: currentUser,
    token,
    logout,
    applyStats,
    pushSettings,
    /* True until the stored token has been exchanged for the real
       account — which is when its saved settings arrive. Nothing may
       be pushed up before then; see the persist effect below. */
    loading: authLoading,
    handleUnauthorized,
  } = useAuth();
  const keyboardRef = useRef(null);
  const tabHeldRef = useRef(false);
  /* Synchronous latch for "the start sequence has already fired this
     race" — see the keydown handler that starts a race. */
  const raceStartFiredRef = useRef(false);

  /* ── Snippet selection filters ────────────────────────────────
     Declared up here because `prismLanguage` below reads
     `languages[0]`. Left further down they sat in the temporal dead
     zone — harmless while the custom-snippet branch was unreachable,
     and an instant white screen the moment it wasn't.
     ────────────────────────────────────────────────────────────── */
  const [languages, setLanguages] = useState(readStoredLanguages);
  const [codeLength, setCodeLength] = useState(() =>
    readString('cc_codeLength', 'short')
  );
  const [density, setDensity] = useState(() =>
    readString('cc_density', 'any')
  );
  const [topic, setTopic] = useState(() =>
    readString('cc_topic', 'any')
  );

  /* ── DSA snippet override (from settings) ─────────────────────
     Seeded from the persisted settings so the first race matches
     what the settings modal claims is selected.
     ────────────────────────────────────────────────────────────── */
  /* ── A track opened from a link ───────────────────────────────
     A shared lap's challenge, or the track of the day (see
     utils/specialTracks.js). While one is up it IS the race: it takes
     precedence over the drawn snippet and over custom code without
     changing either, so dismissing it gives both back untouched. */
  const [searchParams, setSearchParams] = useSearchParams();
  const [special, setSpecial] = useState(
    () =>
      readSpecialTrack(searchParams) ??
      readDrillLink(searchParams, readStoredLanguages(), readString("cc_codeLength", "short"))
  );

  /* The track drawn from the catalogue. Never null: drawSnippet falls
     back to a real track rather than leaving the page with no code. */
  const [dsaSnippet, setDsaSnippet] = useState(() =>
    special?.snippet ??
    drawSnippet(
      readStoredLanguages(),
      readString("cc_codeLength", "short"),
      readString("cc_density", "any"),
      readString("cc_topic", "any")
    )
  );

  /* ── Custom snippet ───────────────────────────────────────────
     Your own pasted code, which overrides the dataset entirely
     while it is switched on. Kept separate from `dsaSnippet` so
     turning it off restores whatever draw you already had rather
     than forcing a fresh one. */
  const [customSnippet, setCustomSnippet] = useState(
    () => readString("cc_customSnippet", "")
  );
  const [useCustom, setUseCustom] = useState(() => {
    return readJSON("cc_useCustom", false);
  });

  /* Whitespace-only custom text would leave an empty race with no way
     back, so it never counts as active. */
  const customReady = useCustom && !special && customSnippet.trim().length > 0;

  /* English picked: a warm-up, which hides the code-only filters and
     says so on the results screen. */
  const warmupMode = isWarmup(languages);

  /* A phone or tablet: no physical keyboard to listen to, so the code
     area gets a field to type into (race/TouchTypingInput.jsx) and the
     on-screen keyboard picture, which a phone cannot fit, stays off.
     Read once — a device does not change what it is mid-session. */
  const [touchFirst] = useState(
    () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(pointer: coarse)").matches)
  );

  /* How many snippets the current language + topic pair actually has,
     so the picker can say so rather than leaving you to discover an
     empty combination by racing it. */
  const topicCount = useMemo(
    () =>
      CATALOGUE.filter(
        (s) =>
          languages.includes(s.language) &&
          (topic === 'any' || s.topic === topic)
      ).length,
    /* The 'any' case used to return the whole corpus, ignoring the
       language mix entirely — a count that was only ever right by
       accident, because the UI happens to show different copy in
       that branch. Counting the same way in both means the number
       stays true if it is ever surfaced there. */
    [languages, topic]
  );

  /* How many distinct tracks the whole filter set resolves to. When
     this is 1 there is no "next" to give you — the same snippet comes
     back, which looks like a broken button unless the UI says why. */
  const poolSize = useMemo(
    () => poolFor(languages, codeLength, density, topic).length,
    [languages, codeLength, density, topic]
  );


  const activeSnippet = customReady ? customSnippet.trim() : dsaSnippet.code;

  /* Catalogue id of the snippet being raced. Null for custom code,
     which has no shared identity and therefore no shared record. */
  const catalogId = customReady ? null : special?.boardId ?? dsaSnippet?.id ?? null;

  /* ── This track's leaderboard ─────────────────────────────────
     Every catalogue snippet has its own board: the podium of the
     three fastest completed laps (one per racer, ties broken on
     accuracy) plus where you stand on it. Read in three places — the
     record module on the dashboard, the placement line on the results
     screen and the leaderboard modal — from this one fetch, so they
     can never disagree.

     Declared beside `catalogId` rather than down with the race state:
     it is scoped to the snippet, not to a run, and later code reads
     it — putting it further down is the temporal-dead-zone mistake
     this file has made before. */
  const trackBoard = useTrackBoard(catalogId, token);
  /* Pulled out on its own: it is stable, and the race-finish callback
     depends on it — depending on the whole hook result instead would
     rebuild that callback on every render. */
  const { adopt: adoptTrackBoard } = trackBoard;

  /* The track record is simply P1. A failure, an unraced track and a
     custom snippet all leave it null, and the module does not render
     — a scoreboard is not worth an error on a page for typing. */
  const currentRecord = trackBoard.board?.podium?.[0] ?? null;

  /* What the leaderboard modal needs to name the track it is showing.
     A podium is only meaningful if you can tell WHICH track it is
     for, so the title travels with it. */
  const trackInfo =
    catalogId && dsaSnippet
      ? {
          id: catalogId,
          title:
            special?.kind === "daily"
              ? `Track of the day · ${dsaSnippet.title}`
              : dsaSnippet.title || catalogId,
          language: dsaSnippet.language,
          length: dsaSnippet.length,
          topicLabel: topicLabelOf(dsaSnippet),
        }
      : null;

  /* ── Prism language key for RaceTrack ─────────────────────────
     A lookup rather than a ternary: the old
     `language === 'C++' ? 'cpp' : 'python'` treated every
     non-C++ snippet as Python, which would have highlighted the
     JavaScript set with Python's grammar. */
  /* Custom code has no language of its own, so it borrows the first
     one selected in the mix — surfaced in the settings copy, since it
     is the only way to control how your own paste is highlighted. */
  const prismLanguage = customReady
    ? PRISM_LANGUAGE[languages[0]] || 'javascript'
    : dsaSnippet
      ? PRISM_LANGUAGE[dsaSnippet.language] || 'javascript'
      : 'javascript';

  /* ── Live stats (mirrored from RaceTrack internals) ──────── */
  const [elapsed, setElapsed] = useState(0);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(100);
  const [raceStarted, setRaceStarted] = useState(false);
  const [raceFinished, setRaceFinished] = useState(false);
  /** Set when the time limit runs out; tells RaceTrack to finish. */
  const [timeExpired, setTimeExpired] = useState(false);
  const [peakWpm, setPeakWpm] = useState(0);
  /* Outcome of the finished lap against your record on this snippet.
     `previous` is null on a first clean lap — see the note in
     useGhostLap.commitIfPersonalBest for why the two are told apart. */
  const [pbResult, setPbResult] = useState(null);
  /* Set when THIS lap took the record, from the submission response —
     the server decides, because it is the only place that can compare
     against every other account. */
  const [recordResult, setRecordResult] = useState(null);
  /* The lap just finished, character by character, for the lap
     review: the text, when the caret passed each character, and the
     wrong keys pressed on each. */
  const [lapTrace, setLapTrace] = useState(null);
  /* Trophies the server says this lap earned for the first time. */
  const [newTrophies, setNewTrophies] = useState([]);
  /* True between crossing the line and the server saying whether the
     lap took the record.

     The personal best is known instantly; the track record needs a
     round trip. Without this gate the results screen shows the gold
     PB banner and then swaps it for the purple one a few hundred
     milliseconds later — and the celebration audio fires twice, once
     per banner. Holding the announcement until the verdict lands
     means one banner and one sound. */
  const [recordPending, setRecordPending] = useState(false);
  /* Rating change and streak for the lap just finished, straight
     from the submission response. Null until a race is submitted —
     signed-out racers never see either. */
  const [eloResult, setEloResult] = useState(null);
  const [streak, setStreak] = useState(null);
  /* Why the lap did not reach the account, when it did not. Null on
     the ordinary path and for signed-out racers, who have nothing to
     submit to in the first place. */
  const [submitError, setSubmitError] = useState(null);
  /* Whether the finished lap typed the whole snippet. Only those go
     on a track's podium, so the results screen has to know which
     kind of lap it is reporting on. */
  const [lapCompleted, setLapCompleted] = useState(false);
  /* Whether this lap became your best on the track. A board position
     belongs to your BEST lap, so when this one was slower the results
     screen must say where your best stands — not imply this lap
     placed there. Null until the server has answered. */
  const [lapTrackBest, setLapTrackBest] = useState(null);
  /* What the finished lap was made of, from the engine — the counts
     the share card prints — and when it ended, which names the lap. */
  const [lapTally, setLapTally] = useState(null);
  /* The lap the share dialog is open for, by its finish time; null
     while closed. Keyed to the lap rather than a plain flag, so a
     dialog left open can never reappear over the next race's results. */
  const [shareLap, setShareLap] = useState(null);
  const shareButtonRef = useRef(null);

  /* Prefer the figure from the race just submitted over the one
     cached on the profile: the cached user is only refreshed on
     sign-in, so without this the flame would stay a day behind
     until the next page load. */
  const streakDays = streak?.current ?? currentUser?.currentStreak ?? 0;
  const eloRating = eloResult?.rating ?? currentUser?.eloRating ?? 0;
  const startTimeRef = useRef(null);
  const finalElapsedMsRef = useRef(0);
  /** Mirrored into state so the results screen re-renders with it. */
  const [finalElapsedMs, setFinalElapsedMs] = useState(0);

  /* ── WPM history for telemetry graph ─────────────────────── */
  const [wpmHistory, setWpmHistory] = useState([{ time: 0, wpm: 0 }]);
  const liveWpmRef = useRef(0);
  const liveAccuracyRef = useRef(100);

  /* ── Focus tracking ─────────────────────────────────────── */
  const [isFocused, setIsFocused] = useState(true);

  /* ── Settings modal toggle ──────────────────────────────── */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);

  /**
   * Put every setting back to its default, on this device and on the
   * account, then reload.
   *
   * A reload rather than 25 setState calls: the defaults have to
   * reach the theme attribute on <html>, the CSS custom properties on
   * the sandbox root and every piece of seeded state, and remounting
   * from storage is the one path guaranteed to catch all of them.
   */
  const handleResetSettings = useCallback(() => {
    const defaults = resetSettings();
    applyTheme(defaults.cc_theme);
    /* Immediate, not debounced: the reload below would clear a
       pending timer and the account would keep the old settings. */
    pushSettings(defaults, { immediate: true });
    window.location.reload();
  }, [pushSettings]);

  /* Escape closes the modal. Captured on the window so it works
     wherever focus happens to be, and stopPropagation keeps the
     keystroke from reaching the typing surface underneath — pressing
     Esc should not also start or disturb a race. */
  useEffect(() => {
    if (!settingsOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setSettingsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [settingsOpen]);

  /* ── Profile dropdown menu ──────────────────────────────── */
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  /* ── Leaderboard modal ────────────────────────────────── */
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  /* Which tab an opening asks for. The trophy asks for none, so the
     modal reopens on whichever tab you last used; "View podium" and
     the record module ask for the track's board specifically. */
  const [leaderboardRequest, setLeaderboardRequest] = useState(null);
  const openLeaderboard = useCallback((tab = null) => {
    setLeaderboardRequest(tab);
    setIsLeaderboardOpen(true);
  }, []);
  /* Stable, because the modal binds its Escape listener to it. */
  const closeLeaderboard = useCallback(() => setIsLeaderboardOpen(false), []);

  /* ── Does a dialog own the keyboard? ──────────────────────────
     The typing surface is painted text, not an input, so the race
     reads the keyboard from `window`. That means an open dialog
     does NOT take the keys away from it by itself — it has to be
     told.

     Without this, typing in the settings modal was read as racing:
     each key was scored as a mistake, the first one started the
     clock and the daily practice timer, and thirty seconds later
     the race finished itself behind the dialog and posted a 0 WPM
     lap. The custom-snippet box was unusable for the same reason —
     its keystrokes were swallowed before the textarea saw them.

     The goal alert is deliberately NOT in here: it fires mid-race
     by design, and pausing the race to announce that you have been
     practising would interrupt the very thing it is reporting on.
     ────────────────────────────────────────────────────────────── */
  /* ── First visit ──────────────────────────────────────────────
     The tips card shows once; dismissing it remembers that. A link
     straight to a challenge or the daily skips it, since the visitor
     came to race something specific. */
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    if (readString(ONBOARDED_KEY, "") === "1") return false;
    const params = new URLSearchParams(window.location.search);
    return !params.get("track") && !params.get("drill");
  });
  const closeOnboarding = useCallback(() => {
    setOnboardingOpen(false);
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // Storage blocked: it shows again next visit, which is harmless.
    }
  }, []);

  const overlayOpen = settingsOpen || isLeaderboardOpen || onboardingOpen;

  /* ── Race configuration state (persisted in localStorage) ────
     `languages`, `density`, `topic` and `codeLength` all live higher
     up, next to the snippet pool that reads them. */


  /* ── Configurable race time limit (seconds) ─────────────── */
  const [timeLimit, setTimeLimit] = useState(() => {
    /* Bounded, not just parsed. An unvalidated Number() here let a
       blank or corrupt key become NaN, which reads as "no limit" on
       both sides and silently turns a timed race into an endless one. */
    return readNumber('cc_timeLimit', 30, { min: 0, max: 3 * 60 * 60 });
  });

  /* ── Virtual keyboard visibility ────────────────────────── */
  const [showKeyboard, setShowKeyboard] = useState(() => {
    return readJSON('cc_showKeyboard', true);
  });

  /* ── Caret style: 'thin' | 'thick' | 'caret-only' ────────── */
  const [caretStyle, setCaretStyle] = useState(() =>
    readString('cc_caretStyle', 'thin')
  );

  /* ── Freedom Mode (full backspace) ─────────────────────── */
  const [freedomMode, setFreedomMode] = useState(() => {
    return readJSON('cc_freedomMode', false);
  });

  /* ── Strict Mode (block the caret on a mistake) ────────── */
  const [strictMode, setStrictMode] = useState(() => {
    return readJSON('cc_strictMode', false);
  });

  /* ── Indentation: auto-skip after Enter, or type it yourself ── */
  const [autoIndent, setAutoIndent] = useState(() => {
    return readJSON('cc_autoIndent', true);
  });

  /* ── Display & focus ──────────────────────────────────────
     Every one of these defaults to the behaviour the app already
     had, so nobody is opted into a different typing experience
     without choosing it. */
  const [zenMode, setZenMode] = useState(() => {
    return readJSON('cc_zenMode', false);
  });
  const [hideLiveWpm, setHideLiveWpm] = useState(() => {
    return readJSON('cc_hideLiveWpm', false);
  });
  const [blindMode, setBlindMode] = useState(() => {
    return readJSON('cc_blindMode', false);
  });
  const [highlightMode, setHighlightMode] = useState(() =>
    readString('cc_highlightMode', 'character')
  );
  const [caretBlink, setCaretBlink] = useState(() => {
    return readJSON('cc_caretBlink', true);
  });
  const [smoothCaret, setSmoothCaret] = useState(() => {
    return readJSON('cc_smoothCaret', true);
  });
  const [ghostCaret, setGhostCaret] = useState(() => {
    return readJSON('cc_ghostCaret', true);
  });
  /* Whose lap the ghost replays: your own best ("mine") or the
     fastest lap on the track's board ("record"). */
  const [ghostSource, setGhostSource] = useState(() =>
    readString('cc_ghostSource', 'mine') === 'record' ? 'record' : 'mine'
  );

  /* Masks apply only while a race is actually under way — the point
     is to stop you watching the number mid-run, not to withhold your
     result. Both clear the instant the race ends. Declared here
     rather than higher up because they read race state that is
     itself declared above; moving them earlier would put those
     reads in the temporal dead zone. */
  const hideWpmNow = hideLiveWpm && raceStarted && !raceFinished;
  const hideAccuracyNow = blindMode && raceStarted && !raceFinished;

  /* ── Code area typography ──────────────────────────────── */
  const [fontSize, setFontSize] = useState(() =>
    readString('cc_fontSize', '2rem')
  );
  const [lineHeight, setLineHeight] = useState(() =>
    readString('cc_lineHeight', '1.8')
  );

  /* ── Audio ─────────────────────────────────────────────── */
  const [soundProfile, setSoundProfile] = useState(() =>
    readString('cc_soundProfile', DEFAULT_SOUND_PROFILE)
  );
  const [soundVolume, setSoundVolume] = useState(() => {
    /* `min: 0`, not `> 0`. The old test discarded a saved volume of
       exactly zero as if it were missing, so muting the app never
       survived a reload — it came back at the default every time. */
    return readNumber('cc_soundVolume', DEFAULT_VOLUME, { min: 0, max: 1 });
  });

  /* ── Race engineer radio verbosity ─────────────────────── */
  const [engineerVerbosity, setEngineerVerbosity] = useState(() =>
    readString('cc_engineerVerbosity', DEFAULT_VERBOSITY)
  );

  /* ── Global font selection ─────────────────────────────── */
  const [globalFont, setGlobalFont] = useState(() =>
    readString('cc_globalFont', 'Default')
  );

  /* ── Colour theme ───────────────────────────────────────────
     applyTheme owns both the data-theme attribute and its
     persistence, so this state is just for highlighting the
     active swatch. */
  const [theme, setTheme] = useState(getStoredTheme);

  const handleThemeChange = useCallback((id) => {
    setTheme(applyTheme(id));
  }, []);

  /* ── Click-outside to close profile dropdown ────────────── */
  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  /* ── Log out handler ────────────────────────────────────── */
  const handleLogout = () => {
    logout();
    setIsProfileMenuOpen(false);
  };

  /* ── Daily active-practice tracker ────────────────────────────
     `raceStarted && !raceFinished` is the whole point: the clock
     runs only while a race is actually under way, so time spent in
     the settings modal, on the results screen or sitting on the
     formation lap never counts towards the goal.

     The running total is deliberately NOT on the dashboard — a
     clock ticking in your peripheral vision is the opposite of what
     a typing test wants. It lives in Settings next to the control
     that sets it, and only surfaces unprompted when the goal is
     actually met.

     Declared above the persist effect rather than down with the
     race handlers, because the effect lists `practiceGoalMs` as a
     dependency — reading it from further down the component would
     put it in the temporal dead zone and throw on first render.
     ────────────────────────────────────────────────────────────── */
  const [goalAlertOpen, setGoalAlertOpen] = useState(false);

  const handlePracticeGoal = useCallback(() => setGoalAlertOpen(true), []);
  const dismissGoalAlert = useCallback(() => setGoalAlertOpen(false), []);

  const {
    accumulatedMs: practiceMs,
    dailyGoalMs: practiceGoalMs,
    goalReached: practiceGoalReached,
    progress: practiceProgress,
    setDailyGoal: setPracticeGoal,
  } = usePracticeTracker(raceStarted && !raceFinished, {
    onGoalReached: handlePracticeGoal,
  });

  /* ── Persist all settings to localStorage ───────────────── */
  useEffect(() => {
    /* Wrapped as a block: these run in a private window too, where
       setItem throws. One throw used to abort the rest of the effect
       — including the account push below it — so a browser that
       refuses local storage also stopped settings syncing to the
       server, which is the one place they could still have been
       kept. */
    try {
    localStorage.setItem('cc_languages', JSON.stringify(languages));
    localStorage.setItem('cc_codeLength', codeLength);
    localStorage.setItem('cc_density', density);
    localStorage.setItem('cc_topic', topic);
    localStorage.setItem('cc_customSnippet', customSnippet);
    localStorage.setItem('cc_useCustom', JSON.stringify(useCustom));
    localStorage.setItem('cc_timeLimit', String(timeLimit));
    localStorage.setItem('cc_showKeyboard', JSON.stringify(showKeyboard));
    localStorage.setItem('cc_caretStyle', caretStyle);
    localStorage.setItem('cc_freedomMode', JSON.stringify(freedomMode));
    localStorage.setItem('cc_globalFont', globalFont);
    localStorage.setItem('cc_strictMode', JSON.stringify(strictMode));
    localStorage.setItem('cc_autoIndent', JSON.stringify(autoIndent));
    localStorage.setItem('cc_fontSize', fontSize);
    localStorage.setItem('cc_lineHeight', lineHeight);
    localStorage.setItem('cc_soundProfile', soundProfile);
    localStorage.setItem('cc_soundVolume', String(soundVolume));
    localStorage.setItem('cc_engineerVerbosity', engineerVerbosity);
    localStorage.setItem('cc_zenMode', JSON.stringify(zenMode));
    localStorage.setItem('cc_hideLiveWpm', JSON.stringify(hideLiveWpm));
    localStorage.setItem('cc_blindMode', JSON.stringify(blindMode));
    localStorage.setItem('cc_highlightMode', highlightMode);
    localStorage.setItem('cc_caretBlink', JSON.stringify(caretBlink));
    localStorage.setItem('cc_smoothCaret', JSON.stringify(smoothCaret));
    localStorage.setItem('cc_ghostCaret', JSON.stringify(ghostCaret));
    localStorage.setItem('cc_ghostSource', ghostSource);
    } catch {
      /* Storage unavailable or full — this session keeps its
         settings in React state regardless, and the push below
         still carries them to the account. */
    }

    /* Mirror the whole blob up to the account (debounced inside), so
       these choices follow you to another device. Reads back out of
       localStorage rather than from this scope so it can never
       disagree with what was just written.

       Held until the account has answered. This effect also runs on
       mount, and on mount the only settings that exist are whatever
       this device happens to hold — so pushing then uploaded local
       defaults over the settings the account already had. The 1200ms
       debounce hid it on a fast connection and nothing else did: a
       sign-in slower than that silently reset your theme, font and
       filters everywhere.

       Nothing is lost by waiting. `authLoading` is a dependency, so
       the push fires as soon as it clears, and pushSettings reads
       the whole blob out of localStorage at send time rather than
       from this scope. */
    if (!authLoading) pushSettings();
  }, [
    /* ── Two settings are listed but not written above ───────────
       `cc_theme` and `practice_goal_ms` are in the registry like
       every other preference, but their keys are owned elsewhere:
       applyTheme() writes one, usePracticeTracker writes the other,
       and both do it synchronously before the state that mirrors
       them changes.

       So this effect has nothing to write for them — it only has to
       NOTICE them, which is what earns them a place in this array.
       Without that it never re-ran when they changed, no push went
       out, and neither your theme nor your daily goal ever reached
       the account: they tagged along by accident the next time some
       unrelated setting happened to change, and until then a second
       device kept showing the old one.

       Safe because pushSettings() re-reads the whole blob out of
       localStorage at send time rather than from this scope, so the
       values it ships are the ones their owners already wrote. */
    theme,
    practiceGoalMs,

    languages,
    density,
    topic,
    customSnippet,
    useCustom,
    codeLength,
    timeLimit,
    showKeyboard,
    caretStyle,
    freedomMode,
    globalFont,
    strictMode,
    autoIndent,
    fontSize,
    lineHeight,
    soundProfile,
    soundVolume,
    engineerVerbosity,
    zenMode,
    hideLiveWpm,
    blindMode,
    highlightMode,
    caretBlink,
    smoothCaret,
    ghostCaret,
    ghostSource,
    pushSettings,
    authLoading,
  ]);

  /* ── The record holder's ghost ───────────────────────────────
     Fetched per track while the ghost is set to race the record, and
     kept until the track changes. Null times mean the board has no
     lap with timings yet — the ghost then falls back to your own
     best, if you have one. */
  const [recordGhost, setRecordGhost] = useState(null);
  useEffect(() => {
    if (!ghostCaret || ghostSource !== 'record' || !catalogId) return undefined;
    if (recordGhost?.boardId === catalogId) return undefined;
    const ctrl = new AbortController();
    fetch(`${API_URL}/api/snippets/${encodeURIComponent(catalogId)}/ghost`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRecordGhost({ boardId: catalogId, ...(d?.ghost ?? { times: null }) }))
      .catch(() => {});
    return () => ctrl.abort();
  }, [ghostCaret, ghostSource, catalogId, recordGhost]);
  const ghostLap =
    ghostSource === 'record' && recordGhost?.boardId === catalogId && recordGhost.times
      ? recordGhost
      : null;


  /* ── RaceTrack remount key (bump to restart) ────────────── */
  const [raceKey, setRaceKey] = useState(0);

  /* ── Sector Timing State ────────────────────────────────── */
  const snippetLen = activeSnippet.trim().length;
  const sector1End = Math.floor(snippetLen / 3);
  const sector2End = Math.floor((snippetLen * 2) / 3);

  const [currentSector, setCurrentSector] = useState(1);
  const [sectorTimes, setSectorTimes] = useState({
    s1: null,
    s2: null,
    s3: null,
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const sectorStartRef = useRef(null);

  /* ── Race Engineer radio messages ──────────────────────────────
     Single comms system. There were previously two overlapping ones
     rendering at once, and the milestone variant could never speak:
     each observer set its own "already fired" flag immediately
     before calling the trigger, which then bailed on that same flag.
     ────────────────────────────────────────────────────────────── */
  const {
    messages: radioMessages,
    dismissMessage,
    reset: resetEngineer,
    reportStart: engineerStart,
    reportStats: engineerStats,
    reportFinish: engineerFinish,
  } = useRaceEngineer(engineerVerbosity);

  /* ── Audio ────────────────────────────────────────────────
     The returned voices are stable, so handing `click` straight to
     RaceTrack doesn't re-bind its keydown listener. */
  const sound = useTypingSound({
    profile: soundProfile,
    volume: soundVolume,
  });

  /* ── Celebration ──────────────────────────────────────────────
     One value drives both the banner and the sound, so they cannot
     disagree about what just happened or when.

     A track record outranks and replaces a personal best: taking the
     fastest lap on the board necessarily beat your own, and
     announcing both would be reporting one lap twice while burying
     the bigger half. `recordPending` holds everything until the
     server has ruled — see the note on that state.

     A first completion is NOT a celebration. The ghost still records
     it and it still becomes the time to beat, silently — but there
     was no record to break, so there is nothing to announce.
     `previous > 0` is the test rather than `isBest`, because
     `isBest` is also true the first time a snippet is finished; it
     is null-safe, since null > 0 is false. */
  const beatAnEarlierBest =
    Boolean(pbResult?.isBest) && pbResult.previous > 0;

  const celebration = recordResult?.isRecord
    ? "record"
    : beatAnEarlierBest && !recordPending
      ? "pb"
      : null;

  /* Fire on the transition into a celebration, not on every render
     that has one — otherwise any unrelated re-render while the
     results screen is up replays the fanfare. The effect commits in
     the same paint as the banner mounts, so the audio lands with the
     start of the CSS animation rather than after it. */
  const celebratedRef = useRef(null);
  useEffect(() => {
    if (celebration && celebratedRef.current !== celebration) {
      celebratedRef.current = celebration;
      sound.playCelebration(celebration);
    } else if (!celebration) {
      celebratedRef.current = null;
    }
  }, [celebration, sound]);

  /* ── The share card ───────────────────────────────────────────
     The finished lap as plain data for share/raceCard.js: the same
     numbers and the same verdicts as the results screen, so a card
     never claims what the screen does not. The podium line is only
     carried for a lap that IS your best there — a board position
     belongs to your best lap, and printing it beside this lap's
     slower numbers would misstate both. */
  const shareCard = useMemo(() => {
    if (!raceFinished || !lapTally) return null;

    const you = trackBoard.board?.you ?? null;
    let achievement = null;
    if (celebration === "record") {
      achievement = { kind: "record" };
    } else if (celebration === "pb") {
      achievement = {
        kind: "pb",
        delta: Math.max(1, pbResult.wpm - pbResult.previous),
        previous: pbResult.previous,
      };
    } else if (catalogId && lapCompleted && lapTrackBest === true && you && !recordPending && !submitError) {
      achievement = { kind: "podium", position: you.position };
    }

    const listed = catalogId && dsaSnippet ? dsaSnippet : null;
    const track = listed
      ? {
          title: listed.title || catalogId,
          language: listed.language,
          topic: topicLabelOf(listed),
          length: listed.length ? `${listed.length[0].toUpperCase()}${listed.length.slice(1)} track` : null,
        }
      : {
          title: customReady ? "Custom code" : "Practice lap",
          language: customReady ? languages[0] : "JavaScript",
          custom: customReady,
        };

    return {
      wpm: liveWpm,
      accuracy: liveAccuracy,
      timeMs: Math.round(finalElapsedMs),
      timeLabel: formatRaceTime(finalElapsedMs),
      /* The live peak is capped at 250 to ignore the first second's
         spikes; the average is not, so a peak can never read below it. */
      peakWpm: Math.max(peakWpm, liveWpm),
      characters: lapTally.correct,
      rating: eloResult?.rated ? { delta: eloResult.delta, value: eloResult.rating } : null,
      sectors: [sectorTimes.s1, sectorTimes.s2, sectorTimes.s3],
      trace: wpmHistory,
      track,
      achievement,
      driver: currentUser?.username ?? null,
      date: new Date(lapTally.at),
      link: {
        href: catalogId
          ? challengeLink(window.location.origin, catalogId, liveWpm, currentUser?.username)
          : `${window.location.origin}/test`,
        label: `${window.location.host}/test`,
      },
      accent: readThemeAccent(),
    };
  }, [
    raceFinished,
    lapTally,
    trackBoard.board,
    celebration,
    pbResult,
    catalogId,
    dsaSnippet,
    lapCompleted,
    lapTrackBest,
    recordPending,
    submitError,
    customReady,
    languages,
    liveWpm,
    liveAccuracy,
    finalElapsedMs,
    peakWpm,
    eloResult,
    sectorTimes,
    wpmHistory,
    currentUser,
  ]);

  const shareOpen = Boolean(shareCard) && shareLap === lapTally?.at;

  /* Fetch the dialog's code and warm the card's fonts and logo while
     the results are being read, so "Share screenshot" opens at once. */
  useEffect(() => {
    if (!raceFinished) return undefined;
    const id = setTimeout(() => {
      import("./share/raceCard").then((m) => m.loadCardAssets()).catch(() => {});
      import("./share/ShareCardDialog").catch(() => {});
    }, 1200);
    return () => clearTimeout(id);
  }, [raceFinished]);

  const closeShare = useCallback(() => {
    setShareLap(null);
    shareButtonRef.current?.focus();
  }, []);

  /* Stable, so handing it to RaceTrack doesn't re-bind its keydown
     listener. The key is forwarded so the big stabilised keys — space,
     Enter, Backspace — can voice deeper than the alphas. */
  /* Blind mode withholds the verdict, and the error sound is by design
     "unlike any of the switch profiles, so a mistake registers without
     looking" — i.e. it announces exactly what blind mode is hiding.
     Suppressing the visual tell but not the audible one would leave
     blind mode defeated for anyone with sound on, so mistakes get the
     ordinary keypress here and surface with everything else at the end. */
  const handleKeystrokeSound = useCallback(
    (isCorrect, key) => sound.click(isCorrect || blindMode, { key }),
    [sound, blindMode]
  );

  /* ── Restart handler ────────────────────────────────────── */
  const restartRace = useCallback(() => {
    setRaceKey((k) => k + 1);
    setElapsed(0);
    setLiveWpm(0);
    setLiveAccuracy(100);
    setRaceStarted(false);
    setRaceFinished(false);
    setTimeExpired(false);
    setPeakWpm(0);
    setPbResult(null);
    setRecordResult(null);
    setLapTrace(null);
    setNewTrophies([]);
    setRecordPending(false);
    setEloResult(null);
    setSubmitError(null);
    setLapCompleted(false);
    setLapTrackBest(null);
    startTimeRef.current = null;
    sectorStartRef.current = null;
    raceStartFiredRef.current = false;
    setCurrentSector(1);
    setSectorTimes({ s1: null, s2: null, s3: null });
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    liveWpmRef.current = 0;
    liveAccuracyRef.current = 100;
    finalElapsedMsRef.current = 0;
    setFinalElapsedMs(0);
    setWpmHistory([{ time: 0, wpm: 0 }]);
    resetEngineer();
  }, [resetEngineer]);

  /* Leaving a linked track — dismissing it, drawing another, changing
     the setup — also takes it out of the address bar, so a refresh
     does not bring it back. */
  const endSpecial = useCallback(() => {
    setSpecial(null);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  /* The track of the day: today's board, and a link to it in the
     address bar, so it can be shared straight from there. */
  const startDaily = useCallback(() => {
    const today = dailyTrack(dailyKey());
    setSpecial(today);
    setDsaSnippet(today.snippet);
    setSearchParams({ track: today.boardId }, { replace: true });
    restartRace();
  }, [setSearchParams, restartRace]);

  /* ── Race configuration changes ───────────────────────────────
     Handled where the change originates rather than in effects
     watching the values: picking a random snippet is a side effect,
     and resetting a dozen pieces of state from an effect body
     triggers a cascading re-render on every settings tweak.
     ────────────────────────────────────────────────────────────── */
  const applyRaceConfig = useCallback(
    ({
      languages: nextLanguages,
      codeLength: nextLength,
      timeLimit: nextLimit,
      density: nextDensity,
      topic: nextTopic,
    }) => {
      const langs = nextLanguages ?? languages;
      const len = nextLength ?? codeLength;
      const dens = nextDensity ?? density;
      const top = nextTopic ?? topic;

      if (nextLanguages !== undefined) setLanguages(nextLanguages);
      if (nextLength !== undefined) setCodeLength(nextLength);
      if (nextLimit !== undefined) setTimeLimit(nextLimit);
      if (nextDensity !== undefined) setDensity(nextDensity);
      if (nextTopic !== undefined) setTopic(nextTopic);

      /* Anything that changes which snippets are eligible redraws, so
         the change is audible immediately rather than at the end of
         whatever race happens to be loaded. */
      if (
        nextLanguages !== undefined ||
        nextLength !== undefined ||
        nextDensity !== undefined ||
        nextTopic !== undefined
      ) {
        if (special) endSpecial();
        setDsaSnippet(drawSnippet(langs, len, dens, top));
      }
      restartRace();
    },
    [languages, codeLength, density, topic, restartRace, special, endSpecial]
  );

  /* ── Window focus / blur listeners ─────────────────────── */
  useEffect(() => {
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  /* ── Live stats, reported by RaceTrack ─────────────────────────
     This used to poll RaceTrack's rendered DOM every 150ms using
     Tailwind class selectors, so any restyle silently zeroed the
     dashboard, peak WPM, the telemetry graph and the stats we POST.
     ────────────────────────────────────────────────────────────── */
  const handleStats = useCallback(
    (s) => {
      setLiveWpm(s.wpm);
      liveWpmRef.current = s.wpm;

      setLiveAccuracy(s.accuracy);
      liveAccuracyRef.current = s.accuracy;

      // Only update peak WPM after a warm-up period to avoid
      // instantaneous stroke-to-stroke spikes (e.g. 300+ WPM).
      // Require ≥3s elapsed AND ≥10 chars typed, cap at 250.
      const elapsedMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      if (elapsedMs >= 3000 && currentIndexRef.current >= 10 && s.wpm <= 250) {
        setPeakWpm((prev) => Math.max(prev, s.wpm));
      }

      engineerStats(s);
    },
    [engineerStats]
  );

  /* ── Detect first keypress to start the timer ───────────── */
  useEffect(() => {
    const handleKey = (e) => {
      /* Ahead of the Tab preventDefault below, not after it: a key
         meant for a dialog or a form field must reach it with its
         default behaviour intact, Tab included — that is what lets
         Tab indent the custom-snippet box and move focus inside the
         settings modal. */
      if (overlayOpen || isEditableTarget(e.target)) return;
      /* Once the lap is over, Tab belongs to the browser again: the
         results screen has buttons, and swallowing Tab here left
         them — and everything else on the page — unreachable by
         keyboard. Only a live race needs to hold onto it, and only
         so focus does not jump out of the typing surface. */
      if (raceFinished) return;
      // Prevent Tab from shifting focus away from the typing input
      if (e.key === "Tab") e.preventDefault();
      if (e.key.length === 1 || e.key === "Enter" || e.key === "Tab") {
        if (!raceStarted) {
          /* Guarded on a ref, not on `raceStarted`: setState doesn't
             land until the next render, so two keystrokes inside one
             React batch would both see the old `false` and fire the
             start sequence twice. A fast typist can absolutely land
             two keys inside 16ms. */
          if (raceStartFiredRef.current) return;
          raceStartFiredRef.current = true;

          setRaceStarted(true);
          const now = Date.now();
          startTimeRef.current = now;
          sectorStartRef.current = now;
          engineerStart();
          sound.lightsOut();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [raceStarted, raceFinished, engineerStart, sound, overlayOpen]);

  /* ── Tab + Enter quick-restart shortcut ───────────────────── */
  useEffect(() => {
    const onKeyDown = (e) => {
      /* Same rule as the start handler: a dialog or a field owns its
         own Tab. Arming the latch from a Tab typed into the custom
         snippet box meant the next Enter restarted the race instead
         of inserting a newline. */
      if (overlayOpen || isEditableTarget(e.target)) return;
      /* Not on the results screen. The shortcut is for restarting
         mid-lap; once the lap is over there are real buttons on
         screen, and holding Tab down to reach them would both move
         focus and arm a restart that the next Enter fires instead
         of pressing the button under the cursor. Keyboard users get
         Tab back the moment the race ends. */
      if (raceFinished) return;
      if (e.key === "Tab") {
        e.preventDefault();
        tabHeldRef.current = true;
      }
      if (e.key === "Enter" && tabHeldRef.current) {
        e.preventDefault();
        e.stopPropagation();
        tabHeldRef.current = false;
        restartRace();
      }
    };
    const onKeyUp = (e) => {
      if (e.key === "Tab") {
        tabHeldRef.current = false;
      }
    };
    /* A Tab released while the window is blurred never fires keyup,
       which left the latch armed: alt-tab away mid-Tab, come back,
       press Enter, and the race restarted out of nowhere. */
    const releaseTab = () => {
      tabHeldRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseTab);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseTab);
    };
  }, [restartRace, overlayOpen, raceFinished]);

  /* ── Elapsed time ticker ──────────────────────────────────────
     On timeout we flip `timeExpired`, which makes RaceTrack run its
     normal finish path and hand back real final stats. It used to
     synthesize them here from a stale `liveAccuracy` captured at
     race start (so timed-out races always reported 100% accuracy)
     and from the caret index, which counts mistakes as correct.
     ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!raceStarted || raceFinished) return;
    const id = setInterval(() => {
      if (!startTimeRef.current) return;

      const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(elapsedSec);

      // Auto-finish when time limit is reached (skip if no limit / zen mode)
      if (timeLimit > 0 && elapsedSec >= timeLimit) {
        clearInterval(id);
        finalElapsedMsRef.current = Date.now() - startTimeRef.current;
        setTimeExpired(true);
      }
    }, 200);
    return () => clearInterval(id);
  }, [raceStarted, raceFinished, timeLimit]);

  /* ── Record WPM history every second for telemetry graph ── */
  useEffect(() => {
    if (!raceStarted || raceFinished) return;
    const id = setInterval(() => {
      if (!startTimeRef.current) return;
      const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const currentWpm = liveWpmRef.current;
      setWpmHistory((prev) => {
        // Only push if this second hasn't been recorded yet
        if (prev.length === 0 || prev[prev.length - 1].time < sec) {
          const next = [...prev, { time: sec, wpm: currentWpm }];
          /* Capped. With no time limit this grows by one point per
             second for as long as someone types — three hours of
             zen mode is ten thousand points fed into the chart.
             Dropping the oldest keeps the recent shape, which is
             the part of a telemetry trace anyone reads. */
          return next.length > MAX_WPM_POINTS
            ? next.slice(next.length - MAX_WPM_POINTS)
            : next;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [raceStarted, raceFinished]);

  /* ── Sector crossing logic (called by RaceTrack onProgress) ── */
  const handleProgress = useCallback(
    (idx) => {
      setCurrentIndex(idx);
      currentIndexRef.current = idx;

      if (!sectorStartRef.current || raceFinished) return;

      const now = Date.now();
      const sectorElapsed = ((now - sectorStartRef.current) / 1000).toFixed(2);

      if (currentSector === 1 && idx >= sector1End) {
        setSectorTimes((prev) => ({ ...prev, s1: parseFloat(sectorElapsed) }));
        setCurrentSector(2);
        sectorStartRef.current = now;
      } else if (currentSector === 2 && idx >= sector2End) {
        setSectorTimes((prev) => ({ ...prev, s2: parseFloat(sectorElapsed) }));
        setCurrentSector(3);
        sectorStartRef.current = now;
      }
    },
    [currentSector, sector1End, sector2End, raceFinished]
  );

  const handleFinish = useCallback(
    (stats) => {
      setRaceFinished(true);
      setSubmitError(null);
      setLapCompleted(Boolean(stats.completed));
      setLapTally({
        correct: stats.correctKeystrokes ?? 0,
        incorrect: stats.incorrectKeystrokes ?? 0,
        at: Date.now(),
      });
      /* The engine has already written the lap to storage by the time
         this fires, so the banner and the saved ghost can never
         disagree — there is no second save to keep in step. */
      setPbResult({
        isBest: Boolean(stats.personalBest),
        previous: stats.previousBest ?? null,
        wpm: stats.wpm,
      });

      const lapText = activeSnippet.trim();
      const lapTimes = stats.keystrokeTimestamps ?? [];
      setLapTrace({ text: lapText, times: lapTimes, misses: stats.misses ?? [] });
      /* Symbol fluency over time is about code: a warm-up's prose
         would only dilute it. */
      if (!warmupMode) recordSymbolStats(lapText, lapTimes, stats.misses ?? []);

      /* A record claim only goes out for a completed lap on a
         catalogue snippet while signed in. When none of that holds
         there is nothing to wait for, so the personal best can be
         announced immediately rather than after a timeout. */
      const recordClaimPossible = Boolean(
        stats.completed && catalogId && currentUser && token
      );
      setRecordPending(recordClaimPossible);

      setLiveWpm(stats.wpm);
      setLiveAccuracy(stats.accuracy);
      setPeakWpm((prev) => Math.max(prev, Math.min(stats.wpm, 250)));
      engineerFinish();
      sound.chequered();

      // Prefer the engine's own measurement; fall back to wall clock.
      if (stats.elapsedMs) {
        finalElapsedMsRef.current = stats.elapsedMs;
      } else if (startTimeRef.current) {
        finalElapsedMsRef.current = Date.now() - startTimeRef.current;
      }
      setFinalElapsedMs(finalElapsedMsRef.current);

      /* Push the exact final data point. Clamped to be no earlier
         than the last second tick: the ticker rounds down, so a lap
         ending at 4.97s already had a point at 5 and appending 4.97
         sent the chart's X axis backwards at the final sample. */
      const exactFinalTime = Number((finalElapsedMsRef.current / 1000).toFixed(2));
      setWpmHistory((prev) => {
        const lastTime = prev.length > 0 ? prev[prev.length - 1].time : 0;
        return [...prev, { time: Math.max(exactFinalTime, lastTime), wpm: stats.wpm }];
      });

      if (sectorStartRef.current) {
        const s3Time = ((Date.now() - sectorStartRef.current) / 1000).toFixed(2);
        setSectorTimes((prev) => ({ ...prev, s3: parseFloat(s3Time) }));
      }
      setCurrentSector(0);

      // ── Submit race stats to backend (fire-and-forget) ────
      if (!currentUser || !token) return;

      /* A custom snippet has no language of its own, and reporting
         whichever dataset snippet happened to be drawn behind it
         filed the lap under a language that was never raced. The
         highlighter already falls back to the first selected
         language for custom code; the race log now agrees with it. */
      const raceLanguage = customReady
        ? PRISM_LANGUAGE[languages[0]] || "javascript"
        : dsaSnippet
          ? dsaSnippet.language
          : "javascript";

      fetch(`${API_URL}/api/races`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          wpm: stats.wpm,
          accuracy: stats.accuracy,
          timeElapsed: Math.max(
            0,
            Math.round(finalElapsedMsRef.current / 1000)
          ),
          language: raceLanguage,
          /* Both only matter to the track record: which snippet this
             was, and whether the whole of it was actually typed. */
          snippetId: catalogId,
          completed: Boolean(stats.completed),

          /* ── Telemetry ────────────────────────────────────────
             The per-character arrival times behind the ghost lap.
             The server recomputes WPM from these and refuses the
             submission if the number above does not follow from
             them, so a forged race means forging a plausible
             timing curve rather than editing one integer.

             `correctKeystrokes` is the numerator the WPM was
             actually derived from, and `timeLimit` lets the server
             check the run did not outlast its own clock. */
          keystrokeTimestamps: stats.keystrokeTimestamps ?? [],
          correctKeystrokes: stats.correctKeystrokes,
          /* The exact denominator the WPM above was divided by, in
             ms. The server needs it because the keystroke span is
             not the lap's length on a run that ran out of time: stop
             typing with ten seconds left and the span is ten seconds
             short, which used to read as a 67% discrepancy and got
             the lap refused. Sent unrounded-to-seconds, unlike
             `timeElapsed`, because a half-second of rounding is 16%
             of a three-second lap. */
          durationMs: Math.round(finalElapsedMsRef.current),
          timeLimit,

          /* The streak turns over at YOUR midnight, not UTC's —
             without this a racer in Auckland would lose the day at
             lunchtime. Resolved per submission rather than cached,
             so a laptop that crosses a timezone is still right. */
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
        /* The status is checked before the body is used. Without
           this a rejected lap — a failed telemetry check, an expired
           token — parsed as `{ error }`, every `if (data.…)` below
           quietly found nothing, and the results screen rendered as
           though the race had counted. A lap that was thrown away
           has to say so. */
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            /* An expired or invalid token is not a problem with this
               lap, and retrying will not help — the session is over.
               Clearing it puts the app back into a signed-out state
               that offers a way back in, instead of leaving a stale
               user on screen whose every race vanishes. */
            if (res.status === 401) handleUnauthorized();
            const err = new Error(
              res.status === 401
                ? "Your session expired — sign in again to record laps."
                : data.error || `Server returned ${res.status}`
            );
            err.detail = res.status === 401 ? null : data.reason || null;
            throw err;
          }
          return data;
        })
        .then((data) => {
          // Keep the cached profile in step with the server aggregates.
          if (data.stats) applyStats(data.stats);

          /* Rating and streak come back from the same atomic update
             that wrote them, so what is shown is what was stored —
             including on a double submit, where the streak the
             server reports is the real (unincremented) one. */
          if (Number.isFinite(data.eloDelta)) {
            setEloResult({
              delta: data.eloDelta,
              rating: data.eloRating,
              rated: data.elo?.rated ?? false,
              source: data.elo?.source ?? null,
            });
          }
          if (Number.isFinite(data.currentStreak)) {
            setStreak({ current: data.currentStreak, max: data.streak?.max });
          }

          /* The server owns this verdict — it is the only place that
             can compare the lap against every other account. */
          if (data.trackRecord) setRecordResult(data.trackRecord);
          /* A new record means a new record ghost: fetch it afresh. */
          if (data.trackRecord?.isRecord) setRecordGhost(null);
          if (Array.isArray(data.trophies) && data.trophies.length > 0) setNewTrophies(data.trophies);

          /* The board as it stands after this lap comes back with the
             result, so the placement on the results screen, the record
             on the dashboard and the podium in the modal all reflect
             the lap at once, with no second request. */
          if (data.trackStanding) {
            adoptTrackBoard(catalogId, data.trackStanding);
            setLapTrackBest(Boolean(data.trackStanding.isPersonalBest));
          }
        })
        .catch((err) => {
          console.warn("⚠️  Failed to save race stats:", err.message, err.detail ?? "");
          /* Shown on the results screen. A lap that did not reach the
             account is not a lap, and letting that fail silently
             meant a streak that stopped counting and a rating that
             stopped moving with nothing on screen to explain why. */
          setSubmitError(err.detail ? `${err.message} (${err.detail})` : err.message);
        })
        .finally(() => {
          /* Whatever the outcome — record taken, record missed, or the
             request never landed — the wait is over and the results
             screen can say its piece. `finally` rather than the two
             branches so an unexpected throw cannot strand the
             celebration in a permanent "pending". */
          setRecordPending(false);
        });
    },
    [
      dsaSnippet,
      activeSnippet,
      warmupMode,
      customReady,
      languages,
      catalogId,
      timeLimit,
      currentUser,
      token,
      applyStats,
      engineerFinish,
      sound,
      handleUnauthorized,
      adoptTrackBoard,
    ]
  );

  /* ── Next track ───────────────────────────────────────────────
     Draws a fresh snippet through the SAME filters — language mix,
     topic, symbol density, length, time limit all carry over
     untouched. Nothing here reaches for a different configuration:
     the settings only ever change from the settings modal, so a
     session stays on whatever you set up until you say otherwise.

     This replaced a Q1 -> Q2 -> Q3 ladder that silently escalated
     difficulty and swapped in three hard-coded snippets, which meant
     "next" quietly ignored every filter you had chosen.
     ────────────────────────────────────────────────────────────── */
  const handleNextTrack = useCallback(() => {
    /* A linked track ends here: "next" means back to your own draws. */
    if (special) endSpecial();
    /* A custom snippet has no "next" — there is only the one you
       pasted, so this is a straight re-run. */
    if (!customReady) {
      setDsaSnippet(
        drawSnippet(languages, codeLength, density, topic, dsaSnippet?.id)
      );
    }
    restartRace();
  }, [
    customReady,
    languages,
    codeLength,
    density,
    topic,
    dsaSnippet,
    restartRace,
    special,
    endSpecial,
  ]);

  /* ── Symbol drill ─────────────────────────────────────────────
     From the lap review: a track in your languages and length that is
     dense in the symbols that slowed you down. Raced as a special
     track, so the bar says what it is and × gives your draws back. */
  const drillSymbols = useCallback(
    (keys) => {
      const snippet = pickDrillSnippet(languages, codeLength, keys, dsaSnippet?.id);
      if (!snippet) return;
      setSearchParams({}, { replace: true });
      setSpecial({ kind: 'drill', boardId: snippet.id, snippet, keys });
      setDsaSnippet(snippet);
      restartRace();
    },
    [languages, codeLength, dsaSnippet, setSearchParams, restartRace]
  );

  /* ── Format elapsed time as m:ss ────────────────────────── */
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="light-typing-sandbox"
      data-font={globalFont}
      style={{
        '--global-font': fontStack(globalFont),
        '--race-font-size': fontSize,
        '--race-line-height': lineHeight,
      }}
    >
      {/* ── Brand Logo (absolute, top-left) ───────────────── */}
      {/* navigate, not window.location: a full document reload threw
          away the SPA and every piece of in-memory state to move
          between two routes the router already owns. A button rather
          than a clickable image, so it is reachable from the keyboard. */}
      <button
        type="button"
        className="lts-logo"
        aria-label="CodeCaret home"
        onClick={() => navigate('/')}
      >
        <BrandLogo alt="" />
      </button>

      {/* ── Leaderboard Button (absolute, top-right, left of profile) ── */}
      <button
        className="lts-leaderboard-btn"
        onClick={() => openLeaderboard()}
        aria-label="Open leaderboard"
        id="leaderboard-toggle"
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      </button>

      {/* ── Profile Button + Dropdown (absolute, top-right) ──── */}
      <div className="lts-profile-wrapper" ref={profileMenuRef}>
        <button
          className="lts-settings-btn"
          onClick={() => setIsProfileMenuOpen((prev) => !prev)}
          aria-label="Open profile menu"
          id="profile-toggle"
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        </button>

        {isProfileMenuOpen && (
          <div className="lts-profile-dropdown" id="profile-dropdown">
            {/* ── Logged-in state ───────────────────────── */}
            {currentUser ? (
              <>
                {/* Username header */}
                <div className="lts-profile-dropdown-user">
                  <span className="lts-profile-dropdown-username">{currentUser.username}</span>
                  <span className="lts-profile-dropdown-email">{currentUser.email}</span>

                  {/* Streak and rating. Shown only once there is a
                      figure to show — a fresh account displaying
                      "0 day streak" advertises the thing it has not
                      done yet, which is a poor first impression. */}
                  {(streakDays > 0 || eloRating > 0) && (
                    <div className="lts-streak-row">
                      {streakDays > 0 && (
                        <span
                          className="lts-streak"
                          title={`${streakDays} day practice streak`}
                        >
                          <Flame
                            className="lts-streak-flame"
                            aria-hidden="true"
                          />
                          <strong>{streakDays}</strong>
                          <span className="lts-streak-unit">
                            day{streakDays === 1 ? "" : "s"}
                          </span>
                        </span>
                      )}
                      {eloRating > 0 && (
                        <span className="lts-streak lts-streak-elo" title="Driver rating">
                          <strong>{eloRating}</strong>
                          <span className="lts-streak-unit">elo</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>


                {/* Your profile: stats, trophies, form and account. It
                    used to open a dialog with its own copy of half of
                    that; there is one profile now. */}
                <button
                  className="lts-profile-dropdown-item"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate("/profile");
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="9" rx="1" />
                    <rect x="14" y="3" width="7" height="5" rx="1" />
                    <rect x="14" y="12" width="7" height="9" rx="1" />
                    <rect x="3" y="16" width="7" height="5" rx="1" />
                  </svg>
                  Profile
                </button>

                {/* Settings */}
                <button
                  className="lts-profile-dropdown-item"
                  onClick={() => {
                    setSettingsOpen(true);
                    setIsProfileMenuOpen(false);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Settings
                </button>

                {/* Log Out */}
                <button
                  className="lts-profile-dropdown-item lts-profile-dropdown-logout"
                  onClick={handleLogout}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Log Out
                </button>
              </>
            ) : (
              /* ── Logged-out state ──────────────────────── */
              <>
                <button
                  className="lts-profile-dropdown-item"
                  onClick={() => {
                    navigate('/signin');
                    setIsProfileMenuOpen(false);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Sign In / Sign Up
                </button>
                <button
                  className="lts-profile-dropdown-item"
                  onClick={() => {
                    setSettingsOpen(true);
                    setIsProfileMenuOpen(false);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Settings
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {onboardingOpen && <Onboarding touch={touchFirst} onClose={closeOnboarding} />}

      {/* ── Settings Modal ─────────────────────────────────── */}
      {settingsOpen && <SettingsModal {...{ applyRaceConfig, autoIndent, blindMode, caretBlink, caretStyle, codeLength, customReady, customSnippet, density, dsaSnippet, engineerVerbosity, fontSize, freedomMode, ghostCaret, ghostSource, globalFont, handleResetSettings, handleThemeChange, hideLiveWpm, highlightMode, languages, lineHeight, practiceGoalMs, practiceGoalReached, practiceMs, practiceProgress, resetArmed, restartRace, setAutoIndent, setBlindMode, setCaretBlink, setCaretStyle, setCustomSnippet, setEngineerVerbosity, setFontSize, setFreedomMode, setGhostCaret, setGhostSource, setGlobalFont, setHideLiveWpm, setHighlightMode, setLineHeight, setPracticeGoal, setResetArmed, setSettingsOpen, setShowKeyboard, setSmoothCaret, setSoundProfile, setSoundVolume, setStrictMode, setUseCustom, setZenMode, showKeyboard, smoothCaret, sound, soundProfile, soundVolume, strictMode, theme, timeLimit, topic, topicCount, useCustom, warmupMode, zenMode }} />}

      {/* ── Leaderboard Modal ─────────────────────────────── */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={closeLeaderboard}
        currentUser={currentUser}
        track={trackInfo}
        trackBoard={trackBoard}
        requestedTab={leaderboardRequest}
      />

      {/* ── F1 Steering Wheel Dashboard ──────────────────── */}
      {/* Zen hides the whole readout. The values keep updating
          underneath — this is about what you can see mid-race, not
          about measuring less. */}
      {!zenMode && (
      <div className="f1-dashboard">
        {/* Time */}
        <div className={`f1-module ${raceStarted ? "active" : ""}`}>
          <span className={`f1-module-value${timeLimit > 0 && raceStarted && (timeLimit - elapsed) <= 10 ? ' f1-red' : ''}`}>
            {timeLimit > 0
              ? formatTime(raceStarted ? Math.max(timeLimit - elapsed, 0) : timeLimit)
              : formatTime(elapsed)
            }
          </span>
          <span className="f1-module-label">
            {timeLimit > 0
              ? (raceStarted ? 'Remaining' : 'Time Limit')
              : 'Race Time'
            }
          </span>
        </div>
        <div className="f1-module-divider" />

        {/* WPM / Speed — masked while racing when "hide live WPM" is
            on, and the speed bar with it, since a filling bar leaks
            the same number the mask is meant to withhold. Revealed
            the moment the race ends. */}
        <div className={`f1-module ${!hideWpmNow && liveWpm > 80 ? "active" : ""}`}>
          <span className="f1-module-value">{hideWpmNow ? "—" : liveWpm}</span>
          <span className="f1-module-label">WPM</span>
          <div className="f1-speed-bar">
            <div
              className="f1-speed-bar-fill"
              style={{
                width: hideWpmNow
                  ? "0%"
                  : `${Math.min((liveWpm / 150) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
        <div className="f1-module-divider" />

        {/* Peak WPM */}
        <div className="f1-module">
          <span className={`f1-module-value ${!hideWpmNow && peakWpm > 0 ? "f1-green" : ""}`}>
            {hideWpmNow ? "—" : peakWpm || "--"}
          </span>
          <span className="f1-module-label">Peak WPM</span>
        </div>
        <div className="f1-module-divider" />

        {/* Accuracy — also masked in blind mode, since a live accuracy
            figure tells you exactly what the hidden highlighting would
            have. */}
        <div className={`f1-module ${!hideAccuracyNow && liveAccuracy < 95 ? "active" : ""}`}>
          <span className={`f1-module-value ${!hideAccuracyNow && liveAccuracy < 95 ? "f1-yellow" : ""}`}>
            {hideAccuracyNow ? "—" : `${liveAccuracy}%`}
          </span>
          <span className="f1-module-label">Accuracy</span>
        </div>

        {/* Track record — the bar to beat on this snippet.
            Only rendered once a record exists: a module reading
            "0 WPM by None" is noise, and an unraced snippet is the
            common case across a 514-snippet corpus. Purple follows
            F1's own convention, where purple marks the fastest time
            anyone has set and green marks a personal best. */}
        {/* It is P1 on this track's leaderboard, so it is also the way
            in: clicking it opens the podium it heads. Blurred on
            click, like the track bar's buttons, so a focused button
            cannot take the Space meant for the code. */}
        {currentRecord && currentRecord.wpm > 0 && (
          <button
            type="button"
            className="f1-module f1-module-record"
            onClick={(e) => {
              e.currentTarget.blur();
              openLeaderboard("track");
            }}
            title={`Track record: ${currentRecord.username}, ${currentRecord.wpm} WPM at ${currentRecord.accuracy}% — view this track's podium`}
            aria-label={`Track record ${currentRecord.wpm} WPM by ${currentRecord.username}. View this track's podium`}
          >
            <span className="f1-module-value f1-purple">
              {currentRecord.wpm} <small>WPM</small>
            </span>
            <span className="f1-module-label">
              Record · {currentRecord.username}
            </span>
          </button>
        )}
      </div>
      )}

      {/* ── Code Area (with focus overlay) ────────────────── */}
      <div className={`lts-code-area ${!isFocused ? "typing-unfocused" : ""}`}>
        {/* Positioned so the formation strip and the track bar can
            anchor to the code block itself rather than to the page —
            they then sit just outside it at any window size and any
            snippet length. */}
        <div className="lts-code-frame">
          <RaceTrack
            key={raceKey}
            snippet={activeSnippet}
            language={prismLanguage}
            onFinish={handleFinish}
            onProgress={handleProgress}
            onStats={handleStats}
            keyboardRef={keyboardRef}
            caretStyle={caretStyle}
            freedomMode={freedomMode}
            strictMode={strictMode}
            autoIndent={autoIndent}
            onKeystroke={handleKeystrokeSound}
            blindMode={blindMode}
            highlightMode={highlightMode}
            caretBlink={caretBlink}
            smoothCaret={smoothCaret}
            forceFinished={timeExpired}
            raceStarted={raceStarted}
            /* Custom code has no catalogue id, so it has no personal
               best to race against — the ghost sits out those runs. */
            snippetId={catalogId}
            ghostCaret={ghostCaret}
            ghostLap={ghostLap}
            /* Hand the keyboard over while a dialog is up — see the
               note on `overlayOpen`. */
            paused={overlayOpen}
          />
          {touchFirst && <TouchTypingInput disabled={overlayOpen || raceFinished} />}

          {/* ── Start hint ─────────────────────────────────────────
              Sits ABOVE the code rather than on top of it. The old
              overlay was centred over the snippet and blurred it, so
              the one thing you need before a race — what you are
              about to type — was the one thing you could not read.
              And its "press any key to start" was wrong twice over:
              the key that starts the race is also scored as the
              first character, so doing exactly what it said opened
              nearly every lap with a mistake.

              Absolutely positioned against the code block, so it
              takes no layout space: when it leaves on the first key,
              nothing under your eyes moves. */}
          <p
            className={`start-hint ${raceStarted || currentIndex > 0 ? "is-gone" : ""}`}
            aria-hidden={raceStarted || currentIndex > 0}
          >
            {touchFirst
              ? "Tap the code to bring up your keyboard — the clock starts on your first key"
              : "Start typing — the clock starts on your first key"}
            {ghostCaret && ghostLap && (
              <span className="start-hint-ghost">
                {` · ghost: @${ghostLap.username}, ${ghostLap.wpm} WPM${ghostLap.isRecord ? " record" : ""}`}
              </span>
            )}
          </p>

          {/* ── Track bar ──────────────────────────────────────────
              What you are racing and the two things you most often
              want to change about it, right under the code.

              Before this, the language, length and time limit were
              only visible on the RESULTS screen, and changing any of
              them meant finding Settings behind an unlabelled person
              icon. The restart shortcut existed but was documented
              nowhere on screen at all.

              Fades entirely while a lap is running, restart hint
              included — it is for between races, and a racer's eyes
              belong on the code. The shortcut still works mid-lap. */}
          <div
            className={`track-bar ${raceStarted && !raceFinished ? "is-racing" : ""}`}
          >
            <div className="track-bar-config">
              {special ? (
                <span className="track-bar-special">
                  <span className="track-bar-special-kind">
                    {special.kind === "daily"
                      ? "Track of the day"
                      : special.kind === "drill"
                        ? "Symbol drill"
                        : "Challenge"}
                  </span>
                  {special.kind === "drill"
                    ? special.keys.join(" ")
                    : special.vsWpm
                      ? `Beat ${special.by ? `@${special.by}` : "the"} ${special.vsWpm} WPM`
                      : dsaSnippet?.title}
                  <button
                    type="button"
                    className="track-bar-special-close"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      endSpecial();
                      restartRace();
                    }}
                    aria-label={
                      special.kind === "daily"
                        ? "Leave the track of the day"
                        : special.kind === "drill"
                          ? "Leave the symbol drill"
                          : "Leave this challenge"
                    }
                    title="Back to your own setup"
                  >
                    ×
                  </button>
                </span>
              ) : (
              <span className="track-bar-summary" title="Current race configuration">
                {customReady ? (
                  "Custom snippet"
                ) : (
                  <>
                    {warmupMode
                      ? "English warm-up"
                      : languages.length === CODE_LANGUAGES.length
                        ? "All languages"
                        : languages.join(" + ")}
                    {topic !== "any" && !warmupMode && (
                      <>
                        <i aria-hidden="true">·</i>
                        {TOPIC_OPTIONS.find((t) => t.id === topic)?.label}
                      </>
                    )}
                    <i aria-hidden="true">·</i>
                    {codeLength}
                  </>
                )}
                <i aria-hidden="true">·</i>
                {timeLimit === 0 ? "no limit" : `${timeLimit}s`}
              </span>
              )}

              {special?.kind !== "daily" && (
                <button
                  type="button"
                  className="track-bar-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    startDaily();
                  }}
                  aria-label="Track of the day"
                  title="One track for everyone today, with its own podium"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Daily
                </button>
              )}

              {/* Blurred on click: a focused button would also take
                  the Space and Enter meant for the code, so focus goes
                  straight back to the typing surface. */}
              {!customReady && (
                <button
                  type="button"
                  className="track-bar-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleNextTrack();
                  }}
                  disabled={poolSize <= 1}
                  /* Explicit, so the accessible name is the words on
                     the button. Without it Chrome named the button by
                     its tooltip ("Draw another track · 43 match…"),
                     and a voice-control user saying "click Next
                     track" got nothing. The title stays as the
                     description. */
                  aria-label="Next track"
                  title={
                    poolSize <= 1
                      ? "Only one track matches your filters — widen one in Settings"
                      : `Draw another track · ${poolSize} match your filters`
                  }
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                    <polyline points="21 3 21 9 15 9" />
                  </svg>
                  Next track
                </button>
              )}

              <button
                type="button"
                className="track-bar-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setSettingsOpen(true);
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
                Change setup
              </button>
            </div>

            <span className="track-bar-hint">
              <kbd>tab</kbd> + <kbd>enter</kbd> restart
            </span>
          </div>

          {/* ── Focus overlay ────────────────────────────── */}
          {!isFocused && (
            <div className="focus-overlay" onClick={() => window.focus()}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                style={{ marginRight: "10px" }}
              >
                <path d="M7 2l12 11.2-5.8.5 3.3 7.3-2.2.9-3.2-7.4-4.4 4.7z" />
              </svg>
              <span>Click here or press any key to focus</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Virtual Keyboard ─────────────────────────────── */}
      {/* Zen overrides the keyboard toggle rather than clearing it, so
          turning zen off restores whatever you had before. */}
      {showKeyboard && !zenMode && !touchFirst && (
        <div className={`lts-keyboard-area ${!isFocused ? "typing-unfocused" : ""}`}>
          <VirtualKeyboard ref={keyboardRef} />
        </div>
      )}

      {/* ── Race Engineer Radio Toasts ────────────────────── */}
      <div className="f1-radio-container">
        {(zenMode ? [] : radioMessages).map((msg) => (
          <div
            key={msg.uniqueId}
            className="f1-radio-toast"
            onClick={() => dismissMessage(msg.uniqueId)}
          >
            <span className="f1-radio-icon">{msg.icon}</span>
            <div className="f1-radio-content">
              <div className="f1-radio-label">Race Engineer</div>
              <div className="f1-radio-text">{msg.text}</div>
            </div>
            <div className="f1-radio-static">
              <div className="f1-radio-static-bars">
                <div className="f1-radio-static-bar" />
                <div className="f1-radio-static-bar" />
                <div className="f1-radio-static-bar" />
                <div className="f1-radio-static-bar" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Daily practice goal announcement ──────────────────
          The only time the tracker interrupts. Rendered above the
          results screen so it still reads if the goal happens to
          land on the same keystroke that ends a race. */}
      {goalAlertOpen && (
        <PracticeGoalAlert
          accumulatedMs={practiceMs}
          goalMs={practiceGoalMs}
          onDismiss={dismissGoalAlert}
        />
      )}

      {/* ── 🏁 CHEQUERED FLAG RESULTS SCREEN ────────────────── */}
      {raceFinished && <ResultsScreen {...{ celebration, codeLength, currentUser, customReady, density, dsaSnippet, eloResult, finalElapsedMs, handleNextTrack, languages, lapCompleted, lapTally, lapTrackBest, liveAccuracy, liveWpm, navigate, openLeaderboard, pbResult, peakWpm, poolSize, recordPending, recordResult, restartRace, sectorTimes, setShareLap, shareButtonRef, submitError, topic, trackBoard, trackInfo, warmupMode, wpmHistory, special, lapTrace, drillSymbols: customReady ? null : drillSymbols, newTrophies, hotkeys: !overlayOpen && !shareOpen }} />}

      {/* ── Share screenshot ── above the results screen it opens from. */}
      {shareOpen && (
        <Suspense fallback={null}>
          <ShareCardDialog card={shareCard} onClose={closeShare} />
        </Suspense>
      )}
    </div>
  );
}
