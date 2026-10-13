import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Copy,
  Download,
  LoaderCircle,
  RectangleHorizontal,
  RectangleVertical,
  Share2,
  Square,
  X,
} from "lucide-react";
import { CARD_FORMATS, renderRaceCard } from "./raceCard";
import BrandMark from "./BrandMarks";
import {
  PLATFORMS,
  canCopyImage,
  canShareFiles,
  cardFileName,
  copyCardImage,
  copyText,
  downloadCard,
  openTab,
  pasteShortcut,
  prefersShareSheet,
  shareCaption,
  shareCardFile,
} from "./shareTargets";
import { readEnum, write } from "../../utils/safeStorage";
import "./ShareCardDialog.css";

/* ══════════════════════════════════════════════════════════════
   ShareCardDialog — the chequered flag screen's "Share screenshot".

   Draws the lap as a share card (raceCard.js), shows exactly the
   image that will go out, and offers every way out of the browser
   this one has: the OS share sheet, download, copy, and one button
   per platform (see shareTargets.js for how each of those works).
   ══════════════════════════════════════════════════════════════ */

const FORMAT_IDS = Object.keys(CARD_FORMATS);
const FORMAT_ICONS = { square: Square, story: RectangleVertical, wide: RectangleHorizontal };
const FOCUSABLE = 'button:not([disabled]):not([tabindex="-1"]), a[href], [tabindex="0"]';

export default function ShareCardDialog({ card, onClose }) {
  const titleId = useId();
  const sizeLabelId = useId();
  const panelRef = useRef(null);
  const formatRefs = useRef({});

  const [format, setFormat] = useState(() => readEnum("cc_shareFormat", "square", FORMAT_IDS));
  /* The last card drawn, tagged with what it was drawn from. Being
     tagged is what lets a stale one stay on screen, dimmed, while the
     next size renders — and keeps every action off until it lands. */
  const [shot, setShot] = useState(null);
  const [failure, setFailure] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let live = true;
    renderRaceCard(card, format).then(
      (blob) => {
        if (live) setShot({ card, format, blob, url: URL.createObjectURL(blob) });
      },
      (error) => {
        if (live) setFailure({ card, format, error });
      }
    );
    return () => {
      live = false;
    };
  }, [card, format]);

  /* Each preview URL is released once it is replaced, or on close. */
  useEffect(() => () => shot && URL.revokeObjectURL(shot.url), [shot]);

  const ready = Boolean(shot && shot.card === card && shot.format === format);
  const failed = !ready && failure?.card === card && failure?.format === format;
  const blob = ready ? shot.blob : null;

  const caps = useMemo(
    () => ({ copy: canCopyImage(), sheet: prefersShareSheet(), paste: pasteShortcut() }),
    []
  );
  const nativeShare = useMemo(() => Boolean(shot && canShareFiles(shot.blob)), [shot]);
  /* On a phone every platform goes through the share sheet: it is the
     only route by which a web page can hand an app an image. */
  const viaSheet = caps.sheet && nativeShare;

  const caption = useMemo(() => shareCaption(card), [card]);
  const fileName = cardFileName(card);
  const link = card.link.href;

  const say = useCallback((text, extra = {}) => setStatus({ text, key: Date.now(), ...extra }), []);

  /* ── Focus: into the dialog on open, trapped while it is up, and
     Escape closes it. Captured on the window like the leaderboard's,
     so the keystroke never reaches the results screen beneath. */
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = panel.contains(active) && active !== panel;
      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  const chooseFormat = useCallback((id) => {
    setFormat(id);
    write("cc_shareFormat", id);
  }, []);

  /** Arrow keys move through the sizes, as a radio group should. */
  const onFormatKeyDown = useCallback(
    (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const next = FORMAT_IDS[(FORMAT_IDS.indexOf(format) + step + FORMAT_IDS.length) % FORMAT_IDS.length];
      chooseFormat(next);
      formatRefs.current[next]?.focus();
    },
    [format, chooseFormat]
  );

  /* ── Actions ─────────────────────────────────────────────────── */

  const download = () => {
    downloadCard(blob, fileName);
    say(`Saved to your downloads as ${fileName}.`);
  };

  const copy = async () => {
    try {
      await copyCardImage(blob);
      say(caps.sheet ? "Image copied. Paste it into a post or a chat." : `Image copied. Paste it anywhere with ${caps.paste}.`);
    } catch {
      say("This browser wouldn't copy the image. Use Download instead.", { tone: "error" });
    }
  };

  const share = async () => {
    try {
      await shareCardFile(blob, card, `${caption} ${link}`);
      say("Sent. Finish your post in the app you picked.");
    } catch (error) {
      /* Closing the sheet without picking anything rejects too. */
      if (error?.name !== "AbortError") {
        say("Sharing didn't go through. Try Download instead.", { tone: "error" });
      }
    }
  };

  const toPlatform = async (p) => {
    if (viaSheet) {
      share();
      return;
    }

    if (p.downloadOnly) {
      downloadCard(blob, fileName);
      let captioned = false;
      try {
        await copyText(`${caption} ${link}`);
        captioned = true;
      } catch {
        /* the card still downloaded — the caption is a nicety */
      }
      const opened = openTab(p.home);
      say(
        `Card saved to your downloads${captioned ? " and caption copied" : ""}. Post it from ${p.label} with + Create.`,
        opened ? {} : { href: p.home, hrefLabel: `Open ${p.label}` }
      );
      return;
    }

    /* Copied before the tab opens: a page that has lost focus to a
       new tab is no longer allowed to write to the clipboard. */
    let copied = false;
    if (caps.copy) {
      try {
        await copyCardImage(blob);
        copied = true;
      } catch {
        /* falls back to a download below */
      }
    }
    if (!copied) downloadCard(blob, fileName);
    const href = p.compose(caption, link);
    const opened = openTab(href);
    say(
      copied
        ? `Image copied. Paste it into your ${p.label} ${p.noun} with ${caps.paste}.`
        : `Card saved to your downloads. Attach it to your ${p.label} ${p.noun}.`,
      opened ? {} : { href, hrefLabel: `Open ${p.label}` }
    );
  };

  const f = CARD_FORMATS[format];
  const alt = `Your lap card: ${card.wpm} WPM at ${card.accuracy}% accuracy on ${card.track.title}`;

  return (
    <>
      <div className="settings-modal-backdrop sc-backdrop" onClick={onClose} />

      <div
        ref={panelRef}
        className="sc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="sc-header">
          <h2 className="sc-title" id={titleId}>
            Share your lap
          </h2>
          <button type="button" className="settings-modal-close" onClick={onClose} aria-label="Close sharing">
            <X size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <div className="sc-body">
          <div className="sc-preview">
            <div className={`sc-stage is-${format}`} style={{ "--sc-ratio": `${f.w} / ${f.h}` }}>
              {shot ? (
                <img
                  src={shot.url}
                  alt={ready ? alt : ""}
                  className={`sc-image${ready ? "" : " is-stale"}`}
                  draggable={false}
                />
              ) : (
                <div className="sc-placeholder" aria-hidden="true" />
              )}
              {!ready && !failed && (
                <LoaderCircle className="sc-spinner" size={34} aria-label="Drawing your card" />
              )}
              {failed && (
                <p className="sc-failed" role="alert">
                  The card couldn&apos;t be drawn here. Try another size.
                </p>
              )}
            </div>
          </div>

          <div className="sc-controls">
            <section className="sc-section">
              <h3 className="sc-label" id={sizeLabelId}>
                Card size
              </h3>
              <div className="sc-formats" role="radiogroup" aria-labelledby={sizeLabelId}>
                {FORMAT_IDS.map((id) => {
                  const F = CARD_FORMATS[id];
                  const Icon = FORMAT_ICONS[id];
                  const on = id === format;
                  return (
                    <button
                      key={id}
                      ref={(el) => {
                        formatRefs.current[id] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      tabIndex={on ? 0 : -1}
                      className={`sc-format${on ? " is-on" : ""}`}
                      onClick={() => chooseFormat(id)}
                      onKeyDown={onFormatKeyDown}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span className="sc-format-name">{F.label}</span>
                      <span className="sc-format-hint">{F.hint}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="sc-section">
              <h3 className="sc-label">Post to</h3>
              <div className="sc-platforms">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="sc-platform"
                    onClick={() => toPlatform(p)}
                    disabled={!ready}
                    aria-label={`Share to ${p.label}`}
                  >
                    <BrandMark id={p.id} size={42} />
                    <span className="sc-platform-name">{p.label}</span>
                  </button>
                ))}
              </div>
              <p className="sc-note">
                {viaSheet
                  ? "Opens your phone's share sheet with the card attached."
                  : caps.copy
                    ? `The card is copied and the post box opens — paste it in with ${caps.paste}.`
                    : "The card downloads and the post box opens — attach it there."}
              </p>
            </section>

            <div className="sc-actions">
              {nativeShare && (
                <button type="button" className="sc-btn is-primary" onClick={share} disabled={!ready}>
                  <Share2 size={17} aria-hidden="true" />
                  {viaSheet ? "Share…" : "More apps…"}
                </button>
              )}
              <button type="button" className="sc-btn" onClick={download} disabled={!ready}>
                <Download size={17} aria-hidden="true" />
                Download
              </button>
              {caps.copy && (
                <button type="button" className="sc-btn" onClick={copy} disabled={!ready}>
                  <Copy size={17} aria-hidden="true" />
                  Copy image
                </button>
              )}
            </div>

            <p className={`sc-status${status?.tone === "error" ? " is-error" : ""}`} role="status" aria-live="polite">
              {status && (
                <span key={status.key}>
                  {status.text}
                  {status.href && (
                    <>
                      {" "}
                      <a href={status.href} target="_blank" rel="noopener noreferrer">
                        {status.hrefLabel} →
                      </a>
                    </>
                  )}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
