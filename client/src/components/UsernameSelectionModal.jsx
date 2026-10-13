import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { API_URL } from "../config";
import { CornerMarks, PanelGrid } from "./f1/chrome";

/* ══════════════════════════════════════════════════════════════
   UsernameSelectionModal — the interstitial between an OAuth
   sign-up and the app.

   A provider gives us a display name, not a driver ident. The
   account already exists at this point, but the session is held in
   memory rather than committed, so this is the last step of signing
   up rather than a prompt shown to someone already inside.

   There is deliberately no dismiss control: a race number is not
   optional. Escape and backdrop clicks are ignored for the same
   reason. Abandoning is still possible by closing the tab, which
   leaves the auto-generated name — recoverable from the profile
   dashboard later.
   ══════════════════════════════════════════════════════════════ */

/* Long enough that a normal typist finishes the word first, short
   enough that the verdict feels immediate. */
const CHECK_DEBOUNCE_MS = 350;

const MIN = 3;
const MAX = 24;

const STATES = {
  idle: { label: "", color: "" },
  checking: { label: "Checking…", color: "rgba(255,255,255,0.4)" },
  available: { label: "Available", color: "#34d399" },
  taken: { label: "Taken", color: "#f87171" },
  invalid: { label: "Invalid", color: "#fbbf24" },
};

/**
 * Gate only. The picker itself is a separate component so that its
 * state can be seeded from the pending sign-up at mount, rather than
 * copied in by an effect after the fact.
 */
export default function UsernameSelectionModal() {
  const { pendingSignup } = useAuth();
  if (!pendingSignup) return null;
  return <IdentPicker pending={pendingSignup} />;
}

function IdentPicker({ pending }) {
  const { confirmUsername } = useAuth();
  const navigate = useNavigate();

  /* Seeded with the auto-generated name so the field is never empty:
     it is a legal answer, and someone who just wants in can confirm
     immediately. Safe as an initialiser because this component only
     mounts once a sign-up is actually pending. */
  const [value, setValue] = useState(() => pending.user?.username ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  /* The remote verdict, tagged with the name it belongs to. Tagging
     is what lets the render decide whether the answer on hand is
     still about the text in the box — without it, the component
     would need an effect to clear the verdict on every keystroke,
     which is a synchronous setState inside an effect. */
  const [remote, setRemote] = useState({ name: "", state: "idle", reason: "" });

  const inputRef = useRef(null);
  /* Guards against a slow early response overwriting the verdict for
     a name the user has since typed past. */
  const requestSeq = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const name = value.trim();

  /* Computed during render, not stored: these are the answers that
     need no server. The character rules are deliberately NOT checked
     here — the endpoint owns them, so the two cannot disagree about
     what is legal. */
  const localState = !name
    ? "idle"
    : name.length < MIN || name.length > MAX
      ? "invalid"
      : null;

  const localReason =
    localState === "invalid" ? `Must be ${MIN}-${MAX} characters` : "";

  /* Fall back to "checking" whenever the remote answer on hand is
     about some earlier draft. */
  const state =
    localState ?? (remote.name === name ? remote.state : "checking");
  const reason =
    localState !== null
      ? localReason
      : remote.name === name
        ? remote.reason
        : "";

  /* ── Live availability ─────────────────────────────────────── */
  useEffect(() => {
    if (localState !== null) return undefined; // nothing to ask

    const seq = ++requestSeq.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/auth/check-username/${encodeURIComponent(name)}`
        );
        const data = await res.json();
        if (seq !== requestSeq.current) return; // superseded

        setRemote({
          name,
          state: data.available
            ? "available"
            : data.reason?.includes("already")
              ? "taken"
              : "invalid",
          reason: data.available ? "" : data.reason || "",
        });
      } catch {
        if (seq !== requestSeq.current) return;
        /* The check is a convenience — confirm still validates
           server-side, so a failed lookup must not block anyone. */
        setRemote({ name, state: "idle", reason: "" });
      }
    }, CHECK_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [name, localState]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (submitting) return;

      setFormError("");
      setSubmitting(true);
      try {
        await confirmUsername(name);
        navigate("/test", { replace: true });
      } catch (err) {
        setFormError(err.message || "Could not set that name");
        setSubmitting(false);
      }
    },
    [confirmUsername, name, navigate, submitting]
  );

  const meta = STATES[state];
  const blocked = state === "taken" || state === "invalid";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ident-title"
    >
      <div className="relative w-full max-w-[27rem] border border-white/12 bg-zinc-950/95 p-7 shadow-[0_0_60px_rgba(0,0,0,0.7)] sm:p-9">
        <PanelGrid />
        <CornerMarks />

        <div className="relative">
          <p className="cc-brand text-[1.05rem] leading-none text-[#ff4d47]">
            Final step
          </p>
          <h2
            id="ident-title"
            className="mt-2 text-[1.6rem] leading-tight text-zinc-50 sm:text-[1.75rem]"
          >
            Register your driver ident
          </h2>
          <p className="mt-3 max-w-[34ch] text-sm text-zinc-400">
            This is the name that appears on the timing screens and the
            championship standings. You can change it later from your
            profile.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-7 grid gap-4">
            <label className="grid gap-2">
              <span className="flex items-baseline justify-between">
                <span className="text-[0.85rem] leading-none text-white/70">Driver ident</span>
                <span
                  className="font-mono text-[0.6rem] tracking-[0.2em] tabular-nums uppercase transition-colors"
                  style={{ color: meta.color || "rgba(255,255,255,0.25)" }}
                >
                  {meta.label}
                </span>
              </span>

              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={MAX}
                autoComplete="off"
                spellCheck="false"
                aria-invalid={blocked}
                className="w-full border-b-2 bg-transparent pb-2 font-mono text-lg tracking-wide text-zinc-50
                           outline-none transition-colors placeholder:text-white/20"
                style={{ borderColor: meta.color || "rgba(255,255,255,0.18)" }}
                placeholder="senna_s"
              />

              {/* Reserved line, so the panel does not jump as the
                  verdict appears and disappears under the field. */}
              <span className="min-h-[1rem] font-mono text-[0.62rem] tracking-[0.12em] text-white/40">
                {reason}
              </span>
            </label>

            {formError && (
              <p
                role="alert"
                className="flex items-start gap-2.5 border-l-2 border-red-400 bg-red-400/10 px-3 py-2.5 text-sm text-red-200"
              >
                <TriangleAlert
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || blocked || !name}
              className="mt-1 flex items-center justify-center gap-2 bg-[#E10600] px-5 py-3 cc-brand text-[1.2rem]
                         leading-none text-white transition-all
                         hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
            >
              {submitting ? (
                <>
                  <LoaderCircle
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Registering
                </>
              ) : (
                "Confirm"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
