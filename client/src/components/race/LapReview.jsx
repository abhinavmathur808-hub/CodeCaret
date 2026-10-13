import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { lapHeat, lapSymbols } from "../../utils/lapAnalysis";

/* ══════════════════════════════════════════════════════════════
   LapReview — the lap you just finished, character by character.

   Every key is tinted by how long it took against your usual key in
   this lap, and every key you mistyped is underlined, so "where did
   that lap go" has an answer you can see. Replay runs a caret through
   the code on the lap's own timings, at up to four times speed.

   Below it, symbol fluency: the symbols that cost you the most time
   against your plain-letter pace, the ones you missed, and a button
   that drills them.

   The replay writes to the DOM directly, like the race caret does:
   it moves up to sixty times a second across hundreds of spans, and
   routing that through state would re-render every one of them per
   frame.
   ══════════════════════════════════════════════════════════════ */

const SPEEDS = [1, 2, 4];

/* Not enough of a lap to say anything about. */
const MIN_TIMED = 12;

const fmtRatio = (r) => `${r.toFixed(1)}×`;

export default function LapReview({ text, times, misses, onDrill }) {
  const heat = useMemo(() => lapHeat(text, times, misses), [text, times, misses]);
  const report = useMemo(() => lapSymbols(text, times, misses), [text, times, misses]);
  const timed = useMemo(() => heat.filter((c) => c.level !== null).length, [heat]);

  const codeRef = useRef(null);
  const caretRef = useRef(null);
  const clockTextRef = useRef(null);
  const spansRef = useRef([]);
  const frameRef = useRef(0);
  const holdRef = useRef(0);
  /* idle → playing ⇄ paused → idle. The clock itself lives in a ref:
     state changes only when the buttons need to. */
  const [mode, setMode] = useState("idle");
  const [speed, setSpeed] = useState(2);
  const speedRef = useRef(speed);
  const clockRef = useRef({ base: 0, at: 0, cursor: 0, elapsed: 0 });

  const lapMs = times.length ? times[times.length - 1] : 0;

  const showClock = useCallback((ms) => {
    if (clockTextRef.current) clockTextRef.current.textContent = `${(ms / 1000).toFixed(1)}s`;
  }, []);

  const placeCaret = useCallback((index) => {
    const caret = caretRef.current;
    const spans = spansRef.current;
    const span = spans[Math.min(index, spans.length - 1)];
    if (!caret || !span) return;
    /* Past the last character, the caret sits after it. */
    const after = index >= spans.length;
    caret.style.transform = `translate(${span.offsetLeft + (after ? span.offsetWidth : 0)}px, ${span.offsetTop}px)`;
    caret.style.height = `${span.offsetHeight}px`;
  }, []);

  const reset = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    clearTimeout(holdRef.current);
    codeRef.current?.classList.remove("is-replaying");
    for (const s of spansRef.current) s?.classList.remove("is-done");
    showClock(lapMs);
    setMode("idle");
  }, [lapMs, showClock]);

  const play = useCallback(() => {
    const c = clockRef.current;
    clearTimeout(holdRef.current);
    if (mode === "idle" || c.cursor >= times.length) {
      /* From the start line. */
      for (const s of spansRef.current) s?.classList.remove("is-done");
      codeRef.current?.classList.add("is-replaying");
      c.base = 0;
      c.cursor = 0;
    } else {
      c.base = c.elapsed;
    }
    c.at = performance.now();
    setMode("playing");

    const step = () => {
      c.elapsed = Math.min(c.base + (performance.now() - c.at) * speedRef.current, lapMs);
      const spans = spansRef.current;
      while (c.cursor < times.length && times[c.cursor] <= c.elapsed) {
        spans[c.cursor]?.classList.add("is-done");
        c.cursor++;
      }
      placeCaret(c.cursor);
      showClock(c.elapsed);
      if (c.cursor >= times.length) {
        /* Hold on the finished lap for a moment, then put it back. */
        holdRef.current = window.setTimeout(reset, 1200);
        return;
      }
      frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  }, [mode, times, lapMs, placeCaret, showClock, reset]);

  const pause = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    setMode("paused");
  }, []);

  /* A speed change mid-replay keeps the caret where it is. */
  const changeSpeed = useCallback(
    (next) => {
      const c = clockRef.current;
      if (mode === "playing") {
        c.base = c.base + (performance.now() - c.at) * speedRef.current;
        c.at = performance.now();
      }
      speedRef.current = next;
      setSpeed(next);
    },
    [mode]
  );

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      clearTimeout(holdRef.current);
    },
    []
  );

  if (timed < MIN_TIMED) return null;

  const slowKeys = report.slow.map((r) => r.key);
  const drillKeys = [...new Set([...slowKeys, ...report.missed.map((r) => r.key)])].slice(0, 5);

  return (
    <section className="lap-review" aria-labelledby="lap-review-title">
      <div className="lap-review-head">
        <div>
          <h3 id="lap-review-title" className="cf-graph-title lap-review-title">Lap review</h3>
          <p className="lap-review-sub">
            Each key is coloured by how long it took. Underlined keys were mistyped.
          </p>
        </div>
        <div className="lap-review-controls">
          <button
            type="button"
            className="lap-review-play"
            onClick={mode === "playing" ? pause : play}
            aria-label={mode === "playing" ? "Pause replay" : mode === "paused" ? "Resume replay" : "Replay this lap"}
          >
            {mode === "playing" ? (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="1.5" width="3" height="9" rx="1" fill="currentColor" /><rect x="7" y="1.5" width="3" height="9" rx="1" fill="currentColor" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.6v8.8a.6.6 0 0 0 .9.5l7-4.4a.6.6 0 0 0 0-1L3.9 1.1a.6.6 0 0 0-.9.5z" fill="currentColor" /></svg>
            )}
            {mode === "playing" ? "Pause" : mode === "paused" ? "Resume" : "Replay"}
          </button>
          <div className="lap-review-speeds" role="group" aria-label="Replay speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                className={`lap-review-speed${speed === s ? " is-active" : ""}`}
                aria-pressed={speed === s}
                onClick={() => changeSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </div>
          <span ref={clockTextRef} className="lap-review-clock" aria-hidden="true">
            {(lapMs / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      <div className="lap-review-code-wrap">
        <pre ref={codeRef} className="lap-review-code" aria-label="Your lap, character by character">
          <span ref={caretRef} className="lap-review-caret" aria-hidden="true" />
          {heat.map((c, i) => (
            <span
              key={i}
              ref={(el) => (spansRef.current[i] = el)}
              className={`lr-c${c.level !== null ? ` h${c.level}` : ""}${c.missed ? " is-missed" : ""}${c.typed ? "" : " is-untyped"}`}
              title={c.dt != null ? `${Math.round(c.dt)} ms${c.missed ? " · mistyped" : ""}` : undefined}
            >
              {c.ch}
            </span>
          ))}
        </pre>
      </div>

      <div className="lap-review-legend" aria-hidden="true">
        <span>Quick</span>
        <i className="lr-c h0" /><i className="lr-c h1" /><i className="lr-c h2" /><i className="lr-c h3" /><i className="lr-c h4" />
        <span>Slow</span>
        <span className="lap-review-legend-miss">mistyped</span>
      </div>

      <div className="symbol-fluency">
        <h4 className="symbol-fluency-title">Symbol fluency</h4>
        {report.slow.length === 0 && report.missed.length === 0 ? (
          <p className="symbol-fluency-note">
            {report.thin
              ? "Too few symbols on this track to judge by — try a heavier one."
              : "No symbol held you up this lap — they kept pace with your letters."}
          </p>
        ) : (
          <div className="symbol-fluency-rows">
            {report.slow.length > 0 && (
              <div className="symbol-fluency-row">
                <span className="symbol-fluency-label">Slowest against your letters</span>
                <ul className="symbol-chips">
                  {report.slow.map((r) => (
                    <li key={r.key} className="symbol-chip">
                      <code>{r.label}</code>
                      <span>{fmtRatio(r.ratio)} slower</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report.missed.length > 0 && (
              <div className="symbol-fluency-row">
                <span className="symbol-fluency-label">Mistyped</span>
                <ul className="symbol-chips">
                  {report.missed.map((r) => (
                    <li key={r.key} className="symbol-chip is-miss">
                      <code>{r.label}</code>
                      <span>{r.misses === 1 ? "once" : `${r.misses} times`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {onDrill && drillKeys.length > 0 && (
          <button
            type="button"
            className="f1-btn secondary symbol-drill-btn"
            onClick={() => onDrill(drillKeys)}
            title={`A track dense in ${drillKeys.join(" ")}`}
          >
            Drill these symbols →
          </button>
        )}
      </div>
    </section>
  );
}
