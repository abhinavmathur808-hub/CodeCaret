import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import BrandLogo from "../components/BrandLogo";
import "../components/driver/Driver.css";

/* /forgot-password — ask for a reset link. The reply is the same for
   every email, so this page cannot be used to learn who has an
   account; it says so plainly instead of pretending to know. */
export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ busy: false, sent: false, error: "" });

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, sent: false, error: "" });
    try {
      await requestPasswordReset(email.trim());
      setState({ busy: false, sent: true, error: "" });
    } catch (err) {
      setState({ busy: false, sent: false, error: err.message });
    }
  };

  return (
    <div className="drv-page acct-page">
      <div className="acct-card">
        <Link to="/" aria-label="CodeCaret home" className="acct-logo">
          <BrandLogo alt="" className="h-16 w-auto" />
        </Link>
        <h1 className="acct-title">Reset your password</h1>
        {state.sent ? (
          <>
            <p className="acct-text" role="status">
              If <strong>{email.trim()}</strong> has a CodeCaret account, a reset link is on its way. It works once, for 30
              minutes. Check your spam folder if it hasn&apos;t arrived in a few minutes.
            </p>
            <Link to="/signin" className="drv-btn is-primary acct-wide">
              Back to sign in
            </Link>
          </>
        ) : (
          <form className="drv-form acct-form" onSubmit={submit}>
            <p className="acct-text">Enter the email you signed up with and we&apos;ll send you a link to set a new password.</p>
            <label className="drv-field">
              <span className="drv-field-label">Email address</span>
              <input
                className="drv-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                autoFocus
              />
            </label>
            {state.error && <p className="drv-msg is-error" role="alert">{state.error}</p>}
            <button type="submit" className="drv-btn is-primary acct-wide" disabled={state.busy}>
              {state.busy ? "Sending…" : "Send reset link"}
            </button>
            <p className="acct-foot">
              Remembered it? <Link to="/signin" className="drv-link">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
