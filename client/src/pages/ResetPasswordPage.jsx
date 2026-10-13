import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import BrandLogo from "../components/BrandLogo";
import "../components/driver/Driver.css";

/* The same rules the server enforces (utils/userProfile.js). */
const RULES = [
  ["8+ characters", (p) => p.length >= 8],
  ["an uppercase letter", (p) => /[A-Z]/.test(p)],
  ["a number", (p) => /\d/.test(p)],
  ["a symbol", (p) => /[^A-Za-z0-9]/.test(p)],
];

/* /reset-password?token=… — the page an emailed reset link opens.
   Setting the password signs this device in and every other device
   out. */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState({ busy: false, error: "" });

  const valid = /^[a-f0-9]{64}$/.test(token);
  const passes = RULES.every(([, ok]) => ok(password));
  const matches = password.length > 0 && password === confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (!passes || !matches) return;
    setState({ busy: true, error: "" });
    try {
      await resetPassword(token, password);
      navigate("/test", { replace: true });
    } catch (err) {
      setState({ busy: false, error: err.message });
    }
  };

  return (
    <div className="drv-page acct-page">
      <div className="acct-card">
        <Link to="/" aria-label="CodeCaret home" className="acct-logo">
          <BrandLogo alt="" className="h-16 w-auto" />
        </Link>
        <h1 className="acct-title">Set a new password</h1>
        {!valid ? (
          <>
            <p className="acct-text" role="alert">
              This reset link isn&apos;t complete. Open it straight from the email, or ask for a new one.
            </p>
            <Link to="/forgot-password" className="drv-btn is-primary acct-wide">
              Get a new link
            </Link>
          </>
        ) : (
          <form className="drv-form acct-form" onSubmit={submit}>
            <label className="drv-field">
              <span className="drv-field-label">New password</span>
              <input
                className="drv-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                autoFocus
                aria-describedby="rp-rules"
              />
            </label>
            <ul id="rp-rules" className="acct-rules">
              {RULES.map(([label, ok]) => (
                <li key={label} className={ok(password) ? "is-met" : ""}>
                  {label}
                </li>
              ))}
            </ul>
            <label className="drv-field">
              <span className="drv-field-label">Confirm it</span>
              <input
                className="drv-input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            {confirm && !matches && <p className="drv-msg is-error">The two passwords don&apos;t match.</p>}
            {state.error && (
              <p className="drv-msg is-error" role="alert">
                {state.error} {/expired|used|valid/.test(state.error) && <Link to="/forgot-password" className="drv-link">Get a new link</Link>}
              </p>
            )}
            <button type="submit" className="drv-btn is-primary acct-wide" disabled={state.busy || !passes || !matches}>
              {state.busy ? "Saving…" : "Set password and sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
