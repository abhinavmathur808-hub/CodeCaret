import { useImperativeHandle, useRef } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../BrandLogo";
import { PANEL_FADE as FADE, QUOTES, SECTIONS } from "./content";
import { smoothstep } from "./trackLayout";

/* ══════════════════════════════════════════════════════════════
   Sections — the copy, one panel per stretch of the lap.

   Every panel is in the DOM from the start, in reading order, so
   screen readers and search engines get the whole page; the frame
   loop only drives a single custom property, --v (0 → 1), and CSS
   turns that into the staggered reveal. A panel that is off screen
   is also `inert`, so Tab never lands on a link nobody can see.

   The copy sits on solid glass cards rather than straight on the
   scene: a night circuit full of red light is a hostile background
   for red and white text, and a card keeps the contrast the same
   whatever the camera happens to be looking at.
   ══════════════════════════════════════════════════════════════ */

const STOPS = SECTIONS.length;
const pad2 = (n) => String(n).padStart(2, "0");

function Chips({ items, start }) {
  if (!items) return null;
  return (
    <ul className="lp-chips" style={{ "--i": start }}>
      {items.map((c) => (
        <li key={c} className="lp-chip">
          {c}
        </li>
      ))}
    </ul>
  );
}

function Hero({ sec, onSkip }) {
  return (
    <div className="lp-sec-inner">
      <h1 className="lp-hero-logo" style={{ "--i": 0 }}>
        <BrandLogo tone="light" alt="CodeCaret" className="lp-hero-logo-img" fetchPriority="high" />
      </h1>
      <div className="lp-card lp-card-hero" style={{ "--i": 1 }} tabIndex={-1}>
        <p className="lp-kicker" style={{ "--i": 0 }}>
          <span className="lp-kicker-dot" aria-hidden="true" />
          {sec.kicker}
        </p>
        <p className="lp-hero-tagline" style={{ "--i": 1 }}>
          {sec.tagline}
        </p>
        <p className="lp-body" style={{ "--i": 2 }}>
          {sec.body}
        </p>
        <div className="lp-hero-actions" style={{ "--i": 3 }}>
          <Link to="/test" className="lp-btn lp-btn-primary">
            Start racing
            <span aria-hidden="true">→</span>
          </Link>
          <button type="button" className="lp-btn lp-btn-ghost" onClick={onSkip}>
            Watch the full lap
          </button>
        </div>
        <div className="lp-scroll-hint" style={{ "--i": 4 }} aria-hidden="true">
          <span className="lp-mouse">
            <i />
          </span>
          {/* One flex item, so the row's gap does not split the words. */}
          <span>
            <span className="lp-hint-mouse">Scroll</span>
            <span className="lp-hint-touch">Swipe up</span> to go green
          </span>
        </div>
      </div>
    </div>
  );
}

function Finale({ sec, signedIn }) {
  return (
    <div className="lp-sec-inner">
      <div className="lp-card lp-card-finale" style={{ "--i": 0 }} tabIndex={-1}>
        <p className="lp-tag lp-tag-finale" style={{ "--i": 0 }}>
          <span className="lp-flag" aria-hidden="true" />
          {sec.tag}
        </p>
        <h2 className="lp-title lp-title-xl" style={{ "--i": 1 }}>
          {sec.title} <em>{sec.em}</em>
        </h2>
        <p className="lp-body" style={{ "--i": 2 }}>
          {sec.body}
        </p>
        <div className="lp-finale-actions" style={{ "--i": 3 }}>
          <Link to="/test" className="lp-btn lp-btn-primary lp-btn-lg" id="start-racing-btn">
            Start racing
            <span aria-hidden="true">→</span>
          </Link>
          <Link to={signedIn ? "/profile" : "/signup"} className="lp-btn lp-btn-ghost lp-btn-lg">
            {signedIn ? "Your profile" : "Create an account"}
          </Link>
        </div>
        {!signedIn && (
          <p className="lp-finale-note" style={{ "--i": 4 }}>
            Already racing? <Link to="/signin">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}

function Feature({ sec, index }) {
  return (
    <div className="lp-sec-inner">
      <article className="lp-card" style={{ "--i": 0 }} tabIndex={-1} aria-labelledby={`lp-${sec.id}-title`}>
        <header className="lp-card-head" style={{ "--i": 0 }}>
          <span className="lp-sector-badge">S{sec.sector}</span>
          <span className="lp-tag">{sec.tag}</span>
          <span className="lp-step" aria-label={`Stop ${index + 1} of ${STOPS}`}>
            {pad2(index + 1)}
            <i>/</i>
            {pad2(STOPS)}
          </span>
        </header>
        <h2 className="lp-title" style={{ "--i": 1 }} id={`lp-${sec.id}-title`}>
          {sec.title} <em>{sec.em}</em>
        </h2>
        <p className="lp-body" style={{ "--i": 2 }}>
          {sec.body}
        </p>
        <Chips items={sec.chips} start={3} />
        {sec.stat && (
          <p className="lp-stat" style={{ "--i": 4 }}>
            <b>{sec.stat[0]}</b>
            <span>{sec.stat[1]}</span>
          </p>
        )}
      </article>
    </div>
  );
}

/* A quote: a big two-line headline between stops, its second line in
   the accent, and who says it underneath in the logo's lettering. */
function Quote({ q }) {
  return (
    <figure className="lp-quote-inner">
      <span className="lp-quote-mark" aria-hidden="true" style={{ "--i": 0 }}>
        “
      </span>
      <blockquote className="lp-quote-text">
        <p>
          <span style={{ "--i": 1 }}>{q.line}</span> <em style={{ "--i": 2 }}>{q.em}</em>
        </p>
      </blockquote>
      <figcaption className="lp-quote-by" style={{ "--i": 3 }}>
        — {q.by}
      </figcaption>
    </figure>
  );
}

/* Panels and quotes in the order the lap reaches them, so the page
   also reads in order without the scene. */
const ITEMS = [
  ...SECTIONS.map((sec, i) => ({ quote: false, from: sec.at[0], i })),
  ...QUOTES.map((q, i) => ({ quote: true, from: q.at[0], i })),
].sort((x, y) => x.from - y.from);

/* How far into its stretch a quote fades in, and out again. */
const quoteRamp = (a, b) => Math.max(4, (b - a) * 0.28);

export default function Sections({ ref, signedIn, onSkip }) {
  const nodes = useRef([]);
  const shown = useRef([]);
  const quoteNodes = useRef([]);
  const quoteShown = useRef([]);

  useImperativeHandle(ref, () => ({
    /* After a jump from the keyboard: focus lands on the panel's card,
       so a screen reader reads where you are, and Tab carries on from
       there. Its panel is already up (and no longer inert) by now. */
    focusPanel(id) {
      const i = SECTIONS.findIndex((sec) => sec.id === id);
      nodes.current[i]?.querySelector(".lp-card")?.focus({ preventScroll: true });
    },
    update(lap) {
      for (let i = 0; i < SECTIONS.length; i++) {
        const node = nodes.current[i];
        if (!node) continue;
        const [a, b] = SECTIONS[i].at;
        const vin = SECTIONS[i].hero ? 1 : smoothstep(a, a + FADE, lap.s);
        const vout = b === Infinity ? 1 : 1 - smoothstep(b - FADE, b, lap.s);
        const v = Math.round(vin * vout * 1000) / 1000;
        if (shown.current[i] === v) continue;
        shown.current[i] = v;
        node.style.setProperty("--v", String(v));
        node.dataset.shown = v > 0.001 ? "1" : "0";
        node.inert = v < 0.6;
      }

      /* Quotes: the same --v, plus --u, how far through its stretch
         the car is (0 → 1), which the CSS turns into a slow drift. */
      for (let i = 0; i < QUOTES.length; i++) {
        const node = quoteNodes.current[i];
        if (!node) continue;
        const [a, b] = QUOTES[i].at;
        const ramp = quoteRamp(a, b);
        const v = Math.round(smoothstep(a, a + ramp, lap.s) * (1 - smoothstep(b - ramp, b, lap.s)) * 1000) / 1000;
        if (v > 0) node.style.setProperty("--u", ((lap.s - a) / (b - a)).toFixed(3));
        if (quoteShown.current[i] === v) continue;
        quoteShown.current[i] = v;
        node.style.setProperty("--v", String(v));
        node.dataset.shown = v > 0.001 ? "1" : "0";
        node.inert = v < 0.6;
      }
    },
  }));

  return (
    <main className="lp-sections">
      {ITEMS.map(({ quote, i }) => {
        if (quote) {
          const q = QUOTES[i];
          return (
            <div
              key={q.id}
              className="lp-quote"
              ref={(node) => {
                quoteNodes.current[i] = node;
              }}
              data-shown="0"
              style={{ "--v": 0, "--u": 0 }}
            >
              <Quote q={q} />
            </div>
          );
        }
        const sec = SECTIONS[i];
        return (
          <section
            key={sec.id}
            id={`lp-${sec.id}`}
            ref={(node) => {
              nodes.current[i] = node;
            }}
            className={`lp-sec lp-sec-${sec.side}${sec.hero ? " lp-sec-hero" : ""}${sec.finale ? " lp-sec-finale" : ""}`}
            data-section={sec.id}
            data-shown={sec.hero ? "1" : "0"}
            style={{ "--v": sec.hero ? 1 : 0 }}
            aria-labelledby={sec.hero || sec.finale ? undefined : `lp-${sec.id}-title`}
          >
            {sec.hero ? (
              <Hero sec={sec} onSkip={onSkip} />
            ) : sec.finale ? (
              <Finale sec={sec} signedIn={signedIn} />
            ) : (
              <Feature sec={sec} index={i} />
            )}
          </section>
        );
      })}
    </main>
  );
}
