import { lazy, Suspense, useLayoutEffect } from "react";
import { Routes, Route, useLocation, useNavigationType, Link, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import UsernameSelectionModal from "./components/UsernameSelectionModal";
import { useAuth } from "./context/useAuth";
import OffTrackArt from "./components/OffTrackArt";

/* Each page is its own download. The home page used to arrive with
   the simulator, its 514 snippets, the charts and both 3D sign-in
   pages bundled in — megabytes of script to parse before its loader
   could even show. */
const LandingPage = lazy(() => import("./components/LandingPage"));
const TestTypingSandbox = lazy(() => import("./components/TestTypingSandbox"));
const Profile = lazy(() => import("./components/Profile"));
const Standings = lazy(() => import("./components/Standings"));
const SignInPage = lazy(() => import("./pages/SignInPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const DriverPage = lazy(() => import("./pages/DriverPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));

/* While a page's code arrives: that page's own background, so
   nothing flashes. The home page then shows its lights-out loader. */
function PageFallback() {
  const { pathname } = useLocation();
  return (
    <div
      aria-busy="true"
      className={`min-h-screen ${pathname === "/" ? "bg-[#040508]" : "bg-[var(--color-surface)]"}`}
    />
  );
}

/* A new page starts at its top. The home page is many screens tall,
   and a link followed from far down it used to open the next page
   scrolled to the bottom. Back and forward stay the browser's. */
function ScrollToTop() {
  const { pathname } = useLocation();
  const navigation = useNavigationType();
  useLayoutEffect(() => {
    if (navigation !== "POP") window.scrollTo(0, 0);
  }, [pathname, navigation]);
  return null;
}


/* ── 404 ─────────────────────────────────────────────────── */
function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col items-center justify-center px-4 py-16 text-center">
      <OffTrackArt />
      <p className="cc-brand mt-8 text-[1.15rem] text-[var(--color-accent)]">404</p>
      <h1 className="text-[2.2rem] leading-tight text-[var(--color-text-primary)] mb-2">
        Off the track
      </h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-[42ch]">
        That route doesn&apos;t exist. The car&apos;s in the gravel, and the marshals are on their way.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/test"
          className="cc-brand px-6 py-2.5 text-[1.15rem] bg-[var(--color-accent)] text-[var(--color-on-accent)] rounded-lg
                     hover:brightness-110 transition-all"
        >
          Back to the simulator
        </Link>
        <Link
          to="/standings"
          className="cc-display px-5 py-2.5 text-[0.95rem] font-semibold rounded-lg border border-[var(--color-border)]
                     text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
        >
          Standings
        </Link>
      </div>
    </div>
  );
}

/* ── App Root with Routing ───────────────────────────────── */
function App() {
  const location = useLocation();
  const { settingsVersion } = useAuth();
  const hideNav = ["/", "/test", "/signin", "/signup", "/forgot-password", "/reset-password"].includes(
    location.pathname
  );

  return (
    <>
      {!hideNav && <Navbar />}
      {/* Mounted above the routes, not inside a page: an OAuth
          sign-up can complete on /signin or /signup, and the picker
          must outlive whichever one started it. Renders nothing
          unless a sign-up is actually being held. */}
      <UsernameSelectionModal />
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          {/* There were two sign-in flows. /signin and /signup are the
              real ones — OAuth, the password policy the server actually
              enforces, the driver-ident picker. /login and /register
              were an older pair that had none of that: no Google or
              GitHub button at all, and a 6-character password rule the
              server rejects at 8. Which one you landed on depended on
              where you clicked from, so half the entry points quietly
              offered a worse, partly broken sign-up.

              Redirected rather than 404'd, for the same reason /lobby
              and /race are below: a bookmark should land somewhere
              useful. `replace` keeps the dead path out of history. */}
          <Route path="/login" element={<Navigate to="/signin" replace />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/driver/:username" element={<DriverPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {/* Keyed on settingsVersion: the sandbox seeds ~25 pieces of
              state from localStorage at mount, so settings arriving
              from the account afterwards would otherwise be written to
              storage and ignored on screen until a manual refresh.
              The key only changes when the account's settings actually
              differ from this device's, so it does not remount on an
              ordinary sign-in. */}
          <Route
            path="/test"
            element={<TestTypingSandbox key={settingsVersion} />}
          />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          {/* The multiplayer lobby is gone — CodeCaret is single-player.
              Both old paths redirect rather than 404, so bookmarks and
              any link still pointing at them land on the simulator
              instead of a dead end. */}
          <Route path="/lobby" element={<Navigate to="/test" replace />} />
          <Route path="/race" element={<Navigate to="/test" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
