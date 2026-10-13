import { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../BrandLogo";
import { LIGHT } from "./lapStore";
import { RADIO, SECTIONS, SECTORS, quoteAt } from "./content";
import { ghostLead, ghostVisibility } from "./choreography";
import { S_POLE, S_FINISH, S1_END, S2_END, TRACK_LENGTH, planAt, planPolyline } from "./trackLayout";

/* ══════════════════════════════════════════════════════════════
   Hud — the telemetry overlay: start lights, speed and gear, lap
   clock, sector timing, minimap and team radio.

   Nothing here re-renders while the page scrolls. The page's frame
   loop calls `update(lap)` through the ref, and every write is a
   textContent / attribute / style change on a node that is already
   there — and only when the shown value actually changes. (Opening
   the stops menu is the one thing that renders.)

   All of it is decoration for sighted visitors — the copy panels
   carry the content — so none of it is a live region: a screen
   reader would otherwise announce every flag as the lights change.
   ══════════════════════════════════════════════════════════════ */

const SHIFT_LEDS = 15;
const GEAR_TOP = [0, 18, 30, 42, 54, 66, 78, 90]; // m/s where each gear tops out
const MAP_W = 220;
const MAP_H = 128;

/* A speedo that keeps climbing but never runs away: real speed is
   whatever the scroll wheel says, which can be thousands of km/h. */
const displayKmh = (ms) => 352 * Math.tanh((Math.abs(ms) * 3.6) / 352);

function gearFor(speed) {
  const v = Math.abs(speed);
  if (v < 0.4) return ["N", 0];
  if (speed < 0) return ["R", Math.min(1, v / 12)];
  for (let g = 1; g < GEAR_TOP.length; g++) {
    if (v < GEAR_TOP[g] || g === GEAR_TOP.length - 1) {
      const lo = GEAR_TOP[g - 1];
      return [String(g), Math.min(1, (v - lo) / (GEAR_TOP[g] - lo))];
    }
  }
  return ["8", 1];
}

const pad = (n, w) => String(n).padStart(w, "0");
function formatLap(t) {
  const ms = Math.floor(t * 1000);
  return `${Math.floor(ms / 60000)}:${pad(Math.floor(ms / 1000) % 60, 2)}.${pad(ms % 1000, 3)}`;
}

/* The track in plan view, fitted to the minimap box. */
function useMinimap() {
  return useMemo(() => {
    const pts = planPolyline(6);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i]);
      minZ = Math.min(minZ, pts[i + 1]); maxZ = Math.max(maxZ, pts[i + 1]);
    }
    const padPx = 10;
    const k = Math.min((MAP_W - padPx * 2) / (maxX - minX), (MAP_H - padPx * 2) / (maxZ - minZ));
    const ox = (MAP_W - (maxX - minX) * k) / 2 - minX * k;
    const oz = (MAP_H - (maxZ - minZ) * k) / 2 - minZ * k;
    const map = (x, z) => [x * k + ox, z * k + oz];
    let d = "";
    for (let i = 0; i < pts.length; i += 2) {
      const [x, y] = map(pts[i], pts[i + 1]);
      d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    const tmp = [0, 0];
    const at = (s) => {
      planAt(s, tmp);
      return map(tmp[0], tmp[1]);
    };
    return { d, at, marks: { start: at(S_POLE + 10), finish: at(S_FINISH), s1: at(S1_END), s2: at(S2_END) } };
  }, []);
}

/* The chapter rail: one stop per copy panel, labelled the way the
   panels are. Where each one sends you is the point at which its
   panel is fully up. */
const CHAPTERS = SECTIONS.map((sec) => ({
  id: sec.id,
  label: sec.hero ? "The grid" : sec.finale ? "Chequered flag" : sec.tag,
  from: sec.at[0],
  to: sec.at[1],
  goto: sec.hero ? S_POLE : sec.finale ? Infinity : sec.at[0] + 34,
}));

/* A jump made from the keyboard (a click with no pointer behind it)
   hands focus to the panel it lands on. */
const focusFor = (event, id) => (event.detail === 0 ? id : null);

export default function Hud({ ref, signedIn, onJump, onStop }) {
  const minimap = useMinimap();
  const el = useRef({});
  const last = useRef({});
  const radio = useRef({ played: new Set(), until: 0 });
  const stops = useRef(null);
  const [stopsOpen, setStopsOpen] = useState(false);
  const bind = (key) => (node) => {
    el.current[key] = node;
  };

  /* The stops menu: focus the stop you are at when it opens; Escape
     or a tap anywhere else closes it. */
  useEffect(() => {
    if (!stopsOpen) return undefined;
    const root = stops.current;
    const here =
      root?.querySelector('.lp-stop[data-state="live"]') ??
      [...(root?.querySelectorAll('.lp-stop[data-state="done"]') ?? [])].pop() ??
      root?.querySelector(".lp-stop");
    here?.focus();
    const onPointer = (e) => {
      if (root && !root.contains(e.target)) setStopsOpen(false);
    };
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setStopsOpen(false);
      root?.querySelector(".lp-stops-btn")?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [stopsOpen]);

  /* The logo goes back to the grid: this page is already home. A
     modified click still opens it however the visitor asked. */
  const toGrid = (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onJump?.(S_POLE, focusFor(e, "grid"));
  };

  useImperativeHandle(ref, () => ({
    update(lap) {
      const e = el.current;
      const prev = last.current;
      const set = (key, value, write) => {
        if (prev[key] === value) return;
        prev[key] = value;
        write(value);
      };

      /* Telemetry comes up once the car leaves the grid. */
      set("phase", lap.light === "red" && lap.s < S_POLE + 2 ? "grid" : "lap", (v) => {
        if (e.root) e.root.dataset.phase = v;
      });

      /* Start lights. */
      set("light", lap.light, (v) => {
        if (e.lights) e.lights.dataset.state = v;
        if (e.lightLabel) e.lightLabel.textContent = LIGHT[v].label;
      });

      /* Speed, gear, shift lights. */
      const kmh = Math.round(displayKmh(lap.speed));
      set("kmh", kmh, (v) => {
        if (e.speed) e.speed.textContent = pad(v, 3);
        if (e.speedBar) e.speedBar.style.transform = `scaleX(${(v / 352).toFixed(3)})`;
      });
      const [gear, rpm] = gearFor(lap.speed);
      set("gear", gear, (v) => e.gear && (e.gear.textContent = v));
      const leds = Math.round(rpm * SHIFT_LEDS);
      set("leds", leds, (v) => e.shift?.style.setProperty("--on", String(v)));

      set("lapTime", formatLap(lap.lapTime), (v) => e.lapTime && (e.lapTime.textContent = v));
      /* Past the flag the car rolls on to a stop; the lap is done. */
      const km = Math.min(S_FINISH - S_POLE, Math.max(0, lap.s - S_POLE)) / 1000;
      set("km", km.toFixed(2), (v) => e.km && (e.km.textContent = v));

      /* Sectors: done ones go purple, like a timing screen's best. */
      SECTORS.forEach((sec, i) => {
        const state = lap.s >= sec.to ? "done" : lap.s >= sec.from && lap.light !== "red" ? "live" : "idle";
        set(`sector${i}`, state, (v) => e[`sector${i}`] && (e[`sector${i}`].dataset.state = v));
      });

      /* Chapter rail and stops menu: where the lap is, and what is
         behind it. */
      let here = 0;
      CHAPTERS.forEach((ch, i) => {
        if (lap.s >= ch.from) here = i;
        const state = lap.s >= ch.from && lap.s <= ch.to ? "live" : lap.s > ch.to ? "done" : "idle";
        set(`chapter${i}`, state, (v) => {
          for (const node of [e[`chapter${i}`], e[`stop${i}`]]) {
            if (!node) continue;
            node.dataset.state = v;
            if (v === "live") node.setAttribute("aria-current", "step");
            else node.removeAttribute("aria-current");
          }
        });
      });
      set("here", here, (v) => e.stopsNow && (e.stopsNow.textContent = pad(v + 1, 2)));

      /* "Watch the full lap" is driving: say so, and offer the brakes. */
      set("autopilot", lap.autopilot === "tour", (on) => {
        if (!e.autopilot) return;
        e.autopilot.dataset.on = on ? "1" : "0";
        e.autopilot.inert = !on;
      });

      /* Minimap: car dot, ghost dot and the lap so far. */
      const [cx, cy] = minimap.at(lap.s);
      set("car", `${cx.toFixed(1)},${cy.toFixed(1)}`, () => {
        e.mapCar?.setAttribute("transform", `translate(${cx.toFixed(1)} ${cy.toFixed(1)})`);
      });
      const done = Math.max(0, lap.s - S_POLE) / TRACK_LENGTH;
      set("trail", done.toFixed(4), (v) => {
        if (e.mapTrail) e.mapTrail.style.strokeDasharray = `0 ${(S_POLE / TRACK_LENGTH).toFixed(4)} ${v} 2`;
      });
      const gv = ghostVisibility(lap.s);
      set("ghostOn", gv > 0.05, (on) => e.mapGhost?.setAttribute("opacity", on ? "1" : "0"));
      if (gv > 0.05) {
        const [gx, gy] = minimap.at(lap.s + ghostLead(lap.s));
        e.mapGhost?.setAttribute("transform", `translate(${gx.toFixed(1)} ${gy.toFixed(1)})`);
      }

      set("progress", lap.progress.toFixed(4), (v) => {
        if (e.progress) e.progress.style.transform = `scaleX(${v})`;
      });

      /* Team radio: each line once per visit, going forward. */
      const r = radio.current;
      if (lap.speed > 0.5) {
        for (const msg of RADIO) {
          if (!r.played.has(msg.at) && lap.s >= msg.at && lap.s < msg.at + 160) {
            r.played.add(msg.at);
            r.until = lap.time + 4.2;
            if (e.radioText) e.radioText.textContent = `“${msg.text}”`;
          }
        }
      }
      set("radioOn", lap.time < r.until && !quoteAt(lap.s), (on) => e.radio && (e.radio.dataset.on = on ? "1" : "0"));
    },
  }));

  return (
    <div className="lp-hud" ref={bind("root")} data-phase="grid">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="lp-topbar">
        <Link to="/" className="lp-brand" aria-label="CodeCaret — back to the start" onClick={toGrid}>
          <BrandLogo tone="light" alt="" className="lp-brand-logo" />
        </Link>

        {/* The three lights: red on the grid, green while the car is
            moving, amber once it has stopped somewhere on the lap. */}
        <div className="lp-lights" ref={bind("lights")} data-state="red" aria-hidden="true">
          <div className="lp-lights-pod" aria-hidden="true">
            <span className="lp-light" />
            <span className="lp-light" />
            <span className="lp-light" />
          </div>
          <span className="lp-lights-label" ref={bind("lightLabel")}>
            {LIGHT.red.label}
          </span>
        </div>

        <nav className="lp-nav" aria-label="Main">
          <Link to="/standings" className="lp-nav-link">
            Standings
          </Link>
          <Link to={signedIn ? "/profile" : "/signin"} className="lp-nav-link">
            {signedIn ? "Profile" : "Sign in"}
          </Link>
          <Link to="/test" className="lp-nav-cta">
            Start racing
          </Link>
        </nav>
      </header>

      {/* ── Autopilot: "Watch the full lap" is at the wheel ───── */}
      <div className="lp-autopilot" ref={bind("autopilot")} data-on="0" inert>
        <span className="lp-autopilot-dot" aria-hidden="true" />
        Autopilot
        <button type="button" className="lp-autopilot-stop" onClick={onStop}>
          Stop
        </button>
      </div>

      {/* ── Team radio ──────────────────────────────────────── */}
      <div className="lp-radio" ref={bind("radio")} data-on="0" aria-hidden="true">
        <div className="lp-radio-head">
          <span className="lp-radio-dot" aria-hidden="true" />
          Team radio
          <span className="lp-radio-wave" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <i key={i} style={{ "--i": i }} />
            ))}
          </span>
        </div>
        <p className="lp-radio-text" ref={bind("radioText")} />
      </div>

      {/* ── Chapter rail: jump to any stop on the lap ────────── */}
      <nav className="lp-chapters" aria-label="Stops on the lap">
        <ol>
          {CHAPTERS.map((ch, i) => (
            <li key={ch.id}>
              <button
                type="button"
                className="lp-chapter"
                ref={bind(`chapter${i}`)}
                data-state={i === 0 ? "live" : "idle"}
                onClick={(e) => onJump?.(ch.goto, focusFor(e, ch.id))}
              >
                <span className="lp-chapter-label">{ch.label}</span>
                <span className="lp-chapter-dot" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── Stops menu: the rail, for screens too narrow for it ──
          (and, on a phone, the top bar's links too). */}
      <div className="lp-stops" ref={stops} data-open={stopsOpen ? "1" : "0"}>
        <nav id="lp-stops-menu" className="lp-stops-menu" aria-label="Stops on the lap" hidden={!stopsOpen}>
          <ol>
            {CHAPTERS.map((ch, i) => (
              <li key={ch.id}>
                <button
                  type="button"
                  className="lp-stop"
                  ref={bind(`stop${i}`)}
                  data-state={i === 0 ? "live" : "idle"}
                  onClick={(e) => {
                    setStopsOpen(false);
                    onJump?.(ch.goto, focusFor(e, ch.id));
                  }}
                >
                  <span className="lp-stop-n" aria-hidden="true">
                    {pad(i + 1, 2)}
                  </span>
                  {ch.label}
                </button>
              </li>
            ))}
          </ol>
          <div className="lp-stops-links">
            <Link to="/standings">Standings</Link>
            <Link to={signedIn ? "/profile" : "/signin"}>{signedIn ? "Profile" : "Sign in"}</Link>
          </div>
        </nav>
        <button
          type="button"
          className="lp-stops-btn"
          aria-expanded={stopsOpen}
          aria-controls="lp-stops-menu"
          onClick={() => setStopsOpen((open) => !open)}
        >
          <span className="lp-stops-icon" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="lp-stops-label">Stops</span>
          <span className="lp-stops-count" aria-hidden="true">
            <b ref={bind("stopsNow")}>01</b> / {pad(CHAPTERS.length, 2)}
          </span>
        </button>
      </div>

      {/* ── Steering-wheel display ───────────────────────────── */}
      <div className="lp-dash" aria-hidden="true">
        <div className="lp-shift" ref={bind("shift")} style={{ "--on": 0 }}>
          {Array.from({ length: SHIFT_LEDS }, (_, i) => (
            <i key={i} style={{ "--i": i }} />
          ))}
        </div>
        <div className="lp-dash-main">
          <div className="lp-speed">
            <span className="lp-speed-value" ref={bind("speed")}>
              000
            </span>
            <span className="lp-speed-unit">km/h</span>
          </div>
          <div className="lp-gear">
            <span className="lp-gear-label">Gear</span>
            <span className="lp-gear-value" ref={bind("gear")}>
              N
            </span>
          </div>
        </div>
        <div className="lp-speed-bar">
          <i ref={bind("speedBar")} />
        </div>
        <div className="lp-dash-row">
          <span>
            Lap <b ref={bind("lapTime")}>0:00.000</b>
          </span>
          <span>
            <b ref={bind("km")}>0.00</b> / {((S_FINISH - S_POLE) / 1000).toFixed(2)} km
          </span>
        </div>
      </div>

      {/* ── Minimap and sector timing ────────────────────────── */}
      <div className="lp-map" aria-hidden="true">
        <div className="lp-map-head">
          <span>Circuit</span>
          <span className="lp-sectors">
            {SECTORS.map((sec, i) => (
              <span key={sec.id} className="lp-sector" ref={bind(`sector${i}`)} data-state="idle">
                S{sec.id}
              </span>
            ))}
          </span>
        </div>
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="lp-map-svg">
          <path d={minimap.d} className="lp-map-track" />
          <path d={minimap.d} className="lp-map-trail" ref={bind("mapTrail")} pathLength="1" />
          {["s1", "s2"].map((k) => (
            <circle key={k} cx={minimap.marks[k][0]} cy={minimap.marks[k][1]} r="2.2" className="lp-map-sector" />
          ))}
          <g transform={`translate(${minimap.marks.start[0]} ${minimap.marks.start[1]})`}>
            <rect x="-3" y="-5" width="6" height="10" className="lp-map-start" />
          </g>
          <g transform={`translate(${minimap.marks.finish[0]} ${minimap.marks.finish[1]})`}>
            <rect x="-4" y="-4" width="4" height="4" fill="#fff" />
            <rect x="0" y="0" width="4" height="4" fill="#fff" />
            <rect x="0" y="-4" width="4" height="4" fill="#111" />
            <rect x="-4" y="0" width="4" height="4" fill="#111" />
          </g>
          <g ref={bind("mapGhost")} opacity="0">
            <circle r="3.6" className="lp-map-ghost" />
          </g>
          <g ref={bind("mapCar")}>
            <circle r="7" className="lp-map-car-halo" />
            <circle r="3.6" className="lp-map-car" />
          </g>
        </svg>
        <div className="lp-map-foot">
          <span className="lp-map-legend">
            <i data-k="you" />
            You
          </span>
          <span className="lp-map-legend">
            <i data-k="ghost" />
            Ghost · PB
          </span>
          <span className="lp-map-len">{((S_FINISH - S_POLE) / 1000).toFixed(2)} km</span>
        </div>
      </div>

      <div className="lp-progress" aria-hidden="true">
        <i ref={bind("progress")} />
      </div>
    </div>
  );
}
