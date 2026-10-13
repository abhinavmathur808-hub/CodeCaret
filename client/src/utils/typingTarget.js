/* ══════════════════════════════════════════════════════════════
   typingTarget — "is this keystroke meant for a form field?"

   The race engine listens on `window`, because the typing surface
   is painted text rather than a focusable input: there is nothing
   else to attach to. The cost is that it also hears every keystroke
   aimed at a real field somewhere else on the page.

   That was not theoretical. The custom-snippet box in the settings
   modal could not be typed into at all — each key was counted as a
   race keystroke and then preventDefault()ed before the textarea
   ever saw it, so the field only accepted pasted text.

   One shared definition, used by both window listeners, so the two
   cannot disagree about what counts as "someone is typing into
   something else".
   ══════════════════════════════════════════════════════════════ */

/* Form controls are included wholesale rather than filtered down to
   the text-entry ones. A checkbox taking Space or a select taking a
   letter is still the field consuming that key, and a race has no
   business reading it either way. */
const FORM_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Whether a keyboard event belongs to an editable field rather than
 * to the race.
 *
 * @param {EventTarget | null} target  Usually `event.target`.
 * @returns {boolean}
 */
export function isEditableTarget(target) {
  /* Guarded rather than assumed: a key event can be retargeted at
     the document or at a non-element node, and `tagName` on those is
     undefined. */
  if (!target || target.nodeType !== 1) return false;

  if (FORM_TAGS.has(target.tagName)) return true;

  /* Covers both the element carrying contenteditable and anything
     nested inside it — the property is inherited, which a tagName or
     attribute check would miss. */
  return target.isContentEditable === true;
}

export default isEditableTarget;
