# CodeCaret

A typing simulator for code. Race real C++, Python and JavaScript snippets against the clock, with live WPM telemetry, a ghost of your best lap, a podium for every track, a daily track, challenge links, trophies and a global championship table.

## Contents

- [Stack](#stack)
- [Repository layout](#repository-layout)
- [Local development](#local-development)
- [Configuration](#configuration)
- [Production deployment](#production-deployment)
- [Testing and CI](#testing-and-ci)
- [Security](#security)
- [API overview](#api-overview)

## Stack

| Part | Technology |
|---|---|
| Client | React 19, React Router 7, Vite 8, Tailwind CSS 4, React Three Fiber (3D garage and landing scenes), Recharts |
| Server | Node.js 22, Express 5, Mongoose 9 (MongoDB), Redis 5, JWT sessions, Nodemailer |
| Sign-in | Email and password, Google, GitHub |

## Repository layout

```
client/            React app (Vite)
  public/          Static files served as-is: icons, manifest, 3D model, Draco decoder
  scripts/         One-off generators (themes, snippet labels, link-preview art)
  src/
    components/    Pages and UI; race/ holds the race screen's parts
    pages/         Route-level pages
    utils/         Snippet catalogue, lap analysis, special tracks, trophies
server/            Express API
  config/          Environment checks, MongoDB and Redis connections
  middleware/      Auth, rate limiting, security headers
  models/          User, TrackBest (per-track boards), Snippet
  routes/          auth, users, races, snippets, leaderboard
  utils/           Rating, streaks, anti-cheat, boards, trophies, mail, sessions
  scripts/         Smoke test and MongoDB diagnostics
  tests/           Unit tests (node:test)
```

## Local development

**Prerequisites:** Node.js 22 or newer, MongoDB (local or Atlas). Redis is optional in development: without it the server skips caching and counts rate limits in memory.

```bash
# 1. Server
cd server
cp .env.example .env        # set JWT_SECRET and MONGODB_URI at least
npm install
npm run dev                 # http://localhost:5000, restarts on change

# 2. Client, in a second terminal
cd client
cp .env.example .env        # VITE_SERVER_URL=http://localhost:5000
npm install
npm run dev                 # http://localhost:5173
```

The client dev server is pinned to port 5173 (`strictPort`) because the OAuth providers are registered against that origin.

Without SMTP settings, a password-reset link is printed to the server console in development instead of being emailed.

### Scripts

| Where | Command | What it does |
|---|---|---|
| client | `npm run dev` | Vite dev server |
| client | `npm run build` | Production build into `client/dist` |
| client | `npm run lint` | ESLint |
| client | `npm test` | Unit tests (Vitest) |
| server | `npm run dev` | API with auto-restart |
| server | `npm start` | API (production) |
| server | `npm test` | Unit tests (node:test) |
| server | `npm run smoke` | End-to-end API check against a running server (creates and removes a throwaway account; use a development database) |
| server | `npm run diagnose` | MongoDB connection diagnostics |

## Configuration

Every setting is documented in the two templates:

- [`server/.env.example`](server/.env.example): secrets, database, Redis, CORS origin, proxy trust, email, OAuth.
- [`client/.env.example`](client/.env.example): API origin, public OAuth client ids, public site URL for link previews.

The server checks its configuration at boot and refuses to start with a list of what is wrong. With `NODE_ENV=production` it is stricter:

- `JWT_SECRET` must be at least 32 characters.
- `CLIENT_URL` must be set.

It also warns, without refusing to start, when the site is not on https or when Redis or email isn't configured.

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Production deployment

In production the API also serves the built client, so the whole site is one Node process on one origin, with no CORS setup. The client calls the origin it was loaded from when `VITE_SERVER_URL` is left unset at build time.

You need a MongoDB database (your own or a managed one such as Atlas) and, for production, a Redis instance (your own or a managed one). Point `MONGODB_URI` and `REDIS_URL` at them.

### Option A: one Node.js host (recommended)

```bash
cd client && npm ci && npm run build      # leave VITE_SERVER_URL unset
cd ../server && npm ci --omit=dev
NODE_ENV=production node index.js         # with the variables from server/.env.example
```

Set the client's public build values (`VITE_GOOGLE_CLIENT_ID`, `VITE_GITHUB_CLIENT_ID`, `VITE_SITE_URL`) in `client/.env` before building. The app listens on `PORT` (5000 by default) and reports its state at `/health` (200 while MongoDB is reachable, 503 when it is not). Keep it running under a process manager (systemd, pm2, or your platform's own), and put an HTTPS reverse proxy in front of it, such as Caddy, nginx or a cloud load balancer.

### Option B: client and API hosted separately

Build the client with `VITE_SERVER_URL=https://api.your.domain` and deploy `client/dist` to any static host. That host must route unknown paths to `index.html`. Run the API with `SERVE_CLIENT=false` and `CLIENT_URL` set to the client's origin.

**Vercel:** import the repository with **Root Directory** `client` (framework preset Vite, output `dist`). [`client/vercel.json`](client/vercel.json) already rewrites every route to `index.html`, so refreshing `/test` or `/standings` works; real files such as `/assets/*`, the icons and the 3D model are still served as-is. Set `VITE_SERVER_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_GITHUB_CLIENT_ID` and `VITE_SITE_URL` in the project's environment variables. The same file sets long caching for `/assets` and the security headers the API would otherwise send (CSP, HSTS and so on); its CSP `connect-src` must include your API origin, which is `https://*.onrender.com` until you narrow it to your exact Render URL.

### Before going live

- [ ] Served over **https**, and `CLIENT_URL` is that https origin.
- [ ] `JWT_SECRET` is a fresh random value of 32 or more characters.
- [ ] `TRUST_PROXY=1` when behind one proxy or load balancer, so rate limits see real client addresses.
- [ ] Redis is configured: it is needed for signing other devices out after a password change, and for shared rate limits.
- [ ] SMTP is configured and `MAIL_FROM` is a sender your provider has verified.
- [ ] OAuth:
  - The Google client lists the production origin under *Authorized JavaScript origins*.
  - The GitHub OAuth app's callback URL is `https://your.domain/signin`.
- [ ] `VITE_SITE_URL` is set at build time, so link previews use absolute image URLs.
- [ ] MongoDB is backed up, and its user has access only to this database.

## Testing and CI

```bash
cd client && npm run lint && npm test && npm run build
cd server && npm test
```

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs all of the above on every push and pull request. It adds a syntax check of every server module and `npm audit` of the production dependencies, and fails on any high or critical advisory.

## Security

- **Headers:** a Content-Security-Policy that allows only what the app loads: its own bundle, Google Fonts, Google sign-in, and the WebAssembly 3D decoder. Also no framing, `nosniff`, a strict referrer policy, and HSTS in production over https.
- **Sessions:**
  - Sessions are JWTs.
  - Changing or resetting a password ends every other session (this needs Redis).
  - Password-reset links are single-use, expire after 30 minutes, and are stored only as SHA-256 hashes.
- **Rate limits:** on sign-in, registration, password reset, account changes, race submissions and public profile reads.
- **Race submissions:**
  - The server re-derives WPM from per-character keystroke timings.
  - It rejects runs that are not shaped like human typing.
- **Accounts:**
  - Deleting an account removes its laps from every track board.
  - Deleting also hands each affected track record to the next driver.

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `/login`, `/google`, `/github`, `/forgot-password`, `/reset-password`; `GET /api/auth/check-username/:username`; `PUT /api/auth/update-username` |
| Users | `GET/PATCH/DELETE /api/users/me`; `PUT /api/users/me/password`, `/me/settings`; `GET /api/users/:username/public` |
| Races | `POST /api/races`; `GET /api/races/history` |
| Tracks | `GET /api/snippets/:id/leaderboard` (its P1 is the track record), `/:id/ghost` |
| Standings | `GET /api/leaderboard/standings?board=peak\|rating\|weekly`, `/global` |
| Health | `GET /health` (200 with MongoDB up, 503 without) |
