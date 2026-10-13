import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/useAuth";
import BrandLogo from "./BrandLogo";

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  /* App.jsx already hides this on the auth pages, along with the
     landing page and the simulator. The old copy of that rule lived
     here too and named /login and /register — paths that now just
     redirect — so the two were deciding the same thing from
     different lists. One owner is enough. */

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50
                 bg-[var(--color-surface)]/80 backdrop-blur-xl
                 border-b border-[var(--color-border)]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* ── Brand: the logo, and the way home ────────── */}
        <Link
          to="/"
          aria-label="CodeCaret home"
          className="flex shrink-0 items-center rounded-md transition-opacity hover:opacity-80
                     focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
        >
          <BrandLogo alt="" className="h-9 w-auto sm:h-11" />
        </Link>

        {/* ── Nav Links ────────────────────────────────── */}
        <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          <NavLink to="/test" active={isActive("/test")}>
            Practice
          </NavLink>
          <NavLink to="/standings" active={isActive("/standings")}>
            <span className="hidden sm:inline">Driver </span>Standings
          </NavLink>

          {user ? (
            <>
              <NavLink to="/profile" active={isActive("/profile")}>
                Profile
              </NavLink>

              <div className="ml-1 pl-2 sm:ml-2 sm:pl-3 border-l border-[var(--color-border)] flex items-center gap-3">
                <span className="text-xs text-[var(--color-text-secondary)] hidden sm:inline">
                  {user.username}
                </span>
                <button
                  onClick={logout}
                  aria-label="Logout"
                  className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 text-[0.85rem] font-semibold leading-none text-red-400 border border-red-500/30 rounded-md
                             hover:bg-red-500/10 transition-all"
                >
                  <LogOut className="h-4 w-4 sm:hidden" aria-hidden="true" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/signin" active={isActive("/signin")}>
                Sign In
              </NavLink>
              <Link
                to="/signup"
                className="ml-1 sm:ml-2 px-3 sm:px-4 py-1.5 whitespace-nowrap text-[0.9rem] sm:text-[0.95rem] leading-none bg-[var(--color-accent)] text-[var(--color-on-accent)] rounded-md
                           hover:brightness-110 transition-all
                           shadow-[0_0_12px_rgba(var(--cc-accent-rgb),0.25)]"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ── Reusable nav link ───────────────────────────────────────── */
function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`px-2 sm:px-3 py-1.5 whitespace-nowrap text-[0.9rem] sm:text-[0.95rem] leading-none rounded-md transition-all
        ${
          active
            ? "text-[var(--color-accent)] bg-[var(--color-accent)]/10"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]"
        }`}
    >
      {children}
    </Link>
  );
}
