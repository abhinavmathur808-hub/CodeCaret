import { useEffect, useRef } from "react";
import { Camera } from "lucide-react";
import cklHeroImg from "../../assets/ckl.png";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { WARMUP_LANGUAGE, formatRaceTime, TOPIC_OPTIONS } from "../../utils/snippetPool";
import LapReview from "./LapReview";
import TrophyBadge from "../driver/TrophyBadge";
import { trophyById } from "../../utils/trophies";

/* ══════════════════════════════════════════════════════════════
   ResultsScreen — the chequered flag: what the lap you just finished
   was worth, where it stands, and what to do next.

   Moved out of TestTypingSandbox.jsx, which still owns the race state
   and computes every figure shown here; this component lays it out.
   ══════════════════════════════════════════════════════════════ */
export default function ResultsScreen({
  celebration,
  codeLength,
  currentUser,
  customReady,
  density,
  drillSymbols,
  dsaSnippet,
  eloResult,
  finalElapsedMs,
  handleNextTrack,
  /* False while something else owns the keyboard (a dialog, the share
     card), so Enter is not taken from it. */
  hotkeys = true,
  languages,
  lapCompleted,
  lapTrace,
  lapTally,
  lapTrackBest,
  liveAccuracy,
  liveWpm,
  navigate,
  newTrophies = [],
  openLeaderboard,
  pbResult,
  peakWpm,
  poolSize,
  recordPending,
  recordResult,
  restartRace,
  sectorTimes,
  setShareLap,
  shareButtonRef,
  special,
  submitError,
  topic,
  trackBoard,
  trackInfo,
  warmupMode,
  wpmHistory,
}) {
  const titleRef = useRef(null);

  /* Focus lands on the heading, so a screen reader starts here and the
     keyboard is on this screen rather than left on the race behind. */
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  /* ── Enter: next track ───────────────────────────────────────
     Only when nothing focusable has the key: on a button, Enter must
     press that button. Not in the first moments either — an Enter
     typed a beat after the last character would otherwise skip the
     results unseen. */
  const nextRef = useRef(handleNextTrack);
  useEffect(() => {
    nextRef.current = handleNextTrack;
  });
  useEffect(() => {
    if (!hotkeys) return undefined;
    const armedAt = performance.now() + 700;
    const onKey = (e) => {
      if (e.key !== "Enter" || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (performance.now() < armedAt) return;
      if (e.target instanceof Element && e.target.closest("button, a, input, textarea, select, [contenteditable], [role=dialog]")) return;
      e.preventDefault();
      nextRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkeys]);

  return (
    <div className="f1-chequered-flag-screen">
      {/* Animated checkered stripe across the top */}
      <div className="cf-stripe" />

      {/* What a screen reader announces as the lap ends. */}
      <p className="sr-only" role="status" aria-live="polite">
        {`Lap ${lapCompleted ? "complete" : "over"}: ${liveWpm} words per minute, ${liveAccuracy}% accuracy, time ${formatRaceTime(finalElapsedMs)}. Press Enter for the next track.`}
      </p>

      <div className="cf-header">
        <h1 className="cf-title" ref={titleRef} tabIndex={-1}>🏁 Chequered flag</h1>
      </div>

      {/* ── Personal best ────────────────────────────────────
          Sits directly under the headline, above the car and the
          numbers, because it is the single most important thing
          that happened this lap.

          Two outcomes, deliberately worded differently. Beating a
          stored time gets the margin you beat it by — the number
          is the reward, and "+27 WPM" says more than any adjective.
          A first clean lap has nothing to be a margin over, so it
          is announced as setting the benchmark rather than
          breaking one; treating both as "New personal best" would
          fire on every first completion and make the phrase mean
          nothing. */}
      {/* ── Track record ─────────────────────────────────────
          Outranks the personal best and replaces it: taking the
          fastest lap on the board necessarily beat your own, so
          stacking both banners would be announcing the same lap
          twice and burying the bigger of the two. */}
      {celebration === "record" && (
        <div className="tr-banner-wrap" role="status">
          <div className="tr-banner">New track record</div>
          <div className="tr-delta">
            <strong>{recordResult.recordWpm} WPM</strong>
            <span> — fastest lap on this snippet by anyone</span>
          </div>
        </div>
      )}

      {/* Only ever a beaten record — `celebration` is null on a
          first completion, so both branches that used to handle
          "no previous time" are gone and `previous` is always a
          real number here. */}
      {celebration === "pb" && (
        <div className="pb-banner-wrap" role="status">
          <div className="pb-banner">New personal best</div>
          <div className="pb-delta">
            <strong>+{Math.max(1, pbResult.wpm - pbResult.previous)} WPM</strong>
            <span> on your previous {pbResult.previous}</span>
          </div>
        </div>
      )}

      {/* ── Lap not recorded ─────────────────────────────────
          Sits with the celebration banners rather than down by
          the stats, because it qualifies everything below it:
          the numbers on this screen are real, but they went
          nowhere. Silence here used to leave a racer watching
          their streak and rating sit still with no explanation. */}
      {/* A warm-up still banks history, streak and the passage's own
          podium; this is the line that says what it does not touch. */}
      {(customReady ? warmupMode : dsaSnippet?.language === WARMUP_LANGUAGE) && (
        <p className="cf-warmup-note">
          Warm-up lap · kept out of your rating and the global leaderboard
        </p>
      )}

      {/* ── Trophies earned on this lap, first time only ── */}
      {newTrophies.length > 0 && (
        <div className="cf-trophies" role="status">
          {newTrophies.map(trophyById).filter(Boolean).map((t) => (
            <button
              key={t.id}
              type="button"
              className="cf-trophy"
              onClick={() => navigate("/profile")}
              title="See your trophy cabinet"
            >
              <TrophyBadge id={t.id} size={46} />
              <span className="cf-trophy-text">
                <span className="cf-trophy-kicker">Trophy earned</span>
                <span className="cf-trophy-title">{t.title}</span>
                <span className="cf-trophy-blurb">{t.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── A challenge's verdict ── the lap against the pace the
          link was shared with. Only a finished lap is compared:
          a time-limited part-lap is not the same race. */}
      {special?.vsWpm && (() => {
        const who = special.by ? `@${special.by}` : "the target";
        const gap = liveWpm - special.vsWpm;
        const tone = !lapCompleted ? "is-open" : gap > 0 ? "is-won" : gap === 0 ? "is-tied" : "is-lost";
        return (
          <p className={`cf-challenge ${tone}`} role="status">
            {!lapCompleted
              ? `Finish the whole track to take on ${who}'s ${special.vsWpm} WPM`
              : gap > 0
                ? `You beat ${who}'s ${special.vsWpm} WPM by ${gap}`
                : gap === 0
                  ? `Dead heat with ${who} at ${special.vsWpm} WPM`
                  : `${who} is still ${-gap} WPM ahead. Retry the track`}
          </p>
        );
      })()}

      {submitError && (
        <div className="cf-submit-error" role="alert">
          <strong>Lap not recorded</strong>
          <span>{submitError}</span>
        </div>
      )}

      {/* ── Where you stand on this track ───────────────────
          The answer to "how did that compare?", with a way into
          the full podium. Library tracks only — custom code has
          no board — and held while the server is still ruling,
          so it never flashes a stale position before the lap has
          been counted. */}
      {trackInfo && !recordPending && !submitError && (() => {
        const you = trackBoard.board?.you ?? null;
        const kind = !currentUser
          ? "signin"
          : !lapCompleted
            ? "incomplete"
            : you
              ? "placed"
              : null;
        if (!kind) return null;

        const medal = kind === "placed" && you.position <= 3 ? ` is-p${you.position}` : "";
        return (
          <div
            className={`cf-standing${medal}${kind === "placed" ? "" : " is-muted"}`}
            role="status"
          >
            <svg className="cf-standing-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            <span className="cf-standing-text">
              {kind === "placed" && (
                <>
                  {lapTrackBest === false ? "Your best stands at " : ""}
                  <strong>P{you.position}</strong> on {trackInfo.title}
                  {you.position > 3 && you.wpmToPodium > 0 && (
                    <span className="cf-standing-gap">
                      {" "}· {you.wpmToPodium} wpm off the podium
                    </span>
                  )}
                </>
              )}
              {kind === "incomplete" &&
                "Only completed laps reach the podium — finish the whole track to post a time"}
              {kind === "signin" &&
                "Sign in to put your laps on this track's podium"}
            </span>
            {kind === "signin" ? (
              <button
                type="button"
                className="cf-standing-btn"
                onClick={() => navigate("/signin")}
              >
                Sign in
              </button>
            ) : (
              <button
                type="button"
                className="cf-standing-btn"
                onClick={() => openLeaderboard("track")}
              >
                View podium <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        );
      })()}

      {/* Hero car + waving flag */}
      <div className="hero-display-wrapper">
        <img
          src={cklHeroImg}
          alt="CodeCaret F1 Car"
          className="results-hero-car"
        />
        <span className="waving-flag" aria-hidden="true">🏁</span>
      </div>

      <div className="cf-telemetry-grid">
        {/* Fastest Lap (Peak WPM) */}
        <div className="cf-stat-box">
          <span className="cf-label">Fastest lap (peak)</span>
          <span className="cf-value cf-green">{peakWpm} <small>WPM</small></span>
        </div>

        {/* Average Pace */}
        <div className="cf-stat-box">
          <span className="cf-label">Average pace</span>
          <span className="cf-value">{liveWpm} <small>WPM</small></span>
        </div>

        {/* Accuracy */}
        <div className="cf-stat-box">
          <span className="cf-label">Accuracy</span>
          <span className="cf-value">{liveAccuracy}<small>%</small></span>
        </div>

        {/* Race Time */}
        <div className="cf-stat-box">
          <span className="cf-label">Race time</span>
          <span className="cf-value">{formatRaceTime(finalElapsedMs)}</span>
        </div>

        {/* Rating — only for a lap that was actually rated. An
            unraced snippet has no field to measure against, and
            showing "+0" would read as a failure rather than as
            "there was nobody to race". */}
        {eloResult?.rated && (
          <div className="cf-stat-box">
            <span className="cf-label">Rating</span>
            <span
              className={`cf-value ${
                eloResult.delta > 0
                  ? "cf-green"
                  : eloResult.delta < 0
                    ? "cf-red"
                    : ""
              }`}
            >
              {eloResult.delta > 0 ? "+" : ""}
              {eloResult.delta} <small>ELO</small>
            </span>
            <span className="cf-sub">{eloResult.rating}</span>
          </div>
        )}
      </div>

      {/* Sector Breakdown */}
      <div className="cf-sector-summary">
        <div className="cf-sector-chip s1">
          <span className="cf-sector-label">S1</span>
          <span className="cf-sector-time">{sectorTimes.s1 !== null ? `${sectorTimes.s1.toFixed(2)}s` : "--"}</span>
        </div>
        <div className="cf-sector-chip s2">
          <span className="cf-sector-label">S2</span>
          <span className="cf-sector-time">{sectorTimes.s2 !== null ? `${sectorTimes.s2.toFixed(2)}s` : "--"}</span>
        </div>
        <div className="cf-sector-chip s3">
          <span className="cf-sector-label">S3</span>
          <span className="cf-sector-time">{sectorTimes.s3 !== null ? `${sectorTimes.s3.toFixed(2)}s` : "--"}</span>
        </div>
      </div>

      {/* Speed Telemetry Graph */}
      {wpmHistory.length > 1 && (
        <div className="cf-graph-container">
          <h3 className="cf-graph-title">Speed telemetry</h3>
          <div className="cf-graph-wrapper" style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={wpmHistory} margin={{ top: 10, right: 40, left: -20, bottom: 25 }}>
                <defs>
                  <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--cc-accent)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--cc-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={[0, 'dataMax']}
                  stroke="var(--cc-border-strong)"
                  tick={{ fill: 'var(--cc-text-3)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={{ stroke: 'var(--cc-border)' }}
                  tickLine={{ stroke: 'var(--cc-border)' }}
                  label={{ value: 'TIME (s)', position: 'insideBottomRight', offset: -5, fill: 'var(--cc-text-4)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                />
                <YAxis
                  stroke="var(--cc-border-strong)"
                  tick={{ fill: 'var(--cc-text-3)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={{ stroke: 'var(--cc-border)' }}
                  tickLine={{ stroke: 'var(--cc-border)' }}
                  label={{ value: 'WPM', angle: -90, position: 'insideLeft', offset: 28, fill: 'var(--cc-text-4)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--cc-elevated)',
                    borderColor: 'var(--cc-accent)',
                    color: 'var(--cc-text)',
                    borderRadius: '4px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.8rem',
                  }}
                  itemStyle={{ color: 'var(--cc-accent)', fontWeight: 'bold' }}
                  labelFormatter={(val) => `${val}s`}
                  formatter={(val) => [`${val} WPM`, 'Speed']}
                />
                <Area
                  type="monotone"
                  dataKey="wpm"
                  stroke="var(--cc-accent)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorWpm)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--cc-accent)', stroke: 'var(--cc-surface)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {lapTrace && (
        <LapReview
          text={lapTrace.text}
          times={lapTrace.times}
          misses={lapTrace.misses}
          onDrill={drillSymbols}
        />
      )}

      {/* Actions — "next track" leads, because after a finished
          race the common intent is another one just like it. */}
      <div className="cf-actions">
        <button className="f1-btn primary cf-next-btn" onClick={handleNextTrack} aria-keyshortcuts="Enter">
          Race next track →
          <kbd className="cf-kbd" aria-hidden="true">Enter</kbd>
        </button>
        <button className="f1-btn secondary" onClick={restartRace}>
          Retry this track
        </button>
        {/* Not for a lap with nothing in it — a race force-finished
            before the first keystroke has no card worth sending. */}
        {liveWpm > 0 && lapTally && (
          <button
            ref={shareButtonRef}
            type="button"
            className="f1-btn secondary cf-share-btn"
            onClick={() => setShareLap(lapTally.at)}
            aria-haspopup="dialog"
          >
            <Camera size={18} aria-hidden="true" />
            Share screenshot
          </button>
        )}
      </div>

      {/* States the configuration the next track will use, so
          "same settings" is something you can see rather than
          something you have to trust. */}
      <p className="cf-config-note">
        {customReady ? (
          'Next track: your custom snippet — retry only'
        ) : warmupMode ? (
          <>
            {`Next track: English warm-up · ${codeLength}`}
            <span className="cf-config-pool">
              {poolSize === 1 ? ' · 1 passage' : ` · ${poolSize} passages`}
            </span>
          </>
        ) : (
          <>
            {`Next track: ${languages.join(' + ')} · ${
              topic === 'any'
                ? 'any topic'
                : TOPIC_OPTIONS.find((t) => t.id === topic)?.label
            } · ${codeLength} · ${
              density === 'any' ? 'any symbols' : `${density} symbols`
            }`}
            {/* Spelled out at 1, because that is the only case
                where "next track" cannot hand you a new snippet. */}
            <span className="cf-config-pool">
              {poolSize === 1
                ? ' · only 1 track matches — widen a filter for variety'
                : ` · ${poolSize} tracks`}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
