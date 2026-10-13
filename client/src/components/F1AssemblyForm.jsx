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
  Check,
  ChevronRight,
  CircleCheckBig,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { AuthPanel } from "./f1/AuthLayout";
import CarStage from "./f1/CarStage";
import OAuthButtons from "./f1/OAuthButtons";
import TelemetryField from "./f1/TelemetryField";
import { ReadoutHeader, SegmentMeter } from "./f1/chrome";

/* ══════════════════════════════════════════════════════════════
   F1AssemblyForm — registration form that builds a car as you go.

   Four fields, in a fixed order, each owning one stage of the build:

     email     → chassis drops in
     fullName  → wheels and suspension
     username  → front and rear aero
     password  → the stage arms: the plinth pulses and the light
                 under the floor comes on (`secure`)

   Every stage is strictly validation-gated: a part appears only once
   its field's validator returns "", the same boolean that clears the
   field's error text. Stages are not sticky — emptying a valid field
   takes its part back off again, so the car always tells the truth
   about the form.

   The car stage, the field rows and the panel furniture are shared
   with /signin — see components/f1/. This renders the two columns
   only; SignUpPage wraps them in AuthLayout, which owns the page
   frame and backdrop.
   ══════════════════════════════════════════════════════════════ */

const FIELDS = ["email", "fullName", "username", "password"];

/* The password policy, declared once and used three ways: the validator
   below rejects on the first unmet rule, the live checklist under the
   field ticks each one off as you type, and the strength meter counts
   how many are satisfied. Adding a rule here updates all three.

   Mirrored server-side by passwordProblem() in
   server/utils/userProfile.js — the checklist is a convenience, not the
   enforcement point. */
const PASSWORD_RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    error: "At least 8 characters",
    test: (v) => v.length >= 8,
  },
  {
    id: "upper",
    label: "One uppercase letter",
    error: "Add an uppercase letter",
    test: (v) => /[A-Z]/.test(v),
  },
  {
    id: "number",
    label: "One number",
    error: "Add a number",
    test: (v) => /\d/.test(v),
  },
  {
    id: "symbol",
    label: "One special character",
    error: "Add a special character",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

/* Single source of truth for the page: a field is valid when its validator
   returns "". The same booleans drive the error text, the tick, the
   checklist dot AND the car layer, so a part can never appear while its
   field is still complaining. */
const VALIDATORS = {
  email(value) {
    const v = value.trim();
    if (!v) return "Enter your email address";
    /* [^\s@] rather than \S so a second @ is rejected — \S+@\S+\.\S+
       would happily accept "a@b@c.d". */
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? ""
      : "That email address looks wrong";
  },
  fullName(value) {
    const v = value.trim();
    if (!v) return "Enter your name";
    if (v.length < 2) return "That name is too short";
    if (v.length > 60) return "Keep it under 60 characters";
    return "";
  },
  username(value) {
    const v = value.trim();
    if (!v) return "Pick a username";
    if (v.length < 3) return "At least 3 characters";
    if (v.length > 24) return "At most 24 characters";
    if (!/^[a-zA-Z0-9_.-]+$/.test(v))
      return "Letters, numbers, dot, dash and underscore only";
    return "";
  },
  password(value) {
    if (!value) return "Choose a password";
    /* Only the first unmet rule is reported — the checklist under the
       field already shows the full picture. */
    const missing = PASSWORD_RULES.find((r) => !r.test(value));
    return missing ? missing.error : "";
  },
};

const STAGE_LABELS = [
  "Chassis",
  "Wheels & suspension",
  "Front & rear aero",
  "Systems & encryption",
];

/* One tier per number of PASSWORD_RULES satisfied, so the meter, the
   verdict and the checklist can never tell different stories. */
const STRENGTH_TIERS = [
  { label: "Weak", color: "#f87171" },
  { label: "Weak", color: "#f87171" },
  { label: "Fair", color: "#fbbf24" },
  { label: "Strong", color: "#fbbf24" },
  { label: "Secure", color: "#34d399" },
];

function passwordStrength(pw) {
  const met = PASSWORD_RULES.map((r) => Boolean(pw) && r.test(pw));
  if (!pw) return { met, score: 0, label: "—", color: "rgba(255,255,255,0.25)" };
  const score = met.filter(Boolean).length;
  const tier = STRENGTH_TIERS[score];
  /* Length is the rule people hit last and notice least, so it gets the
     verdict line to itself until it passes. */
  return { met, score, ...tier, label: met[0] ? tier.label : "Too short" };
}

export default function F1AssemblyForm() {
  const navigate = useNavigate();
  const { register, isAuthenticated, loading: authLoading } = useAuth();
  const reduced = useReducedMotion();

  /* The launch beat before leaving for the track — held so leaving
     the page first cancels it, rather than an orphaned timer pulling
     you to /test from wherever you went. */
  const leaveTimer = useRef(null);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  const [values, setValues] = useState({
    email: "",
    fullName: "",
    username: "",
    password: "",
  });
  const [activeField, setActiveField] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | submitting | success
  const [formError, setFormError] = useState("");

  const setField = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: "" } : e));
  }, []);

  /* Focus only tracks which field is active. It must never reveal a car
     part — that is what made parts slide in on a click into an empty
     field. */
  const handleFocus = useCallback((name) => {
    setActiveField(name);
  }, []);

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
  const builtCount = stagesDone.filter(Boolean).length;
  const built = builtCount === FIELDS.length;
  const launching = status === "success";

  /* Already signed in: nothing to register. Gated on an idle form so a
     sign-up on this page still gets its launch animation — the session
     lands while the status is "submitting". */
  useEffect(() => {
    if (!authLoading && isAuthenticated && status === "idle") {
      navigate("/test", { replace: true });
    }
  }, [authLoading, isAuthenticated, status, navigate]);
  const strength = useMemo(
    () => passwordStrength(values.password),
    [values.password]
  );

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
      await register({
        email: values.email.trim(),
        fullName: values.fullName.trim(),
        username: values.username.trim(),
        password: values.password,
      });
      setStatus("success");
      // Let the launch animation play out before leaving the page.
      leaveTimer.current = setTimeout(() => navigate("/test"), 1700);
    } catch (err) {
      setStatus("idle");
      setFormError(err.message || "Could not create your account.");
    }
  };

  return (
    <>
      {/* ══ Left half — the car, assembling as you go ══ */}
      <CarStage
        chassisIn={stagesDone[0]}
        wheelsIn={stagesDone[1]}
        wingsIn={stagesDone[2]}
        secure={stagesDone[3]}
        launching={launching}
        reduced={Boolean(reduced)}
      >
        <p className="max-w-[24ch] text-sm text-zinc-300">
          Every field you complete bolts another part onto your car.
        </p>

        <ol className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2">
          {STAGE_LABELS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                  stagesDone[i]
                    ? "bg-[#E10600] shadow-[0_0_8px_rgba(225,6,0,0.8)]"
                    : "bg-zinc-600"
                }`}
              />
              <span
                className={`text-[0.72rem] transition-colors ${
                  stagesDone[i] ? "text-zinc-200" : "text-zinc-500"
                }`}
              >
                {label}
              </span>
            </li>
          ))}
        </ol>
      </CarStage>

      {/* ══ Right half — the form ══ */}
      <AuthPanel>
      <ReadoutHeader
        label="Driver registration"
        tally={`${builtCount}/4 SYS`}
        reduced={reduced}
      />

      <h1 className="mt-2 text-[2rem] leading-tight text-zinc-50">
        Create your account
      </h1>

      {/* Four segments, one per field — the same booleans that drive the
          car, so the meter and the build can never disagree. */}
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
              On the grid — taking you to the track
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
          name="fullName"
          label="Full name"
          placeholder="Ayrton Senna"
          autoComplete="name"
          value={values.fullName}
          error={errors.fullName}
          done={stagesDone[1]}
          active={activeField === "fullName"}
          reduced={Boolean(reduced)}
          onChange={setField}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        <TelemetryField
          index={3}
          name="username"
          label="Username"
          placeholder="senna_s"
          autoComplete="username"
          maxLength={24}
          counter={`${values.username.length}/24`}
          value={values.username}
          error={errors.username}
          done={stagesDone[2]}
          active={activeField === "username"}
          reduced={Boolean(reduced)}
          onChange={setField}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        <TelemetryField
          index={4}
          name="password"
          type={showPassword ? "text" : "password"}
          label="Password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={values.password}
          error={errors.password}
          done={stagesDone[3]}
          active={activeField === "password"}
          reduced={Boolean(reduced)}
          onChange={setField}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyUp={(e) => setCapsOn(e.getModifierState("CapsLock"))}
          extraDescribedBy="password-rules"
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
            <>
              {/* One segment per rule satisfied, so the meter is a
                  readout of the checklist rather than a separate
                  opinion about the password. */}
              <div className="mt-2.5 flex items-center gap-2.5">
                <div className="flex flex-1 gap-1">
                  {PASSWORD_RULES.map((rule, i) => (
                    <span
                      key={rule.id}
                      className="h-[2px] flex-1 rounded-full transition-colors duration-300"
                      style={{
                        backgroundColor:
                          i < strength.score
                            ? strength.color
                            : "rgba(255,255,255,0.1)",
                      }}
                    />
                  ))}
                </div>
                <span
                  className="font-mono text-[0.56rem] tracking-[0.2em] uppercase"
                  style={{ color: strength.color }}
                >
                  {strength.label}
                </span>
              </div>

              <ul id="password-rules" className="mt-2.5 grid gap-1.5">
                {PASSWORD_RULES.map((rule, i) => {
                  const ok = strength.met[i];
                  return (
                    <li
                      key={rule.id}
                      className="flex items-center gap-2 text-xs transition-colors duration-200"
                      style={{
                        color: ok ? "#34d399" : "rgba(255,255,255,0.42)",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200"
                        style={{
                          borderColor: ok
                            ? "#34d399"
                            : "rgba(255,255,255,0.25)",
                          backgroundColor: ok
                            ? "rgba(52,211,153,0.16)"
                            : "transparent",
                        }}
                      >
                        {ok && (
                          <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                        )}
                      </span>
                      {rule.label}
                      <span className="sr-only">
                        {ok ? "— met" : "— not met yet"}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {capsOn && (
                <p className="mt-2 font-mono text-[0.6rem] tracking-[0.14em] text-amber-300/90 uppercase">
                  Caps lock is on
                </p>
              )}
            </>
          }
        />

        {formError && (
          <p
            role="alert"
            className="border-l-2 border-red-400 bg-red-400/10 px-3 py-2 text-sm text-red-200"
          >
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
            built
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
              Building
            </>
          ) : (
            <>
              {built ? "Lights out" : "Create account"}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Motion.button>
      </form>

      <OAuthButtons mode="signup" onError={setFormError} />

      <p className="cc-brand mt-6 text-center text-[1.08rem] text-white/50">
        Already racing?{" "}
        <Link
          to="/signin"
          className="text-[#E10600] transition-colors hover:text-white"
        >
          Sign in
        </Link>
      </p>
      </AuthPanel>
    </>
  );
}
