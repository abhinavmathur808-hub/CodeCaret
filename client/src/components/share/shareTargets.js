/* ══════════════════════════════════════════════════════════════
   shareTargets — getting the lap card out of the browser.

   No platform lets a web page attach an image to a post through a
   link: share URLs carry text and links only, and Instagram has no
   web share URL at all. So there are two routes for the image:

   • Phones (and tablets) hand it to the OS share sheet — the Web
     Share API with a file — where WhatsApp, Instagram, X, LinkedIn
     and the rest are installed apps that accept it directly.

   • Desktops copy it to the clipboard and open the platform's own
     composer with the caption already written, so the image is one
     Ctrl+V away. Where the clipboard refuses, the card is downloaded
     instead and the user attaches it.
   ══════════════════════════════════════════════════════════════ */

const enc = encodeURIComponent;
const pad2 = (n) => String(n).padStart(2, "0");

export function cardFileName(card) {
  const d = card.date;
  return `codecaret-${card.wpm}wpm-${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}.png`;
}

/** The post text: what happened, where, and the challenge. */
export function shareCaption(card) {
  const where = card.track.custom
    ? `my own ${card.track.language} code`
    : `${card.track.title} (${card.track.language})`;
  const pace = `${card.wpm} WPM at ${card.accuracy}% accuracy`;
  const a = card.achievement;
  let line;
  if (a?.kind === "record") line = `🏁 New track record on ${where}: ${pace}.`;
  else if (a?.kind === "pb") line = `🏁 New personal best on ${where}: ${pace} (+${a.delta} WPM).`;
  else if (a?.kind === "podium" && a.position <= 3) line = `🏁 P${a.position} on ${where}: ${pace}.`;
  else line = `🏁 ${pace} on ${where}.`;
  return `${line} Racing real code on CodeCaret — can you beat it?`;
}

/* ── What this browser can do ──────────────────────────────────── */

export function canShareFiles(blob) {
  try {
    const file = new File([blob], "lap.png", { type: "image/png" });
    return Boolean(navigator.canShare?.({ files: [file] }));
  } catch {
    return false;
  }
}

export function canCopyImage() {
  if (typeof window.ClipboardItem !== "function" || !navigator.clipboard?.write) return false;
  return typeof ClipboardItem.supports !== "function" || ClipboardItem.supports("image/png");
}

/** True where the share sheet, not a web composer, is the way out:
    a device whose main pointer is a finger. */
export function prefersShareSheet() {
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

export function pasteShortcut() {
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  return /mac|iphone|ipad/i.test(platform) ? "⌘V" : "Ctrl+V";
}

/* ── Actions ───────────────────────────────────────────────────── */

export function downloadCard(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* Revoked late: the download reads the URL after this returns. */
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function copyCardImage(blob) {
  return navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

export function copyText(text) {
  return navigator.clipboard?.writeText ? navigator.clipboard.writeText(text) : Promise.reject(new Error("No clipboard"));
}

export function shareCardFile(blob, card, text) {
  const file = new File([blob], cardFileName(card), { type: "image/png" });
  return navigator.share({ files: [file], title: "My CodeCaret lap", text });
}

/** Opens `href` in a new tab; false when a popup blocker stopped it.
    Not `noopener` in the features — that makes window.open return
    null even on success — so the opener is cut by hand instead. */
export function openTab(href) {
  const w = window.open(href, "_blank");
  if (!w) return false;
  try {
    w.opener = null;
  } catch {
    /* cross-origin already: nothing to cut */
  }
  return true;
}

/* ── Platforms ─────────────────────────────────────────────────────
   `compose` builds the platform's own posting URL with the caption in
   it. Instagram has none, and Facebook's sharer only takes a link (it
   would post the site's preview instead of the card), so both open
   the site itself for the image to be posted from there. */
export const PLATFORMS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    noun: "message",
    compose: (text, url) => `https://wa.me/?text=${enc(`${text} ${url}`)}`,
  },
  {
    id: "x",
    label: "X",
    noun: "post",
    compose: (text, url) => `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    noun: "post",
    compose: (text, url) => `https://www.linkedin.com/feed/?shareActive=true&text=${enc(`${text} ${url}`)}`,
  },
  {
    id: "instagram",
    label: "Instagram",
    home: "https://www.instagram.com/",
    downloadOnly: true,
  },
  {
    id: "facebook",
    label: "Facebook",
    noun: "post",
    compose: () => "https://www.facebook.com/",
  },
  {
    id: "telegram",
    label: "Telegram",
    noun: "message",
    compose: (text, url) => `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
  },
];
