/* ──────────────────────────────────────────────────────────────
   Central runtime configuration.

   Every network call in the app must resolve its base URL from
   here — never hardcode a host. Set VITE_SERVER_URL in .env to
   point a build at a non-local backend (see .env.example).
   ────────────────────────────────────────────────────────────── */

/** Backend origin, e.g. "https://api.codecaret.dev" — no trailing slash.
    Empty means "the origin the page came from": a production build with
    VITE_SERVER_URL unset talks to the server that served it (the API
    serves the built client in production). Development defaults to the
    local API on :5000. */
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
export const API_URL = (
  SERVER_URL !== undefined ? SERVER_URL : import.meta.env.DEV ? "http://localhost:5000" : ""
).replace(/\/+$/, "");

/** Convenience helper: apiUrl("/api/races") → "<API_URL>/api/races" */
export const apiUrl = (path) =>
  `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

/* ── OAuth client ids ─────────────────────────────────────────
   Public by design — a client id identifies the application, it does
   not authorise anything. The matching secrets live only on the
   server (GitHub) or are never issued at all (Google, which verifies
   the ID token's signature instead).

   Unset means "this provider is not configured", and the UI omits
   its button rather than offering a control that cannot work.
   ────────────────────────────────────────────────────────────── */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
export const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || "";
