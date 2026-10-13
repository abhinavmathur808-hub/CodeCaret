import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../config";
import "./LeaderboardModal.css";

const LEADERBOARD_URL = `${API_URL}/api/leaderboard/global`;

const driverPath = (name) => `/driver/${encodeURIComponent(name)}`;

const TABS = [
  { id: "track", label: "This track" },
  { id: "global", label: "Global" },
];

/* Rank order in the DOM — what a screen reader announces — and the
   classic podium arrangement on screen (P2, P1, P3) comes from CSS
   `order`, so the two never have to be the same list. */
const PODIUM_POSITIONS = [1, 2, 3];

/**
 * LeaderboardModal — two boards behind the trophy icon:
 *
 *   This track — the podium for the snippet on screen: the three
 *                fastest completed laps, one per racer, ties broken
 *                on accuracy. Plus where YOU stand, even off the
 *                podium, so there is always a next target.
 *   Global     — every racer, ranked by peak WPM.
 *
 * @param {boolean}  isOpen
 * @param {function} onClose
 * @param {object}   currentUser  Signed-in user, or null.
 * @param {object?}  track        { id, title, language, length, topicLabel }
 *                                for a catalogue track; null for custom code.
 * @param {object}   trackBoard   { board, loading, error, refresh } from
 *                                useTrackBoard — the same board the
 *                                dashboard and results screen read.
 * @param {string}   [requestedTab] Tab to show on this opening.
 */
export default function LeaderboardModal({
  isOpen,
  onClose,
  currentUser,
  track = null,
  trackBoard = null,
  requestedTab = null,
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [error, setError] = useState("");

  /* The track board is what you are most likely after from the race
     screen, so it leads. Kept across openings: switch to Global once
     and that is where it reopens, rather than resetting on you. */
  const [tab, setTab] = useState("track");
  const tabRefs = useRef({});

  /* An explicit request (the results screen's "View podium") wins
     over the remembered tab, but only for the opening it was made
     on. Applied with the "adjust state during render" pattern rather
     than an effect, so the modal never paints the wrong tab first. */
  const [lastRequest, setLastRequest] = useState(null);
  const requestKey = isOpen ? requestedTab : null;
  if (requestKey !== lastRequest) {
    setLastRequest(requestKey);
    if (requestKey && requestKey !== tab) setTab(requestKey);
  }

  /* ── Global board: fetched when its tab is actually shown ───── */
  useEffect(() => {
    if (!isOpen || tab !== "global") return;

    let cancelled = false;

    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(LEADERBOARD_URL);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setError(data.error || "Failed to load leaderboard");
          return;
        }
        setLeaderboardData(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setError("Network error — is the server running?");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [isOpen, tab]);

  /* ── Track board: refreshed on every opening ──────────────────
     Someone else may have finished the track since it was last read,
     and the podium is the reason the modal was opened. The board
     already on hand stays on screen while the fresh one loads. */
  const refreshTrack = trackBoard?.refresh;
  useEffect(() => {
    if (isOpen && tab === "track") refreshTrack?.();
  }, [isOpen, tab, refreshTrack]);

  /* ── Keyboard: Escape closes, and focus starts on the tabs ───── */
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) tabRefs.current[tab]?.focus();
    // Only on opening — following focus on every tab change would
    // fight the arrow-key handling below, which moves it itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /** Left/Right moves between tabs, as a tablist should. */
  const onTabKeyDown = useCallback(
    (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const i = TABS.findIndex((t) => t.id === tab);
      const next = TABS[(i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length];
      setTab(next.id);
      tabRefs.current[next.id]?.focus();
    },
    [tab]
  );

  if (!isOpen) return null;

  const champion = leaderboardData[0] || null;
  const rest = leaderboardData.slice(1);
  const championIsMe =
    Boolean(champion) &&
    Boolean(currentUser) &&
    currentUser.username === champion.username;

  const getRankClass = (rank) => {
    if (rank === 2) return "lb-rank-silver";
    if (rank === 3) return "lb-rank-bronze";
    return "";
  };

  return (
    <>
      <div className="settings-modal-backdrop lb-backdrop" onClick={onClose} />

      <div
        className="lb-modal"
        id="leaderboard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lb-title"
      >
        {/* ── Header ──────────────────────────────────── */}
        <div className="lb-header">
          <span className="lb-title" id="lb-title">Leaderboard</span>
          <button
            className="settings-modal-close"
            onClick={onClose}
            aria-label="Close leaderboard"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Tabs ────────────────────────────────────── */}
        <div className="lb-tabs" role="tablist" aria-label="Leaderboard">
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`lb-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls="lb-panel"
              tabIndex={tab === t.id ? 0 : -1}
              className={`lb-tab ${tab === t.id ? "is-active" : ""}`}
              onClick={() => setTab(t.id)}
              onKeyDown={onTabKeyDown}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Body ────────────────────────────────────── */}
        <div
          className="lb-body"
          role="tabpanel"
          id="lb-panel"
          aria-labelledby={`lb-tab-${tab}`}
        >
          {tab === "track" ? (
            <TrackPanel
              track={track}
              trackBoard={trackBoard}
              currentUser={currentUser}
              onClose={onClose}
            />
          ) : isLoading ? (
            <div className="lb-loading">
              <span className="lb-spinner" />
              <span className="lb-loading-text">Loading rankings…</span>
            </div>
          ) : error ? (
            <div className="lb-error">{error}</div>
          ) : leaderboardData.length === 0 ? (
            <div className="lb-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3a3a3a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
              <span className="lb-empty-text">No racers on the board yet — be the first!</span>
            </div>
          ) : (
            <>
              {/* ── Champion Card (#1) ──────────────────── */}
              {champion && (
                <div className="lb-champion-card">
                  <div className="lb-champion-badge">
                    {/* Trophy icon */}
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                  </div>
                  <div className="lb-champion-info">
                    <span className="lb-champion-label">Globally fastest</span>
                    <span className="lb-champion-name">
                      <Link to={driverPath(champion.username)} className="lb-driver-link">
                        {champion.username}
                      </Link>
                      {championIsMe && <span className="lb-you-badge">You</span>}
                    </span>
                  </div>
                  <div className="lb-champion-stat">
                    <span className="lb-champion-wpm">{champion.peakWpm}</span>
                    <span className="lb-champion-wpm-label">WPM</span>
                  </div>
                </div>
              )}

              {/* ── Rankings Table ──────────────────────── */}
              <div className="lb-table-scroll">
                <table className="lb-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Racer</th>
                      <th>Peak WPM</th>
                      <th>Avg WPM</th>
                      <th>Races</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((entry) => {
                      const isMe =
                        currentUser &&
                        currentUser.username === entry.username;
                      return (
                        <tr
                          key={entry.rank}
                          className={`${getRankClass(entry.rank)}${isMe ? " lb-row-self" : ""}`}
                        >
                          <td className="lb-td-rank">
                            {entry.rank === 2 && <span className="lb-medal">🥈</span>}
                            {entry.rank === 3 && <span className="lb-medal">🥉</span>}
                            {entry.rank > 3 && entry.rank}
                          </td>
                          <td className={`lb-td-name${isMe ? " lb-td-name-self" : ""}`}>
                            <Link to={driverPath(entry.username)} className="lb-driver-link">
                              {entry.username}
                            </Link>
                            {isMe && <span className="lb-you-badge">You</span>}
                          </td>
                          <td className="lb-td-wpm">{entry.peakWpm}</td>
                          <td className="lb-td-avg">{entry.averageWpm}</td>
                          <td className="lb-td-muted">{entry.totalRaces}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Track panel
   ══════════════════════════════════════════════════════════════ */

function TrackPanel({ track, trackBoard, currentUser, onClose }) {
  /* Custom code has no shared identity — two people pasting "the
     same" snippet are not racing the same track, and a board keyed
     on arbitrary pasted text would be a board anyone could mint by
     the thousand. Said plainly rather than shown as an empty podium,
     which would suggest nobody had raced it yet. */
  if (!track) {
    return (
      <div className="lb-track-none">
        <span className="lb-track-none-title">Custom snippets don&apos;t have a podium</span>
        <span className="lb-track-none-text">
          Race a library track to compete for a spot on its leaderboard.
        </span>
      </div>
    );
  }

  const board = trackBoard?.board ?? null;
  const loading = Boolean(trackBoard?.loading) && !board;
  const error = trackBoard?.error && !board ? trackBoard.error : "";
  const podium = board?.podium ?? [];
  const byPosition = new Map(podium.map((p) => [p.position, p]));
  const myId = currentUser?.id ? String(currentUser.id) : null;
  const nobodyYet = Boolean(board) && podium.length === 0;

  return (
    <div className="lb-track">
      <div className="lb-track-head">
        <div className="lb-track-id">
          <span className="lb-track-label">Track</span>
          <span className="lb-track-title">{track.title}</span>
          <span className="lb-track-meta">
            {[track.language, track.length, track.topicLabel].filter(Boolean).join(" · ")}
          </span>
        </div>
        {board && (
          <div className="lb-track-count" title="Racers who have completed this track">
            <strong>{board.racers}</strong>
            <span>finished</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="lb-loading">
          <span className="lb-spinner" />
          <span className="lb-loading-text">Loading this track&apos;s podium…</span>
        </div>
      ) : error ? (
        <div className="lb-error">{error}</div>
      ) : (
        <>
          <ol
            className={`lb-podium ${nobodyYet ? "is-empty" : ""}`}
            aria-label={`Top three on ${track.title}`}
          >
            {PODIUM_POSITIONS.map((position) => (
              <PodiumStep
                key={position}
                position={position}
                entry={byPosition.get(position)}
                isMe={Boolean(myId) && byPosition.get(position)?.userId === myId}
              />
            ))}
          </ol>

          {nobodyYet && (
            <p className="lb-podium-invite">
              Nobody has finished this track yet — complete it to take P1.
            </p>
          )}

          <YourStanding
            board={board}
            signedIn={Boolean(currentUser)}
            onClose={onClose}
          />
        </>
      )}

      <p className="lb-track-rules">
        Best completed lap per racer · a WPM tie goes to accuracy, then to
        whoever set it first
      </p>
    </div>
  );
}

function PodiumStep({ position, entry, isMe }) {
  const label = entry
    ? `P${position}: ${entry.username}${isMe ? " (you)" : ""}, ${entry.wpm} words per minute, ${entry.accuracy}% accuracy`
    : `P${position}: open`;

  return (
    <li
      className={`lb-step lb-step-p${position}${entry ? "" : " is-open"}${isMe ? " is-me" : ""}`}
    >
      {/* Read as one line, then the driver's name as a link to their page. */}
      <span className="sr-only">{label}</span>
      <div className="lb-step-racer">
        {entry ? (
          <>
            <Link
              to={driverPath(entry.username)}
              className="lb-step-name lb-driver-link"
              title={entry.username}
              aria-label={`${entry.username}'s driver page`}
            >
              {entry.username}
            </Link>
            <span aria-hidden="true" className="contents">
              {isMe && <span className="lb-you-badge">You</span>}
              <span className="lb-step-wpm">
                {entry.wpm}
                <small>wpm</small>
              </span>
              <span className="lb-step-acc">{entry.accuracy}% acc</span>
            </span>
          </>
        ) : (
          <span className="lb-step-open" aria-hidden="true">Open</span>
        )}
      </div>
      <div className="lb-step-block" aria-hidden="true">
        <span className="lb-step-pos">{position}</span>
      </div>
    </li>
  );
}

/**
 * Where the viewer stands — the line under the podium.
 *
 * The board itself is only ever three rows. This is the one extra
 * line that tells a racer outside them how far they are from it, so
 * the podium reads as a target rather than a wall.
 */
function YourStanding({ board, signedIn, onClose }) {
  if (!signedIn) {
    return (
      <div className="lb-standing is-muted">
        <span>Sign in to post your times to this track&apos;s podium.</span>
        <Link to="/signin" className="lb-standing-action" onClick={onClose}>
          Sign in
        </Link>
      </div>
    );
  }

  const you = board?.you ?? null;
  if (!you) {
    return (
      <div className="lb-standing is-muted">
        <span>
          You haven&apos;t completed this track yet. Finish the whole snippet
          to post a time.
        </span>
      </div>
    );
  }

  if (you.onPodium) {
    const ahead = board.podium.find((p) => p.position === you.position - 1);
    let detail = "you hold the track record";
    if (ahead) {
      const gap = ahead.wpm - you.wpm;
      detail =
        gap > 0
          ? `${gap} wpm behind P${ahead.position}`
          : ahead.accuracy > you.accuracy
            ? `level with P${ahead.position} on pace — behind on accuracy`
            : `level with P${ahead.position} — they set it first`;
    }
    return (
      <div className="lb-standing is-podium">
        <span className="lb-you-badge">You</span>
        <span className="lb-standing-text">
          <strong>P{you.position}</strong> on this track · {detail}
        </span>
      </div>
    );
  }

  const gapText =
    you.wpmToPodium > 0
      ? `${you.wpmToPodium} wpm off the podium`
      : you.wpmToPodium === 0
        ? "level with P3 on pace — behind on accuracy"
        : "off the podium";

  return (
    <div className="lb-standing">
      <span className="lb-you-badge">You</span>
      <span className="lb-standing-pos">P{you.position}</span>
      <span className="lb-standing-stat">
        {you.wpm}
        <small>wpm</small>
      </span>
      <span className="lb-standing-stat is-dim">{you.accuracy}%</span>
      <span className="lb-standing-gap">{gapText}</span>
    </div>
  );
}
