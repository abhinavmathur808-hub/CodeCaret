import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { API_URL } from "../config";
import { AuthContext } from "./useAuth";
import { applySettings, collectSettings } from "../utils/settingsRegistry";
import { applyTheme } from "../themes";

/* ── Storage keys ─────────────────────────────────────────────
   One session, one pair of keys. The app previously wrote two
   independent sessions ("cc_token" from this provider, plus
   "token"/"user" from AuthPage/AuthModal) which could disagree
   about whether you were signed in. LEGACY_* are read once on
   boot so existing sessions survive the change, then dropped.
   ───────────────────────────────────────────────────────────── */
const TOKEN_KEY = "cc_token";
const USER_KEY = "cc_user";
const LEGACY_TOKEN_KEY = "token";
const LEGACY_USER_KEY = "user";

/** Read (and migrate) the persisted session. Never throws. */
function readStoredSession() {
  let token = null;
  let user = null;

  try {
    token = localStorage.getItem(TOKEN_KEY);
    let userJson = localStorage.getItem(USER_KEY);

    // Adopt a session left behind by the old auth flow.
    if (!token) {
      const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
      if (legacyToken) {
        token = legacyToken;
        userJson = localStorage.getItem(LEGACY_USER_KEY);
        localStorage.setItem(TOKEN_KEY, token);
        if (userJson) localStorage.setItem(USER_KEY, userJson);
      }
    }
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);

    // A corrupt user blob must not cost us the token — /me refetches it.
    if (userJson) {
      try {
        user = JSON.parse(userJson);
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
  } catch {
    // localStorage unavailable (private mode, blocked cookies) — run stateless.
    return { token: null, user: null };
  }

  return { token, user };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);
  const [loading, setLoading] = useState(() => Boolean(session.token));

  /* ── Pending OAuth sign-up ────────────────────────────────────
     A brand-new OAuth account, authenticated but not yet named. The
     token is held HERE and deliberately not written to localStorage:
     an un-named account must not survive a refresh as a live
     session, or the picker would be trivially skippable.

     The cost is that closing the tab mid-pick leaves the account
     with its auto-generated name. That is recoverable — signing in
     again lands normally, and the name can still be changed from
     the profile dashboard — which is why it is not worth persisting
     a half-finished sign-up to do better. */
  const [pending, setPending] = useState(null);

  /* Bumped whenever settings arrive from the account and differ from
     what is on this device. Consumers use it as a remount key, which
     is what makes a sign-in on a new machine actually show your theme
     and font rather than seeding state from local defaults and never
     looking again. */
  const [settingsVersion, setSettingsVersion] = useState(0);

  /**
   * Adopt the account's settings onto this device.
   *
   * A brand-new account has an empty blob; there is nothing to adopt
   * and this device's local choices become the account's on the next
   * push, rather than being wiped by an empty object.
   */
  const adoptSettings = useCallback((settings) => {
    if (!settings || Object.keys(settings).length === 0) return;
    if (!applySettings(settings)) return;

    /* The theme is the one setting that is not read from storage on
       render — it is painted onto <html> once at boot. Writing
       cc_theme alone left the account's theme in storage while the
       page kept showing the previous one. */
    if (settings.cc_theme) applyTheme(settings.cc_theme);

    setSettingsVersion((v) => v + 1);
  }, []);

  /* ── Single writer for both state and storage ─────────────── */
  const persist = useCallback((nextToken, nextUser) => {
    try {
      if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
      else localStorage.removeItem(TOKEN_KEY);

      if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      else localStorage.removeItem(USER_KEY);
    } catch {
      // Storage failed — keep the in-memory session anyway.
    }
    setSession({ token: nextToken || null, user: nextUser || null });
  }, []);

  /* ── Fetch the canonical user for a token ─────────────────── */
  const fetchMe = useCallback(
    async (jwt) => {
      try {
        const res = await fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        persist(jwt, data.user);
        adoptSettings(data.user?.settings);
        return data.user;
      } catch {
        // Token invalid / expired / server down — drop it.
        persist(null, null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [persist, adoptSettings]
  );

  /* ── Revalidate the stored token once on mount ────────────── */
  useEffect(() => {
    const stored = readStoredSession();
    if (stored.token) fetchMe(stored.token);
    else setLoading(false);
  }, [fetchMe]);

  /* ── Keep tabs in sync (login/logout in another tab) ──────── */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== TOKEN_KEY && e.key !== null) return;
      setSession(readStoredSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ── Auth actions ─────────────────────────────────────────── */
  const authenticate = useCallback(
    async (path, body, fallbackError) => {
      const res = await fetch(`${API_URL}/api/auth/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned ${res.status}. Is the backend running?`);
      }

      if (!res.ok) throw new Error(data.error || fallbackError);

      /* ── New OAuth account: hold, do not commit ────────────────
         The account exists server-side, but its username was derived
         from the provider's display name rather than chosen. Holding
         the token in memory keeps the app signed OUT until a name is
         picked, so the interstitial cannot be dismissed by simply
         navigating away.

         Only OAuth responses ever carry this flag, so the email
         paths through this same helper are untouched. */
      if (data.isNewOAuthUser && data.token) {
        setPending({ token: data.token, user: data.user });
        setLoading(false);
        return data;
      }

      persist(data.token, data.user);
      /* Sign-in is the moment a new device inherits the account's
         look and feel — before this the page would render with local
         defaults and never reconcile. */
      adoptSettings(data.user?.settings);
      setLoading(false);
      return data;
    },
    [persist, adoptSettings]
  );

  // The backend identifies users by email — sending a username here
  // is what made /login fail unconditionally.
  const login = useCallback(
    (email, password) =>
      authenticate("login", { email, password }, "Login failed"),
    [authenticate]
  );

  /**
   * register({ username, email, password, fullName })
   * The older positional form register(username, email, password) is
   * still accepted so existing callers keep working.
   */
  const register = useCallback(
    (usernameOrPayload, email, password) => {
      const payload =
        typeof usernameOrPayload === "object" && usernameOrPayload !== null
          ? usernameOrPayload
          : { username: usernameOrPayload, email, password };

      return authenticate("register", payload, "Registration failed");
    },
    [authenticate]
  );

  /* ── OAuth ────────────────────────────────────────────────────
     Deliberately routed through the same `authenticate` helper as
     email sign-in rather than a parallel path: the token is
     persisted, the user cached and the account's settings adopted by
     exactly the same code, so an OAuth session cannot end up subtly
     different from a password one. */
  const loginWithGoogle = useCallback(
    (credential) =>
      authenticate("google", { credential }, "Google sign-in failed"),
    [authenticate]
  );

  const loginWithGithub = useCallback(
    (code) => authenticate("github", { code }, "GitHub sign-in failed"),
    [authenticate]
  );

  /**
   * Claim a username for the held OAuth sign-up, then let them in.
   *
   * The PUT is authorised with the pending token — the one the app
   * is holding but has not committed — which is what allows this to
   * run while the user is still, from the app's point of view,
   * signed out.
   *
   * Nothing is written to storage until the server confirms. A
   * rejected name leaves the session exactly as it was, so the modal
   * can show the error and let them try again.
   */
  const confirmUsername = useCallback(
    async (username) => {
      if (!pending?.token) throw new Error("No sign-up in progress");

      const res = await fetch(`${API_URL}/api/auth/update-username`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pending.token}`,
        },
        body: JSON.stringify({ username }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned ${res.status}. Is the backend running?`);
      }
      if (!res.ok) throw new Error(data.error || "Could not set that name");

      /* The server re-issues the token because the old one carries
         the auto-generated name in its payload. Fall back to the
         pending one only if a future version stops re-issuing. */
      persist(data.token || pending.token, data.user);
      adoptSettings(data.user?.settings);
      setPending(null);
      return data;
    },
    [pending, persist, adoptSettings]
  );

  /** Abandon a held sign-up without claiming a name. */
  const cancelPendingSignup = useCallback(() => setPending(null), []);

  const logout = useCallback(() => {
    setPending(null);
    persist(null, null);
  }, [persist]);

  /* ── Settings sync ────────────────────────────────────────────
     Debounced because settings change in bursts — dragging the
     volume slider fires on every pixel, and each one would
     otherwise be its own request. */
  const pushTimerRef = useRef(null);
  const tokenRef = useRef(session.token);
  useEffect(() => {
    tokenRef.current = session.token;
  }, [session.token]);

  const pushSettings = useCallback((settings, { immediate = false } = {}) => {
    const token = tokenRef.current;
    /* Signed-out users still get localStorage; there is simply no
       account to sync to, which is not an error worth surfacing. */
    if (!token) return undefined;

    const send = () =>
      fetch(`${API_URL}/api/users/me/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: settings ?? collectSettings() }),
        /* keepalive so the request still completes if the caller
           navigates or reloads immediately afterwards — which is
           exactly what "reset settings" does. */
        keepalive: true,
      }).catch(() => {
        /* Offline or server down — the local copy is already saved,
           and the next change re-sends the whole blob, so a dropped
           push costs nothing. */
      });

    clearTimeout(pushTimerRef.current);
    if (immediate) return send();

    pushTimerRef.current = setTimeout(send, 1200);
    return undefined;
  }, []);

  useEffect(() => () => clearTimeout(pushTimerRef.current), []);

  /**
   * updateProfile({ fullName?, username? })
   *
   * Patches the profile and re-persists the returned user, so the
   * change is reflected everywhere reading from context without a
   * refetch. Throws the server's message on failure — the caller
   * owns how that gets shown.
   */
  const updateProfile = useCallback(
    async (patch) => {
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(patch),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned ${res.status}.`);
      }

      if (!res.ok) throw new Error(data.error || "Could not update profile");

      /* A rename comes back with a fresh token, because the old one
         carries the previous username in its payload and the server
         reads that off the session rather than looking the account
         up — a track record set afterwards would be credited to the
         name that was just replaced.

         Falling back to the current token keeps every other edit
         working: changing only a display name re-issues nothing,
         and passing null here would sign the user out. */
      persist(data.token || session.token, data.user);
      return data.user;
    },
    [session.token, persist]
  );

  const refreshUser = useCallback(
    () => (session.token ? fetchMe(session.token) : Promise.resolve(null)),
    [session.token, fetchMe]
  );

  /**
   * Drop the session because the server rejected its token.
   *
   * Nothing used to do this. A token expires after seven days, and
   * when it did every authenticated request started failing while
   * the UI carried on showing the cached user as signed in: races
   * silently not saving, the dashboard stuck on an error, and no
   * prompt to sign in again anywhere. Callers that see a 401 hand
   * it here and the app returns to a signed-out state it can
   * actually recover from.
   *
   * Idempotent, and a no-op when already signed out, so several
   * in-flight requests failing at once cannot fight over it.
   */
  const handleUnauthorized = useCallback(() => {
    if (!tokenRef.current) return;
    tokenRef.current = null;
    setPending(null);
    persist(null, null);
  }, [persist]);

  /* ── Account ──────────────────────────────────────────────────
     Password and deletion. Each throws the server's message for the
     caller to show. A password change or reset ends every other
     session on the server and hands this one a fresh token, which is
     adopted here so this device stays signed in. */
  const accountRequest = useCallback(async (method, path, body, auth) => {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server returned ${res.status}.`);
    return data;
  }, []);

  /** Email a reset link. Resolves the same whether or not the email has an account. */
  const requestPasswordReset = useCallback(
    (email) => accountRequest("POST", "/api/auth/forgot-password", { email }),
    [accountRequest]
  );

  /** Spend a reset link's token; signs this device in. */
  const resetPassword = useCallback(
    async (resetToken, password) => {
      const data = await accountRequest("POST", "/api/auth/reset-password", { token: resetToken, password });
      persist(data.token, data.user);
      adoptSettings(data.user?.settings);
      return data.user;
    },
    [accountRequest, persist, adoptSettings]
  );

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      const data = await accountRequest(
        "PUT",
        "/api/users/me/password",
        { currentPassword, newPassword },
        session.token
      );
      persist(data.token, data.user);
      return data.user;
    },
    [accountRequest, persist, session.token]
  );

  /** Delete the account, confirmed by password or (OAuth) username. */
  const deleteAccount = useCallback(
    async (confirmation) => {
      await accountRequest("DELETE", "/api/users/me", confirmation, session.token);
      setPending(null);
      persist(null, null);
    },
    [accountRequest, persist, session.token]
  );

  /** Merge server-computed stats into the cached user without a round-trip. */
  const applyStats = useCallback(
    (stats) => {
      setSession((prev) => {
        if (!prev.user || !stats) return prev;
        const merged = { ...prev.user, ...stats };
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(merged));
        } catch {
          // Non-fatal.
        }
        return { ...prev, user: merged };
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      user: session.user,
      token: session.token,
      isAuthenticated: Boolean(session.token),
      loading,
      login,
      register,
      loginWithGoogle,
      loginWithGithub,
      pendingSignup: pending,
      confirmUsername,
      cancelPendingSignup,
      logout,
      updateProfile,
      pushSettings,
      settingsVersion,
      refreshUser,
      applyStats,
      handleUnauthorized,
      requestPasswordReset,
      resetPassword,
      changePassword,
      deleteAccount,
    }),
    [
      session,
      loading,
      login,
      register,
      loginWithGoogle,
      loginWithGithub,
      pending,
      confirmUsername,
      cancelPendingSignup,
      logout,
      updateProfile,
      pushSettings,
      settingsVersion,
      refreshUser,
      applyStats,
      handleUnauthorized,
      requestPasswordReset,
      resetPassword,
      changePassword,
      deleteAccount,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
