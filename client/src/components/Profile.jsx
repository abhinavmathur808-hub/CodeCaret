import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { API_URL } from "../config";
import DriverView from "./driver/DriverView";
import { readSymbolStats, symbolProfile } from "../utils/lapAnalysis";
import "./driver/Driver.css";

/* ══════════════════════════════════════════════════════════════
   Profile — your own driver page, plus everything only you can see
   or change: your account details, symbol fluency (kept in this
   browser), your password, and deleting the account.

   This is the one profile. The race screen used to open a separate
   "telemetry" dialog with its own copy of the stats and the
   name editor; it now links here instead.
   ══════════════════════════════════════════════════════════════ */

const PROVIDER = { google: "Google", github: "GitHub", email: "Email and password" };

/* The race log stores languages lowercased; show them as the app names them. */
const LANGUAGE_NAMES = { "c++": "C++", cpp: "C++", python: "Python", javascript: "JavaScript", english: "English" };

function AccountCard({ user, updateProfile }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const start = () => {
    setName(user.fullName || "");
    setHandle(user.username);
    setMsg(null);
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await updateProfile({ fullName: name.trim(), username: handle.trim() });
      setEditing(false);
      setMsg({ ok: true, text: "Saved." });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="drv-card" aria-labelledby="pf-account">
      <div className="drv-card-head">
        <h2 id="pf-account" className="drv-card-title">Account</h2>
        <span className="drv-card-note">Only you can see this</span>
      </div>
      {editing ? (
        <form className="drv-form" onSubmit={save}>
          <label className="drv-field">
            <span className="drv-field-label">Full name</span>
            <input className="drv-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className="drv-field">
            <span className="drv-field-label">Username</span>
            <input
              className="drv-input"
              value={handle}
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9_.\-]+"
              required
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="username"
            />
          </label>
          {msg && !msg.ok && <p className="drv-msg is-error" role="alert">{msg.text}</p>}
          <div className="drv-form-row">
            <button type="submit" className="drv-btn is-primary" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" className="drv-btn" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="drv-kv">
            <dt>Name</dt>
            <dd>{user.fullName || "—"}</dd>
            <dt>Username</dt>
            <dd>@{user.username}</dd>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Sign-in</dt>
            <dd>{PROVIDER[user.authProvider || "email"]}</dd>
          </dl>
          <div className="drv-form-row">
            <button type="button" className="drv-btn" onClick={start}>
              Edit name or username
            </button>
            {msg?.ok && <p className="drv-msg is-ok" role="status">{msg.text}</p>}
          </div>
        </>
      )}
    </section>
  );
}

function SymbolCard() {
  const profile = useMemo(() => symbolProfile(readSymbolStats()), []);
  const slow = profile.rows.filter((r) => r.ratio >= 1.3).slice(0, 8);
  const drill = slow.slice(0, 5).map((r) => r.key).join("");

  return (
    <section className="drv-card" aria-labelledby="pf-symbols">
      <div className="drv-card-head">
        <h2 id="pf-symbols" className="drv-card-title">Symbol fluency</h2>
        <span className="drv-card-note">
          {profile.laps} lap{profile.laps === 1 ? "" : "s"} in this browser
        </span>
      </div>
      <p className="drv-card-sub">
        How long each symbol takes you, against your plain lowercase letters. 1.0× is letter pace.
      </p>
      {profile.rows.length === 0 ? (
        <p className="drv-empty">Race a few code laps and your symbols show up here.</p>
      ) : (
        <>
          <ul className="drv-symbols">
            {profile.rows.slice(0, 12).map((r) => (
              <li
                key={r.key}
                className={`drv-symbol${r.ratio >= 1.3 ? " is-slow" : r.ratio <= 1.05 ? " is-quick" : ""}`}
              >
                <code>{r.label}</code>
                <span className="drv-symbol-ratio">{r.ratio ? `${r.ratio.toFixed(1)}×` : "—"}</span>
                <span className="drv-symbol-sub">
                  {Math.round(r.missRate * 100)}% missed · {r.hits} typed
                </span>
              </li>
            ))}
          </ul>
          {drill && (
            <div className="drv-form-row" style={{ marginTop: 14 }}>
              <Link to={`/test?drill=${encodeURIComponent(drill)}`} className="drv-btn is-primary">
                Drill your slowest symbols
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function SecurityCard({ user, changePassword }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user.authProvider && user.authProvider !== "email") {
    return (
      <section className="drv-card" aria-labelledby="pf-security">
        <div className="drv-card-head">
          <h2 id="pf-security" className="drv-card-title">Password</h2>
        </div>
        <p className="drv-empty">
          You sign in with {PROVIDER[user.authProvider]}, so there&apos;s no CodeCaret password to manage.
        </p>
      </section>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setMsg({ ok: true, text: "Password changed. Other devices have been signed out." });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="drv-card" aria-labelledby="pf-security">
      <div className="drv-card-head">
        <h2 id="pf-security" className="drv-card-title">Password</h2>
      </div>
      <form className="drv-form" onSubmit={submit}>
        {/* For password managers: which account this form is for. */}
        <input type="text" name="username" autoComplete="username" value={user.email} readOnly hidden />
        <label className="drv-field">
          <span className="drv-field-label">Current password</span>
          <input className="drv-input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        </label>
        <label className="drv-field">
          <span className="drv-field-label">New password</span>
          <input className="drv-input" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={8} required aria-describedby="pf-pw-rules" />
          <span id="pf-pw-rules" className="drv-symbol-sub">
            8+ characters, with an uppercase letter, a number and a symbol.
          </span>
        </label>
        {msg && (
          <p className={`drv-msg ${msg.ok ? "is-ok" : "is-error"}`} role={msg.ok ? "status" : "alert"}>
            {msg.text}
          </p>
        )}
        <div className="drv-form-row">
          <button type="submit" className="drv-btn is-primary" disabled={busy}>
            {busy ? "Changing…" : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}

function DangerCard({ user, deleteAccount, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const usesPassword = !user.authProvider || user.authProvider === "email";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await deleteAccount(usesPassword ? { password: value } : { confirmUsername: value });
      onDeleted();
    } catch (err) {
      setMsg(err.message);
      setBusy(false);
    }
  };

  return (
    <section className="drv-card drv-danger" aria-labelledby="pf-danger">
      <div className="drv-card-head">
        <h2 id="pf-danger" className="drv-card-title">Delete account</h2>
      </div>
      <p className="drv-card-sub">
        Removes your account, your laps on every track board and your trophies. This can&apos;t be undone.
      </p>
      {!open ? (
        <button type="button" className="drv-btn is-danger" onClick={() => setOpen(true)}>
          Delete my account…
        </button>
      ) : (
        <form className="drv-form" onSubmit={submit}>
          <label className="drv-field">
            <span className="drv-field-label">
              {usesPassword ? "Enter your password to confirm" : `Type ${user.username} to confirm`}
            </span>
            <input
              className="drv-input"
              type={usesPassword ? "password" : "text"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete={usesPassword ? "current-password" : "off"}
              required
            />
          </label>
          {msg && <p className="drv-msg is-error" role="alert">{msg}</p>}
          <div className="drv-form-row">
            <button type="submit" className="drv-btn is-danger" disabled={busy || !value}>
              {busy ? "Deleting…" : "Delete forever"}
            </button>
            <button type="button" className="drv-btn" onClick={() => setOpen(false)} disabled={busy}>
              Keep my account
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default function Profile() {
  const { user, token, logout, loading: authLoading, updateProfile, changePassword, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ key: null, driver: null, laps: null, error: "" });

  /* Set before signing out or deleting the account here, so the
     "signed out, go and sign in" redirect below does not overtake the
     page's own way out. */
  const leavingRef = useRef(false);
  const leave = (to) => {
    leavingRef.current = true;
    navigate(to, { replace: true });
  };

  useEffect(() => {
    if (!authLoading && !user && !leavingRef.current) navigate("/signin");
  }, [authLoading, user, navigate]);

  /* The public page for the stats, calendar and trophies; the full
     race log (200 laps) for a longer form line than the public read's
     twenty. Refetched on a rename, since the page is keyed by name. */
  const username = user?.username;
  useEffect(() => {
    if (!username || !token) return undefined;
    const ctrl = new AbortController();
    const opts = { signal: ctrl.signal };
    Promise.all([
      fetch(`${API_URL}/api/users/${encodeURIComponent(username)}/public`, opts).then((r) => {
        if (!r.ok) throw new Error("Couldn't load your profile.");
        return r.json();
      }),
      fetch(`${API_URL}/api/races/history`, { ...opts, headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([driver, log]) => {
        const laps = log?.history
          ? [...log.history].reverse().map((r) => ({ ...r, language: LANGUAGE_NAMES[r.language] ?? r.language }))
          : null;
        setData({ key: username, driver, laps, error: "" });
      })
      .catch((err) => {
        if (err.name !== "AbortError") setData({ key: username, driver: null, laps: null, error: err.message });
      });
    return () => ctrl.abort();
  }, [username, token]);

  if (authLoading || !user || data.key !== username) {
    return (
      <div className="drv-page">
        <p className="std-empty" aria-busy="true">Loading your profile…</p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="drv-page">
        <div className="std-empty">
          <p role="alert">{data.error}</p>
          <Link to="/test" className="drv-btn">
            Back to the simulator
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="drv-page">
      <DriverView
        driver={data.driver}
        laps={data.laps}
        isYou
        actions={
          <>
            <Link to={`/driver/${encodeURIComponent(user.username)}`} className="drv-btn">
              Public page
            </Link>
            <button
              type="button"
              className="drv-btn is-danger"
              onClick={() => {
                leavingRef.current = true;
                logout();
                navigate("/");
              }}
            >
              Sign out
            </button>
          </>
        }
      >
        <SymbolCard />
        <div className="drv-split">
          <AccountCard user={user} updateProfile={updateProfile} />
          <SecurityCard user={user} changePassword={changePassword} />
        </div>
        <DangerCard
          user={user}
          deleteAccount={async (confirmation) => {
            leavingRef.current = true;
            try {
              await deleteAccount(confirmation);
            } catch (err) {
              leavingRef.current = false;
              throw err;
            }
          }}
          onDeleted={() => leave("/")}
        />
      </DriverView>
    </div>
  );
}
