import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
/* Imported as `Motion`: the lint config doesn't count <motion.div> as a
   use of `motion`, but it does skip unused PascalCase names. */
import {
  AnimatePresence,
  motion as Motion,
  useReducedMotion,
} from "framer-motion";
import {
  ChevronRight,
  CircleCheckBig,
  Eye,
  EyeOff,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import AuthLayout, { AuthPanel } from "../components/f1/AuthLayout";
import CarStage from "../components/f1/CarStage";
import OAuthButtons from "../components/f1/OAuthButtons";
import useGithubCallback from "../hooks/useGithubCallback";
import TelemetryField from "../components/f1/TelemetryField";
import { ReadoutHeader, SegmentMeter } from "../components/f1/chrome";

/* ══════════════════════════════════════════════════════════════
   SignInPage — the returning-driver counterpart to /signup.

   Where sign-up builds the car a part at a time, sign-in shows it
   already assembled and idling on a slow rotate: your car is in the
   garage, you just need to identify yourself. Two channels instead
   of four, and a systems check that runs on the car half while you
   type.
   ══════════════════════════════════════════════════════════════ */

const FIELDS = ["email", "password"];

/* Deliberately looser than the sign-up rules. Sign-in must accept any
   password an existing account already has — enforcing the current policy
   here would lock out older accounts and leak the policy to strangers. */
const VALIDATORS = {
  email(value) {
    const v = value.trim();
    if (!v) return "Enter your email address";
    /* [^\s@] rather than \S so a second @ is rejected — \S+@\S+\.\S+ would
       happily accept "a@b@c.d". */
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? ""
      : "That email address looks wrong";
  },
  password(value) {
    return value ? "" : "Enter your password";
  },
};

/* The systems check on the car half. The first three settle on their own
   after mount — they are the garage coming online, not anything the user
   did. The last line tracks the form, so it reads as the one outstanding
   item until both channels lock. */
const BOOT_LINES = ["Telemetry link", "Power unit", "Tyre blankets"];
const BOOT_STEP_MS = 420;

export default function SignInPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const reduced = useReducedMotion();

  /* The beat between "ident confirmed" and leaving for the track.
     Held so it can be cancelled: leave the page inside that second
     and an orphaned timer would drag you to /test from wherever you
     went instead. */
  const leaveTimer = useRef(null);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  const [values, setValues] = useState({ email: "", password: "" });
  const [activeField, setActiveField] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | submitting | success
  const [formError, setFormError] = useState("");

  /* GitHub sends the browser back here with ?code=. Handled on this
     page for both flows — a sign-up through GitHub lands here too,
     because the redirect URI is registered once and must match
     exactly. */
  const { exchanging: githubExchanging } = useGithubCallback({
    onError: setFormError,
  });

  /* How many boot lines have reported OK. Starts complete under reduced
     motion — the staggered reveal is decoration, not information. */
  const [booted, setBooted] = useState(() => (reduced ? BOOT_LINES.length : 0));

  useEffect(() => {
    if (reduced || booted >= BOOT_LINES.length) return;
    const t = setTimeout(() => setBooted((n) => n + 1), BOOT_STEP_MS);
    return () => clearTimeout(t);
  }, [booted, reduced]);

  const setField = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: "" } : e));
  }, []);

  const handleFocus = useCallback((name) => setActiveField(name), []);

  const handleBlur = useCallback(
    (name) => {
      setActiveField((a) => (a === name ? null : a));
      setErrors((e) => ({ ...e, [name]: VALIDATORS[name](values[name]) }));
    },
    [values]
  );

  const stagesDone = useMemo(
    () => FIELDS.map((f) => !VALIDATORS[f](values[f])),
    [values]
  );
  const readyCount = stagesDone.filter(Boolean).length;
  const ready = readyCount === FIELDS.length;
  const launching = status === "success";

  /* Already signed in: there is nothing to do here. Gated on an idle
     form so it never cuts short the lights-out beat after a sign-in on
     this very page — the session lands while the status is still
     "submitting". It also finishes a provider sign-in that completed
     here, since that sets the session without touching the form. */
  useEffect(() => {
    if (!authLoading && isAuthenticated && status === "idle") {
      navigate("/test", { replace: true });
    }
  }, [authLoading, isAuthenticated, status, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const nextErrors = {};
    for (const f of FIELDS) {
      const problem = VALIDATORS[f](values[f]);
      if (problem) nextErrors[f] = problem;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("submitting");
    try {
      await login(values.email.trim(), values.password);
      setStatus("success");
      // Let the lights-out beat land before leaving the page.
      leaveTimer.current = setTimeout(() => navigate("/test"), 1200);
    } catch (err) {
      setStatus("idle");
      setFormError(err.message || "Could not sign you in.");
    }
  };

  return (
    <AuthLayout>
      {/* ══ Left half — the car, already built ══ */}
      <CarStage
        chassisIn
        wheelsIn
        wingsIn
        secure={ready}
        launching={launching}
        reduced={Boolean(reduced)}
        autoRotate
      >
        <p className="max-w-[26ch] text-sm text-zinc-300">
          Your car is in the garage. Identify yourself and it&apos;s yours
          again.
        </p>

        {/* Systems check. Each line reports OK in turn, then the last one
            waits on you — which is exactly what a real grid check does. */}
        <ol className="mt-5 grid gap-2 font-mono text-[0.68rem] tracking-[0.12em] uppercase">
          {BOOT_LINES.map((line, i) => {
            const done = booted > i;
            return (
              <li key={line} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300"
                  style={
                    done
                      ? {
                          backgroundColor: "#34d399",
                          boxShadow: "0 0 8px rgba(52,211,153,0.8)",
                        }
                      : { backgroundColor: "rgba(255,255,255,0.18)" }
                  }
                />
                <span
                  className="transition-colors duration-300"
                  style={{ color: done ? "#d4d4d8" : "rgba(255,255,255,0.3)" }}
                >
                  {line}
                </span>
                <span
                  className="ml-auto transition-colors duration-300"
                  style={{ color: done ? "#34d399" : "rgba(255,255,255,0.22)" }}
                >
                  {done ? "OK" : "···"}
                </span>
              </li>
            );
          })}

          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300"
              style={
                ready
                  ? {
                      backgroundColor: "#E10600",
                      boxShadow: "0 0 8px rgba(225,6,0,0.9)",
                    }
                  : { backgroundColor: "rgba(255,255,255,0.18)" }
              }
            />
            <span
              className="transition-colors duration-300"
              style={{ color: ready ? "#d4d4d8" : "rgba(255,255,255,0.3)" }}
            >
              Driver ident
            </span>
            <span
              className="ml-auto tabular-nums transition-colors duration-300"
              style={{ color: ready ? "#E10600" : "rgba(255,255,255,0.22)" }}
            >
              {ready ? "OK" : `${readyCount}/2`}
            </span>
          </li>
        </ol>
      </CarStage>

      {/* ══ Right half — the form ══ */}
      <AuthPanel>
      <ReadoutHeader
        label="Driver login"
        tally={`${readyCount}/2 ID`}
        reduced={reduced}
      />

      <h1 className="mt-2 text-[2rem] leading-tight text-zinc-50">
        Welcome back
      </h1>

      <div className="mt-4 mb-7">
        <SegmentMeter segments={stagesDone} reduced={reduced} />
      </div>

      <AnimatePresence>
        {launching && (
          <Motion.div
            role="status"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 flex items-center gap-3 border-l-2 border-emerald-400 bg-emerald-400/10 px-4 py-3"
          >
            <CircleCheckBig
              className="h-4 w-4 shrink-0 text-emerald-400"
              aria-hidden="true"
            />
            <p className="font-mono text-[0.7rem] tracking-[0.14em] text-emerald-200 uppercase">
              Ident confirmed — taking you to the track
            </p>
          </Motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} noValidate className="grid gap-5">
        <TelemetryField
          index={1}
          name="email"
          type="email"
          label="Email address"
          placeholder="you@example.com"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          done={stagesDone[0]}
          active={activeField === "email"}
          reduced={Boolean(reduced)}
          onChange={setField}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        <TelemetryField
          index={2}
          name="password"
          type={showPassword ? "text" : "password"}
          label="Password"
          placeholder="Your password"
          autoComplete="current-password"
          value={values.password}
          error={errors.password}
          done={stagesDone[1]}
          active={activeField === "password"}
          reduced={Boolean(reduced)}
          onChange={setField}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyUp={(e) => setCapsOn(e.getModifierState("CapsLock"))}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-0 text-white/45 transition-colors hover:text-white"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          }
          below={
            capsOn && (
              <p className="mt-2 font-mono text-[0.6rem] tracking-[0.14em] text-amber-300/90 uppercase">
                Caps lock is on
              </p>
            )
          }
        />

        <div className="-mt-3 flex justify-end">
          <Link
            to="/forgot-password"
            className="cc-display text-[0.8rem] font-semibold text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600]"
          >
            Forgot password?
          </Link>
        </div>

        {/* The GitHub round trip lands back on this page with the
            form already rendered; without this the exchange is a
            blank couple of seconds where nothing appears to be
            happening. */}
        {githubExchanging && (
          <p
            role="status"
            className="flex items-center gap-2.5 border-l-2 border-[#E10600] bg-[#E10600]/10 px-3 py-2.5 font-mono text-[0.7rem] tracking-[0.14em] text-zinc-200 uppercase"
          >
            <LoaderCircle
              className="h-4 w-4 shrink-0 animate-spin"
              aria-hidden="true"
            />
            Verifying GitHub identity…
          </p>
        )}

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

        <Motion.button
          type="submit"
          disabled={status !== "idle"}
          whileTap={{ scale: 0.99 }}
          style={{
            clipPath:
              "polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)",
          }}
          className={`flex min-h-[52px] w-full items-center justify-center gap-3 px-5 py-3 cc-brand text-[1.25rem] leading-none transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600] disabled:cursor-not-allowed disabled:opacity-70 ${
            ready
              ? "bg-[#E10600] text-white shadow-[0_0_28px_rgba(225,6,0,0.45)] hover:brightness-110"
              : "bg-white/[0.07] text-white/70 hover:bg-white/[0.12] hover:text-white"
          }`}
        >
          {status === "submitting" ? (
            <>
              <LoaderCircle
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              Checking ident
            </>
          ) : (
            <>
              {ready ? "Lights out" : "Sign in"}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Motion.button>
      </form>

      <OAuthButtons mode="signin" onError={setFormError} />

      <p className="cc-brand mt-6 text-center text-[1.08rem] text-white/50">
        First time out?{" "}
        <Link
          to="/signup"
          className="text-[#E10600] transition-colors hover:text-white"
        >
          Create account
        </Link>
      </p>
      </AuthPanel>
    </AuthLayout>
  );
}
