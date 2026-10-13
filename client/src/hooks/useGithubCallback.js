import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

/* ══════════════════════════════════════════════════════════════
   useGithubCallback — completes the GitHub redirect.

   GitHub does not post back to the app; it sends the browser to a
   registered URL carrying ?code=. Whichever page owns that URL
   mounts this hook, which trades the code for a session.

   Lives apart from the button component so that file can export
   only components — a mixed module breaks React Fast Refresh.
   ══════════════════════════════════════════════════════════════ */

/** Must match the callback URL registered on the GitHub OAuth app. */
export const GITHUB_REDIRECT_URI = `${window.location.origin}/signin`;

/** Key holding the one-time anti-forgery value across the redirect. */
export const OAUTH_STATE_KEY = "cc_oauth_state";

export default function useGithubCallback({ onError } = {}) {
  const { loginWithGithub } = useAuth();
  const navigate = useNavigate();
  const [exchanging, setExchanging] = useState(false);

  /* A ref, not state: StrictMode runs effects twice in development
     and a GitHub code is single-use, so the second exchange would
     always fail and show the user a spurious error. */
  const consumedRef = useRef(false);

  useEffect(() => {
    if (consumedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const denied = params.get("error");

    if (!code && !denied) return;
    consumedRef.current = true;

    // Drop the query string before anything can re-read or replay it.
    window.history.replaceState({}, "", window.location.pathname);

    /* Never let a failure vanish. Without this, a page that mounts
       the hook and forgets to pass `onError` swallows every problem
       and the sign-in appears to do nothing at all. */
    const fail = (message, detail) => {
      console.error("[github-oauth]", message, detail ?? "");
      if (onError) onError(message);
    };

    if (denied) {
      /* GitHub puts the reason in the query too. "access_denied" is
         the user clicking cancel; anything else is a misconfigured
         app — redirect_uri_mismatch above all — and reporting that
         as "cancelled" sends people looking in the wrong place. */
      const description = params.get("error_description");
      fail(
        denied === "access_denied"
          ? "GitHub sign-in was cancelled"
          : `GitHub rejected the request: ${description || denied}`,
        { error: denied, description, uri: params.get("error_uri") }
      );
      return;
    }

    let expected = null;
    try {
      expected = sessionStorage.getItem(OAUTH_STATE_KEY);
      sessionStorage.removeItem(OAUTH_STATE_KEY);
    } catch {
      /* Unreadable storage leaves `expected` null, which fails the
         comparison below — the safe direction. */
    }

    /* Without this check, anyone could hand the browser a ?code= of
       their own and sign the visitor into an account they control. */
    if (!expected || expected !== state) {
      fail("GitHub sign-in could not be verified. Please try again.", {
        expected: Boolean(expected),
        received: Boolean(state),
      });
      return;
    }

    setExchanging(true);
    loginWithGithub(code)
      .then((data) => {
        /* New accounts stay put for the username picker — see the
           note in OAuthButtons. */
        if (!data?.isNewOAuthUser) navigate("/test", { replace: true });
      })
      /* Whatever the server said — 401 for a stale code, 502 for an
         unreachable GitHub, 403 for an unverified address — it
         arrives here as a message and is shown. The `finally` is
         what guarantees the spinner stops even on an unexpected
         throw, so the page can never be left hanging. */
      .catch((err) => fail(err.message || "GitHub sign-in failed", err))
      .finally(() => setExchanging(false));
    /* Runs once on mount. Re-running when the callbacks change would
       re-read a URL that has already been cleared, and `consumedRef`
       would block it anyway. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { exchanging };
}
