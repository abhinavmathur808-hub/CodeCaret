/* ══════════════════════════════════════════════════════════════
   userProfile — the one definition of "a user, as the client sees
   it", plus the caches that have to move in step with it.

   These lived inside routes/auth.js, which meant routes/users.js
   had no way to reuse them and hand-rolled its own response shape
   instead. The two drifted: /me omitted fullName, so the client
   cached a user WITH a name at signup and then replaced it with
   one WITHOUT a name on the next page load — the name silently
   disappeared on first refresh. One exported shape makes that
   class of drift impossible.
   ══════════════════════════════════════════════════════════════ */

const REDIS_SESSION_TTL = 60 * 60 * 24; // 24 hours in seconds

/** Escape a string for safe use inside a RegExp. */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Case-insensitive exact match, so "Ana" and "ana" are one name. */
const exactInsensitive = (value) =>
  new RegExp(`^${escapeRegex(value)}$`, "i");

/**
 * Strip sensitive fields and return the user object every endpoint
 * hands back. Add a field HERE and every route gains it at once.
 */
/**
 * What is wrong with a proposed password, or null when it is fine.
 *
 * Mirrors PASSWORD_RULES in client/src/components/F1AssemblyForm.jsx.
 * The client checklist is only a convenience — the policy has to hold
 * here too, or anything that posts straight to the API bypasses it.
 * Shared by sign-up, password reset and password change.
 */
function passwordProblem(password) {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128 ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return "Password needs at least 8 characters, one uppercase letter, one number and one special character";
  }
  return null;
}

const publicUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  fullName: user.fullName || "",
  peakWpm: user.peakWpm,
  averageWpm: user.averageWpm,
  totalRaces: user.totalRaces,
  /* Rating and streak travel with the profile so the UI can show
     them on page load, not only in the response to a race. */
  eloRating: user.eloRating ?? 1200,
  currentStreak: user.currentStreak ?? 0,
  maxStreak: user.maxStreak ?? 0,
  trophies: user.trophies ?? [],
  /* Which sign-in the account uses, so the client only offers a
     password change to accounts that have a password. */
  authProvider: user.authProvider || "email",
  createdAt: user.createdAt,
  settings: user.settings || {},
});

/**
 * Cache a user profile in Redis for fast subsequent fetches.
 * Fails silently so auth still works if Redis is down.
 */
const cacheUserProfile = async (redis, user) => {
  if (!redis || !redis.isReady) return;
  try {
    await redis.set(`user:${user._id}`, JSON.stringify(publicUser(user)), {
      EX: REDIS_SESSION_TTL,
    });
  } catch (err) {
    console.warn("⚠️  Redis cache write failed:", err.message);
  }
};

/* ══════════════════════════════════════════════════════════════
   Username generation for OAuth sign-ups.

   Google and GitHub hand back a display name and an email; neither
   is a username, and the account cannot be created without one
   because the leaderboard is keyed on it. So one is derived and
   made unique here.

   Uniqueness is checked case-insensitively for the same reason the
   email flow does it: the index is case-sensitive, so "Ana" and
   "ana" would otherwise become two accounts that then collide as
   one name on the board.
   ══════════════════════════════════════════════════════════════ */

/* The one definition of a legal username. Shared by every route that
   accepts one — PATCH /me, PUT /auth/update-username and the
   availability check — so the rules cannot drift between the place
   that tests a name and the place that saves it. */
const USERNAME_MIN = 3;
const USERNAME_MAX = 24;
const USERNAME_CHARS = /^[a-zA-Z0-9_.-]+$/;

/**
 * @param {unknown} raw
 * @returns {{ ok: true, value: string } | { ok: false, error: string }}
 */
function validateUsername(raw) {
  const value = String(raw ?? "").trim();

  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) {
    return {
      ok: false,
      error: `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`,
    };
  }
  if (!USERNAME_CHARS.test(value)) {
    return {
      ok: false,
      error: "Letters, numbers, dot, dash and underscore only",
    };
  }
  return { ok: true, value };
}

/** The legal-username core of a string, or "" if too little survives. */
function usableStem(raw) {
  const base = String(raw || "")
    .trim()
    .replace(/\s+/g, "_")
    // Same character class the profile editor enforces.
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .replace(/^[._-]+/, "")
    .slice(0, 24);
  return base.length >= 3 ? base : "";
}

/** Strip a display name or email prefix down to a legal username. */
function sanitizeUsername(raw) {
  /* Anything shorter than the 3-character minimum — a display name
     of "李" sanitizes to nothing at all — falls back to a generic
     stem rather than failing the sign-in. */
  return usableStem(raw) || "racer";
}

/**
 * A username nobody else holds, derived from an OAuth profile.
 *
 * @param {import("mongoose").Model} User
 * @param {{ name?: string, login?: string, email?: string }} profile
 */
async function generateUsername(User, profile) {
  /* Each source in turn, keeping the first that leaves a usable
     stem. Taking only the first NON-EMPTY source sent everyone whose
     display name is in a non-Latin script straight to "racer", even
     when their email address — "liming@…" for 李明 — would have made
     a name that is recognisably theirs. It is only the suggestion the
     picker opens with, but it is the first thing a new racer sees. */
  const base =
    [profile.login, profile.name, String(profile.email || "").split("@")[0]]
      .map(usableStem)
      .find(Boolean) || "racer";

  /* Try the bare name first, then append a counter. The suffix is
     trimmed out of the base rather than added to it so the result
     can never exceed the 24-character limit. */
  for (let attempt = 0; attempt < 50; attempt++) {
    const suffix = attempt === 0 ? "" : String(attempt + 1);
    const candidate = base.slice(0, 24 - suffix.length) + suffix;

    const taken = await User.exists({ username: exactInsensitive(candidate) });
    if (!taken) return candidate;
  }

  /* Fifty collisions on the same stem means something pathological.
     Random tail rather than an error: failing a sign-in over a name
     nobody chose would be a poor way to meet a new user. */
  return `${base.slice(0, 17)}_${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = {
  passwordProblem,
  REDIS_SESSION_TTL,
  escapeRegex,
  exactInsensitive,
  publicUser,
  cacheUserProfile,
  sanitizeUsername,
  generateUsername,
  validateUsername,
  USERNAME_MIN,
  USERNAME_MAX,
};
