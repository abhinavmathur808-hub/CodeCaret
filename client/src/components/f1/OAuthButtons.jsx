import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../context/useAuth";
import { GITHUB_CLIENT_ID, GOOGLE_CLIENT_ID } from "../../config";
import {
  GITHUB_REDIRECT_URI,
  OAUTH_STATE_KEY,
} from "../../hooks/useGithubCallback";

/* ══════════════════════════════════════════════════════════════
   OAuthButtons — the "or sign in with" block shared by /signin and
   /signup.

   One component for both pages because the two flows are identical
   once a provider has answered: there is no separate "sign up with
   Google", only a sign-in that happens to create the account if it
   is new. Two copies would be two places for that to drift.

   Providers with no client id configured are not rendered at all,
   rather than shown and then failing on click.
   ══════════════════════════════════════════════════════════════ */

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";

/**
 * A one-time anti-forgery value for the OAuth round trip.
 *
 * crypto.randomUUID is only defined in a secure context — HTTPS or
 * localhost. On a plain-HTTP staging box or a LAN address it is
 * simply absent, so calling it threw inside the click handler and
 * the GitHub button did nothing at all, silently. getRandomValues
 * has the same restriction, hence the final fallback: this value
 * only has to be unguessable-enough and unique per attempt, and a
 * sign-in that works beats one that throws.
 */
function newState() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const bytes = c.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function GithubMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-[1.05rem] w-[1.05rem]"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/**
 * @param {object}   props
 * @param {"signin"|"signup"} props.mode  Only changes the wording.
 * @param {function} [props.onError]      Surface a failure in the host page's
 *                                        own error slot, so OAuth problems
 *                                        read the same as password ones.
 */
export default function OAuthButtons({ mode = "signin", onError }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null); // "google" | "github" | null

  /* Back from GitHub. The page left for github.com with the button in
     its "Connecting…" state, and a browser that restores it from the
     back/forward cache brings that state back with it — a disabled
     button, stuck connecting to a page the user just left. A restored
     page reports `persisted`; nothing is in flight, so clear it. */
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) setBusy(null);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const verb = mode === "signup" ? "Sign up" : "Sign in";
  const report = useCallback(
    (message) => {
      setBusy(null);
      if (onError) onError(message);
      else console.warn(message);
    },
    [onError]
  );

  /* ── Google ────────────────────────────────────────────────
     GoogleLogin hands back an ID token (`credential`); the server
     verifies its signature and audience. Nothing here is trusted
     beyond being passed along. */
  const handleGoogle = useCallback(
    async (response) => {
      if (!response?.credential) return report("Google returned no credential");
      setBusy("google");
      try {
        const data = await loginWithGoogle(response.credential);
        /* A brand-new account is held pending a username — the modal
           takes over from here, so navigating now would carry the
           user away from it before they have chosen. */
        if (!data?.isNewOAuthUser) navigate("/test", { replace: true });
      } catch (err) {
        report(err.message || "Google sign-in failed");
      }
    },
    [loginWithGoogle, navigate, report]
  );

  /* ── GitHub ────────────────────────────────────────────────
     A full-page redirect out to GitHub, which returns to
     GITHUB_REDIRECT_URI with ?code=. `state` is a one-time value
     kept in sessionStorage and re-checked on the way back: without
     it, a third party could hand the browser a ?code= of their own
     and sign the visitor into an account they control. */
  const startGithub = useCallback(() => {
    setBusy("github");
    const state = newState();
    try {
      sessionStorage.setItem(OAUTH_STATE_KEY, state);
    } catch {
      /* Storage blocked — the state check below degrades to "absent
         on both sides", which still rejects a foreign code. */
    }
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: GITHUB_REDIRECT_URI,
      scope: "read:user user:email",
      state,
    });
    window.location.href = `${GITHUB_AUTHORIZE}?${params}`;
  }, []);

  /* ── The Google button's width ─────────────────────────────
     Google draws the button itself, in an iframe, at a width given in
     PIXELS: 200 to 400 (GsiButtonConfiguration.width). "100%" is not a
     width it accepts — it logged "Provided button width is invalid" and
     drew the narrowest standard button instead, and the personalized
     "Continue as …" button is never shown below 200px.

     So the slot is measured and the button drawn to fit it, clamped to
     Google's range. It is redrawn only when the slot really changes
     size: every redraw reloads Google's iframe. Until the first
     measurement there is nothing to draw, so the slot just holds the
     button's height and the page does not jump. */
  const googleSlotRef = useRef(null);
  const [googleWidth, setGoogleWidth] = useState(0);
  useEffect(() => {
    const slot = googleSlotRef.current;
    if (!slot) return undefined;
    const fit = (px) => Math.max(200, Math.min(400, Math.floor(px)));
    const measure = () => {
      const next = fit(slot.clientWidth);
      setGoogleWidth((prev) => (Math.abs(prev - next) >= 4 ? next : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(slot);
    return () => ro.disconnect();
  }, []);

  const showGoogle = Boolean(GOOGLE_CLIENT_ID);
  const showGithub = Boolean(GITHUB_CLIENT_ID);
  if (!showGoogle && !showGithub) return null;

  return (
    <div className="mt-7">
      {/* Divider, lettered like the panel's other headings. */}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="cc-brand text-[1rem] leading-none text-white/45">
          or via provider
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {/* At most 400px wide, Google's ceiling for its button, so the
          two providers always line up at the same width. */}
      <div className="mx-auto mt-4 grid w-full max-w-[400px] gap-2.5">
        {showGoogle && (
          <div
            ref={googleSlotRef}
            className={`cc-oauth-google flex min-h-[44px] justify-center ${busy ? "pointer-events-none opacity-50" : ""}`}
            /* Google's button is an iframe whose page declares no
               color-scheme, while every theme here is color-scheme:
               dark. On a mismatch the browser paints an opaque WHITE
               backdrop behind the iframe so its text stays readable —
               the white box around the dark button. Matching the
               iframe's scheme keeps it transparent. */
            style={{ colorScheme: "light" }}
          >
            {googleWidth > 0 && (
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => report("Google sign-in was cancelled or failed")}
                theme="filled_black"
                shape="rectangular"
                size="large"
                width={String(googleWidth)}
                text={mode === "signup" ? "signup_with" : "signin_with"}
                logo_alignment="left"
                /* FedCM: the browser's own sign-in API. Google shows the
                   personalized "Continue as …" button only when it can
                   read the Google session — through third-party cookies,
                   which many browsers block in this iframe (Edge's
                   tracking prevention, Safari, Firefox, private windows),
                   or through FedCM, which needs none. Off by default in
                   Google's library; browsers without FedCM keep the
                   ordinary popup flow. */
                use_fedcm_for_button
              />
            )}
          </div>
        )}

        {showGithub && (
          <button
            type="button"
            onClick={startGithub}
            disabled={Boolean(busy)}
            className="group flex w-full items-center justify-center gap-2.5 border border-white/15 bg-white/[0.04]
                       px-4 py-3 text-[0.92rem] font-medium leading-none text-zinc-200
                       transition-colors hover:border-white/30 hover:bg-white/[0.08]
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GithubMark />
            {busy === "github" ? "Connecting…" : `${verb} with GitHub`}
          </button>
        )}
      </div>
    </div>
  );
}
