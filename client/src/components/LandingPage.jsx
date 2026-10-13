import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import BrandLogo from "./BrandLogo";
import Hud from "./landing/Hud";
import Sections from "./landing/Sections";
import { lap, driveStep, LIGHT } from "./landing/lapStore";
import { SECTIONS, quoteAt } from "./landing/content";
import { SCREENS, progressOfS, sOfProgress } from "./landing/scrollMap";
import { S_FINISH, S_STOP, smoothstep } from "./landing/trackLayout";
import { rgbTriplet, watchThemeAccent } from "./landing/themeAccent";
import "./LandingPage.css";

/* ══════════════════════════════════════════════════════════════
   LandingPage — the home page: one hot lap of a night circuit,
   driven by the scrollbar.

   ── How it hangs together ─────────────────────────────────────
   The document is a tall, empty spacer; everything you see is
   fixed to the viewport. Scrolling only sets `lap.target`, which
   landing/scrollMap.js turns into metres round the lap — slowly
   while a panel is up, so a nudge of the wheel never runs the text
   off the screen. One
   frame loop (below) runs that through a critically damped spring
   into `lap.progress`, derives speed, the start-light state and
   the lap clock, then pushes the result into the HUD and the copy
   panels through refs. The 3D scene reads the same `lap` object
   from its own useFrame. Nothing re-renders while you scroll.

   ── The three lights ──────────────────────────────────────────
   Kept from the original page: RED while the car sits on the grid,
   GREEN while it is moving, AMBER (yellow flag) once it has been
   stopped somewhere on the lap for 150 ms.

   ── Without WebGL ─────────────────────────────────────────────
   The HUD and every panel still work — they never depended on the
   canvas — over a static backdrop instead of the circuit.
   ══════════════════════════════════════════════════════════════ */

const LandingScene = lazy(() => import("./landing/LandingScene"));

const OMEGA = 4.2; // spring stiffness — ~0.9 s to settle
const OMEGA_REDUCED = 10;
const PAUSE_MS = 150; // stopped this long → yellow flag

/* The car's limits (see driveStep). A flick of the wheel or a dragged
   scrollbar can ask for a thousand metres a second; the car tops out
   at a fast but believable pace instead — the speedo, the gears and
   the speed blur are all built around ~330 km/h. */
const V_HAND = 130; // m/s top speed under the scrollbar
const V_JUMP = 260; // m/s: a jump from the chapter rail may run harder
const THROTTLE = 180; // m/s², tailing off toward top speed
const BRAKE = 280; // m/s²

/* Autopilot ("Watch the full lap") pace, in metres per second:
   brisk between set pieces, slow enough to read each panel through
   (about eight seconds a panel; the whole lap takes a minute). */
const PACE_OPEN = 115;
const PACE_READ = 26;
const QUOTE_HOLD = 3.6; // seconds the tour spends on each quote (~2.4 s fully up)

/* A chapter jump farther than this is a cut, the way television does
   it — fade to black, move the car, fade back — rather than a long
   drive or a blur. With reduced motion every jump is a cut. */
const CUT_FROM = 450; // metres
const CUT_OUT = 0.22; // seconds to black
const CUT_IN = 0.45; // seconds back

/* Chapter jumps: metres per second, scaled by the distance left —
   never faster than the car itself may go on a jump. */
const JUMP_MIN = 60;
const JUMP_MAX = V_JUMP;
const JUMP_EASE = 2.4;

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/* How much any copy panel is on screen at distance s (0–1). */
function readingWeight(s) {
  let w = 0;
  for (const sec of SECTIONS) {
    if (sec.hero || sec.finale) continue;
    const [a, b] = sec.at;
    w = Math.max(w, smoothstep(a, a + 30, s) * (1 - smoothstep(b - 30, b, s)));
  }
  return w;
}

/* If the scene throws (a driver that loses the context mid-load, a
   blocked model download), the page carries on without it. */
class SceneBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.warn("[landing] 3D scene unavailable:", error);
    this.props.onFail?.();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* Lights-sequence loading screen, shown until the car is on the grid.
   Its percentage comes up from the scene (LandingScene's
   ProgressBridge), so this page needs nothing from three.js to show
   it — it is on screen while the 3D libraries are still arriving. */
function Loader({ done, progress }) {
  const pct = Math.round(progress);
  return (
    <div className={`lp-loader${done ? " is-done" : ""}`} aria-hidden={done} role="status">
      <BrandLogo tone="light" alt="CodeCaret" className="lp-loader-logo" />
      <div className="lp-loader-lights" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} style={{ "--i": i }} />
        ))}
      </div>
      <p className="lp-loader-label">
        Warming the tyres <b>{String(pct).padStart(2, "0")}%</b>
      </p>
      <div className="lp-loader-bar">
        <i style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const rootRef = useRef(null);
  const hudRef = useRef(null);
  const sectionsRef = useRef(null);
  const curtainRef = useRef(null);
  /* null, or where the page is driving itself to: the whole lap at
     reading pace ("Watch the full lap"), or one chapter of it — and
     which panel to hand keyboard focus to on arrival. */
  const autopilot = useRef(null);
  const [webgl] = useState(webglAvailable);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const show3D = webgl && !sceneFailed;

  /* ── Theme accent → the page's CSS (the scene syncs its own) ─── */
  useEffect(() => {
    const root = rootRef.current;
    return watchThemeAccent((hex) => {
      root?.style.setProperty("--lp-accent", hex);
      root?.style.setProperty("--lp-accent-rgb", rgbTriplet(hex));
    });
  }, []);

  /* Never strand the visitor behind the loader: if the model is slow
     (or its decoder is blocked) the circuit shows without it. */
  useEffect(() => {
    if (!show3D) return undefined;
    const id = setTimeout(() => setReady(true), 15000);
    return () => clearTimeout(id);
  }, [show3D]);

  /* ── The frame loop ─────────────────────────────────────────── */
  useEffect(() => {
    const html = document.documentElement;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => {
      lap.reduced = motion.matches;
    };
    onMotion();
    motion.addEventListener?.("change", onMotion);

    let maxScroll = 1;
    let lastScrollAt = -Infinity;
    let lastMoveAt = -Infinity;
    /* A chapter jump being driven: the car may run at V_JUMP until it
       arrives, or until a hand takes the controls back. */
    let jump = null;
    /* A long jump being cut: { to, focus, t, moved }. */
    let cut = null;
    /* A panel to focus once this frame's panels are drawn. */
    let focusNext = null;
    const measure = () => {
      maxScroll = Math.max(1, html.scrollHeight - window.innerHeight);
    };
    const read = () => {
      lap.target = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    };
    measure();
    read();

    /* Start wherever the page already is (a reload mid-lap restores
       the scroll position) rather than driving there from the grid. */
    lap.progress = lap.target;
    lap.velocity = 0;
    lap.s = sOfProgress(lap.progress);
    lap.speed = 0;
    lap.accel = 0;
    lap.time = 0;
    lap.lapTime = 0;
    lap.light = lap.target <= 0.0015 ? "red" : "amber";
    lap.finishedAt = lap.s >= S_FINISH ? 0 : -1;
    /* Dev only: lets a test harness pose the lap directly. */
    if (import.meta.env.DEV) {
      window.__ccLap = lap;
      window.__ccMap = { progressOfS, sOfProgress };
    }

    const onScroll = () => {
      read();
      lastScrollAt = performance.now();
    };
    const onResize = () => {
      measure();
      read();
    };
    /* Any hand on the controls takes over from the autopilot. */
    const takeOver = () => {
      autopilot.current = null;
      jump = null;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("wheel", takeOver, { passive: true });
    window.addEventListener("touchstart", takeOver, { passive: true });
    window.addEventListener("keydown", takeOver);

    let raf = 0;
    let prev = performance.now();
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0.0001, (now - prev) / 1000));
      prev = now;

      const ap = autopilot.current;
      if (ap && !ap.tour && !cut && (lap.reduced || Math.abs(ap.to - sOfProgress(lap.target)) > CUT_FROM)) {
        cut = { to: ap.to, focus: ap.focus, t: 0, moved: false };
        autopilot.current = null;
        jump = null;
      }
      if (cut) {
        cut.t += dt;
        if (!cut.moved && cut.t >= CUT_OUT) {
          /* Black: move everything while nobody can see. */
          const p = progressOfS(cut.to);
          window.scrollTo({ top: p * maxScroll, behavior: "instant" });
          lap.target = lap.progress = p;
          lap.velocity = lap.speed = 0;
          cut.moved = true;
          focusNext = cut.focus;
        }
        const black = cut.t < CUT_OUT ? cut.t / CUT_OUT : 1 - (cut.t - CUT_OUT) / CUT_IN;
        if (curtainRef.current) curtainRef.current.style.opacity = String(Math.min(1, Math.max(0, black)));
        if (cut.t >= CUT_OUT + CUT_IN) cut = null;
      } else if (ap) {
        const s = sOfProgress(lap.target);
        const gap = ap.to - s;
        /* A tour holds reading pace through each panel; a jump runs
           fast and eases in, so the car arrives rather than teleports. */
        const quote = ap.tour ? quoteAt(s) : null;
        const pace = quote
          ? Math.max(4, (quote.at[1] - quote.at[0]) / QUOTE_HOLD)
          : ap.tour
            ? PACE_OPEN + (PACE_READ - PACE_OPEN) * readingWeight(s)
            : Math.min(JUMP_MAX, Math.max(JUMP_MIN, Math.abs(gap) * JUMP_EASE));
        const next = s + Math.sign(gap) * Math.min(Math.abs(gap), pace * dt);
        if (!ap.tour && !jump) jump = { focus: ap.focus };
        if (Math.abs(ap.to - next) < 0.05) autopilot.current = null;
        window.scrollTo({ top: progressOfS(next) * maxScroll, behavior: "instant" });
      }
      lap.autopilot = autopilot.current?.tour ? "tour" : null;

      lap.dt = dt;
      lap.time += dt;
      const goal = sOfProgress(lap.target);
      /* From progress, not lap.s: a cut (above) moves progress alone. */
      let [s, v] = driveStep(sOfProgress(lap.progress), lap.speed, goal, lap.reduced ? OMEGA_REDUCED : OMEGA, dt, {
        vMax: jump ? V_JUMP : V_HAND,
        throttle: THROTTLE,
        brake: BRAKE,
      });
      if (Math.abs(goal - s) < 0.005 && Math.abs(v) < 0.05) {
        s = goal;
        v = 0;
      }
      if (jump && !autopilot.current && Math.abs(goal - s) < 1 && Math.abs(v) < 3) {
        focusNext = jump.focus;
        jump = null;
      }
      const prevSpeed = lap.speed;
      const progress = progressOfS(s);
      lap.velocity = (progress - lap.progress) / dt;
      lap.progress = progress;
      lap.s = s;
      lap.speed = v;
      lap.accel += ((lap.speed - prevSpeed) / dt - lap.accel) * Math.min(1, dt * 5);

      /* The three lights. */
      const moving = Math.abs(lap.speed) > 0.6 || now - lastScrollAt < PAUSE_MS;
      if (lap.target <= 0.0015 && lap.progress <= 0.004) {
        lap.light = "red";
        lap.lapTime = 0;
      } else if (moving) {
        lap.light = "green";
        lastMoveAt = now;
      } else if (now - lastMoveAt > PAUSE_MS) {
        lap.light = "amber";
      }
      if (lap.light === "green") lap.lapTime += dt;

      /* Chequered flag: once per crossing, re-armed if you back off. */
      if (lap.finishedAt < 0 && lap.s >= S_FINISH && lap.speed > 0) lap.finishedAt = lap.time;
      else if (lap.finishedAt >= 0 && lap.s < S_FINISH - 40) lap.finishedAt = -1;

      hudRef.current?.update(lap);
      sectionsRef.current?.update(lap);
      /* A jump made from the keyboard ends with focus on the panel it
         went to, so a screen reader announces where you are. */
      if (focusNext) {
        sectionsRef.current?.focusPanel(focusNext);
        focusNext = null;
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      autopilot.current = null;
      motion.removeEventListener?.("change", onMotion);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", takeOver);
      window.removeEventListener("touchstart", takeOver);
      window.removeEventListener("keydown", takeOver);
    };
  }, []);

  const watchLap = useCallback(() => {
    autopilot.current = { to: S_STOP, tour: true };
  }, []);

  const jumpTo = useCallback((s, focus = null) => {
    autopilot.current = { to: Math.min(S_STOP, s), tour: false, focus };
  }, []);

  const stopAutopilot = useCallback(() => {
    autopilot.current = null;
  }, []);

  /* Once the circuit is up, fetch the simulator's code in the
     background, so "Start racing" opens it straight away. Not on a
     metered connection that asked to save data. */
  useEffect(() => {
    if (!(ready || !show3D) || navigator.connection?.saveData) return undefined;
    const id = setTimeout(() => {
      import("./TestTypingSandbox").catch(() => {});
    }, 1500);
    return () => clearTimeout(id);
  }, [ready, show3D]);

  const onSceneReady = useCallback(() => setReady(true), []);
  const onSceneFail = useCallback(() => setSceneFailed(true), []);

  return (
    <div
      ref={rootRef}
      className={`lp-root${show3D ? "" : " lp-no-gl"}`}
      style={{ "--lp-screens": SCREENS }}
      data-light={LIGHT.red.id}
    >
      <div className="lp-stage" aria-hidden="true">
        {show3D ? (
          <SceneBoundary onFail={onSceneFail}>
            <Suspense fallback={null}>
              <LandingScene onReady={onSceneReady} onProgress={setLoaded} />
            </Suspense>
          </SceneBoundary>
        ) : (
          <div className="lp-poster" />
        )}
      </div>

      <Sections ref={sectionsRef} signedIn={Boolean(user)} onSkip={watchLap} />
      {/* Fades the circuit and the copy to black for a cut; the HUD
          stays up, like a broadcast cutting between cameras. */}
      <div className="lp-curtain" ref={curtainRef} aria-hidden="true" />
      <Hud ref={hudRef} signedIn={Boolean(user)} onJump={jumpTo} onStop={stopAutopilot} />

      {show3D && <Loader done={ready} progress={loaded} />}

      {/* The scrollbar: an empty spacer the height of the lap. */}
      <div className="lp-spacer" aria-hidden="true" />
    </div>
  );
}
