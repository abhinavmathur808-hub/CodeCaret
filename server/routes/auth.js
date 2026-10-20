const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const axios = require("axios");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const rateLimit = require("../middleware/rateLimit");
const authenticate = require("../middleware/auth");
const { signToken } = require("../utils/token");
const {
  exactInsensitive,
  publicUser,
  cacheUserProfile,
  generateUsername,
  validateUsername,
  passwordProblem,
} = require("../utils/userProfile");
const { sendMail } = require("../utils/mailer");
const { clientOrigin } = require("../config/env");
const { revokeSessions } = require("../utils/sessions");

const router = express.Router();

/* ── Throttling ───────────────────────────────────────────────
   These endpoints were unthrottled: an attacker could grind
   passwords or mass-create accounts as fast as the network allowed.
   ────────────────────────────────────────────────────────────── */
// Tuned to stop brute-force grinding (20 guesses per 15 min is far too
// slow to be useful) without tripping on shared/office IPs or repeated
// local test runs.
const loginLimiter = rateLimit({
  name: "login",
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many sign-in attempts. Please wait a few minutes.",
});

const registerLimiter = rateLimit({
  name: "register",
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many accounts created from this address. Try again later.",
});

/**
 * A real bcrypt hash of a value nobody can supply, compared against
 * when no account matches so that login timing does not reveal
 * whether an email is registered.
 */
const DUMMY_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.Ie.mVvBpNvGMuqLwGDLhZgvKlCkiZ8O";

// ── POST /api/auth/register ──────────────────────────────────
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // ── Validation ─────────────────────────────────────────
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "Email, username, and password are required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    // Same pattern as the sign-up form and the User schema.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }

    const weak = passwordProblem(password);
    if (weak) return res.status(400).json({ error: weak });

    /* The same check every other route that takes a username uses.
       This used to test length only, so registration accepted names
       the profile editor and the availability check both reject —
       spaces, punctuation, emoji, zero-width characters. They went
       straight onto the leaderboard, and a name carrying an invisible
       character is an impersonation of the one without it. */
    const nameCheck = validateUsername(username);
    if (!nameCheck.ok) {
      return res.status(400).json({ error: nameCheck.error });
    }
    const cleanUsername = nameCheck.value;

    const cleanName = String(fullName || "").trim();

    if (cleanName.length > 60) {
      return res
        .status(400)
        .json({ error: "Name must be at most 60 characters" });
    }

    // ── Check for existing user ────────────────────────────
    // Username is matched case-insensitively: the unique index is
    // case-sensitive, so "Ana" and "ana" would otherwise become two
    // accounts that then collide on the username-keyed leaderboard.
    const existingUser = await User.findOne({
      $or: [{ username: exactInsensitive(cleanUsername) }, { email: cleanEmail }],
    });

    if (existingUser) {
      const field =
        existingUser.username.toLowerCase() === cleanUsername.toLowerCase()
          ? "Username"
          : "Email";
      return res.status(409).json({ error: `${field} already taken` });
    }

    // ── Create user (pre-save hook auto-hashes authHash) ───
    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      ...(cleanName ? { fullName: cleanName } : {}),
      authHash: password, // plain password — pre-save hook hashes it
    });

    const token = signToken(user);

    await cacheUserProfile(req.app.locals.redis, user);

    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    // Handle Mongoose duplicate-key errors gracefully
    if (err.code === 11000) {
      /* `keyPattern` is not guaranteed — some driver and server
         combinations report only `keyValue` or just the message —
         and reading a key off undefined turned a 409 into a 500
         inside the handler meant to prevent one. */
      const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || "";
      return res
        .status(409)
        .json({ error: `${field === "email" ? "Email" : "Username"} already taken` });
    }
    console.error("Register error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required" });
    }

    const user = await User.findOne({
      email: String(email).trim().toLowerCase(),
    }).select("+authHash");

    /* Always run a bcrypt comparison, even when the account does not
       exist or somehow has no hash. Returning early made "no such
       user" measurably faster than "wrong password", which leaks
       whether an account exists. */
    const hash = user?.authHash || DUMMY_HASH;
    const isMatch = await bcrypt.compare(password, hash);

    if (!user || !user.authHash || !isMatch) {
      /* One message for every failure — wrong password, unknown email,
         or an account that signs in with Google/GitHub and has no
         password — so the reply never says which emails are
         registered. Plain words, though: "Invalid credentials" read
         like a system error, not like "check what you typed". */
      return res
        .status(401)
        .json({ error: "That email and password don't match. Check them and try again." });
    }

    const token = signToken(user);

    // ── Update session cache in Redis ──────────────────────
    await cacheUserProfile(req.app.locals.redis, user);

    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ══════════════════════════════════════════════════════════════
   Forgotten password

   POST /forgot-password emails a one-time link; POST /reset-password
   spends it. The link carries a random token, and only its SHA-256 is
   stored, valid for 30 minutes and for one use.

   /forgot-password answers the same way whether or not the email has
   an account, so it cannot be used to find out who is registered. An
   account that signs in with Google or GitHub has no password to
   reset; it is told so by email, which only the owner can read.
   ══════════════════════════════════════════════════════════════ */

const RESET_TTL_MS = 30 * 60 * 1000;

const forgotLimiter = rateLimit({
  name: "forgot-password",
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many reset requests. Please wait a few minutes.",
});

const resetLimiter = rateLimit({
  name: "reset-password",
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many attempts. Please wait a few minutes.",
});

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const CLIENT_URL = clientOrigin();

router.post("/forgot-password", forgotLimiter, async (req, res) => {
  const reply = () =>
    res.json({
      message: "If that email has a CodeCaret account, a reset link is on its way.",
    });
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }

    const user = await User.findOne({ email });
    if (!user) return reply();

    if (user.authProvider !== "email") {
      const provider = user.authProvider === "google" ? "Google" : "GitHub";
      await sendMail({
        to: user.email,
        subject: "Signing in to CodeCaret",
        text: `Someone asked to reset the password for ${user.username} on CodeCaret.\n\nThis account has no password: it signs in with ${provider}. Use "Continue with ${provider}" on ${CLIENT_URL}/signin.\n\nIf this wasn't you, you can ignore this email.`,
      });
      return reply();
    }

    const token = crypto.randomBytes(32).toString("hex");
    await User.updateOne(
      { _id: user._id },
      { $set: { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + RESET_TTL_MS) } }
    );

    const link = `${CLIENT_URL}/reset-password?token=${token}`;
    await sendMail({
      to: user.email,
      subject: "Reset your CodeCaret password",
      text: `Hi ${user.username},\n\nReset your password here (the link works once, for 30 minutes):\n${link}\n\nIf you didn't ask for this, ignore this email; your password stays as it is.`,
      html: `<p>Hi ${user.username},</p><p><a href="${link}">Reset your CodeCaret password</a>. The link works once, for 30 minutes.</p><p>If you didn't ask for this, ignore this email; your password stays as it is.</p>`,
    });
    return reply();
  } catch (err) {
    console.error("Forgot-password error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reset-password", resetLimiter, async (req, res) => {
  try {
    const token = String(req.body?.token || "");
    const password = req.body?.password;
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({ error: "This reset link is not valid. Ask for a new one." });
    }
    const weak = passwordProblem(password);
    if (weak) return res.status(400).json({ error: weak });

    const user = await User.findOne({
      resetTokenHash: sha256(token),
      resetTokenExpires: { $gt: new Date() },
    }).select("+authHash");
    if (!user) {
      return res
        .status(400)
        .json({ error: "This reset link has expired or was already used. Ask for a new one." });
    }

    user.authHash = password; // the pre-save hook hashes it
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    /* Every other device signed in with the old password is signed
       out; this one is handed a fresh session. */
    await revokeSessions(req.app.locals.redis, user._id);
    await cacheUserProfile(req.app.locals.redis, user);
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error("Reset-password error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ══════════════════════════════════════════════════════════════
   OAuth
   ══════════════════════════════════════════════════════════════ */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

/* GitHub rejects API requests that arrive with no User-Agent, and
   asks that it identify the application. Sent on the token exchange
   too, which is a github.com endpoint rather than an api.github.com
   one but documented the same way. */
const GITHUB_UA = "CodeCaret-App";

/* Must match the callback registered on the GitHub OAuth app AND the
   redirect_uri the client sent to /authorize — GitHub compares them
   and refuses the exchange if they differ. Derived from CLIENT_URL so
   there is one place to change when the app moves. */
const GITHUB_REDIRECT_URI = `${clientOrigin()}/signin`;

/* ── Tracing ──────────────────────────────────────────────────
   OAuth fails in a browser redirect, far from anywhere a stack
   trace lands, so the terminal is the only place the reason can
   show up. Each step logs on the way through; failures print what
   the provider actually said rather than a generic message.

   Deliberately logs shapes and statuses, never the code, the token
   or the secret. A log that leaks the thing it is debugging is a
   worse problem than the bug.
   ────────────────────────────────────────────────────────────── */
const log = (trace, step, detail) =>
  console.log(`[${trace}] ${step}`, detail === undefined ? "" : detail);

const logErr = (trace, step, detail) =>
  console.error(`[${trace}] ✗ ${step}`, detail === undefined ? "" : detail);

/* Lazily built so the server still boots without Google configured —
   the endpoint reports "not configured" instead of the process
   dying at require time. */
let googleClient = null;
const getGoogleClient = () => {
  if (!GOOGLE_CLIENT_ID) return null;
  if (!googleClient) googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
  return googleClient;
};

/* Same budget as password login: OAuth is cheaper to attempt than a
   bcrypt compare, so leaving it unthrottled would just move the
   grinding here. */
const oauthLimiter = rateLimit({
  name: "oauth",
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many sign-in attempts. Please wait a few minutes.",
});

/**
 * Find or create the account behind a verified OAuth identity.
 *
 * ── On linking by email ──────────────────────────────────────
 * Matching an existing account by email address is how a returning
 * user keeps their history — but it is also how an account gets
 * stolen. Anyone can put someone else's address on a GitHub
 * account; if that were enough to sign in as them, every
 * password-registered user would be one forged profile away from
 * losing their account.
 *
 * So an email only links when the PROVIDER states it is verified.
 * Google gives `email_verified`; GitHub marks its primary address
 * `verified`. An unverified address creates nothing and links
 * nothing — the caller turns that into a 403 telling the user to
 * verify with their provider first.
 */
async function findOrCreateOAuthUser({
  provider, // "google" | "github"
  providerId,
  email,
  emailVerified,
  displayName,
  login,
}) {
  const idField = provider === "google" ? "googleId" : "githubId";

  // 1. Returning user, matched on the provider's own id.
  const byProviderId = await User.findOne({ [idField]: providerId });
  if (byProviderId) return { user: byProviderId, created: false };

  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) {
    return { error: "no_email" };
  }
  if (!emailVerified) {
    return { error: "unverified_email" };
  }

  // 2. Existing account on the same verified address — link them.
  const byEmail = await User.findOne({ email: cleanEmail });
  if (byEmail) {
    byEmail[idField] = providerId;
    /* authProvider records how the account was ORIGINALLY created,
       so it is left alone here: a password user who later signs in
       with Google still has a password, and flipping this would
       make the schema's conditional `required` on authHash lie. */
    await byEmail.save();
    return { user: byEmail, created: false, linked: true };
  }

  // 3. Brand new account.
  const username = await generateUsername(User, {
    login,
    name: displayName,
    email: cleanEmail,
  });

  /* No authHash at all, rather than a random filler. A random
     password is a real credential that no one holds and no one can
     rotate; leaving the field absent makes "this account has no
     password" explicit, and the login route already refuses any
     account whose authHash is missing. */
  const user = await User.create({
    username,
    email: cleanEmail,
    fullName: String(displayName || "").trim().slice(0, 60),
    authProvider: provider,
    [idField]: providerId,
  });

  return { user, created: true };
}

/** Shared tail: cache, sign, respond. */
async function completeOAuth(req, res, result, provider) {
  if (result.error === "no_email") {
    return res.status(400).json({
      error: `Your ${provider} account has no email address available. Add one, or sign up with an email and password.`,
    });
  }
  if (result.error === "unverified_email") {
    return res.status(403).json({
      error: `Your ${provider} email address is not verified. Verify it with ${provider} and try again.`,
    });
  }

  const { user } = result;
  const token = signToken(user);
  await cacheUserProfile(req.app.locals.redis, user);

  res.status(result.created ? 201 : 200).json({
    token,
    user: publicUser(user),
    created: Boolean(result.created),
    /* Only on the sign-up that just created the account. A returning
       user has already chosen a name and must not be interrupted by
       the picker again — which is why this keys off `created` rather
       than off the username looking auto-generated. */
    isNewOAuthUser: Boolean(result.created),
  });
}

// ── POST /api/auth/google ────────────────────────────────────
// Body: { credential } — the ID token from Google Identity Services.
router.post("/google", oauthLimiter, async (req, res) => {
  try {
    const client = getGoogleClient();
    if (!client) {
      return res
        .status(503)
        .json({ error: "Google sign-in is not configured on this server." });
    }

    const { credential } = req.body;
    if (!credential || typeof credential !== "string") {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    /* verifyIdToken checks the signature, expiry AND audience. The
       audience check is the part that matters: without it a token
       minted for a different application would be accepted here. */
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: "Invalid Google credential" });
    }

    if (!payload?.sub) {
      return res.status(401).json({ error: "Invalid Google credential" });
    }

    const result = await findOrCreateOAuthUser({
      provider: "google",
      providerId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      displayName: payload.name,
    });

    await completeOAuth(req, res, result, "Google");
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "That account is already registered." });
    }
    console.error("Google OAuth error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/auth/github ────────────────────────────────────
// Body: { code } — the ?code= GitHub sends back to the redirect URI.
router.post("/github", oauthLimiter, async (req, res) => {
  try {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      return res
        .status(503)
        .json({ error: "GitHub sign-in is not configured on this server." });
    }

    const { code } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Missing GitHub code" });
    }

    /* Short id so concurrent sign-ins can be told apart in the log —
       without it two people failing at once interleave into one
       unreadable trace. */
    const trace = `gh:${Math.random().toString(36).slice(2, 8)}`;
    log(trace, "step 1 — code received", { length: code.length });

    /* 2. Exchange the one-time code for an access token.

       `validateStatus` accepts every response instead of throwing on
       4xx/5xx. Axios's default would turn a 404 or a rate-limit from
       GitHub into a thrown error caught by the generic handler
       below, which answers 500 — telling the user this server is
       broken when in fact their code was stale or GitHub was
       unreachable. Those are different problems with different
       fixes, and the status code should say which. */
    let tokenRes;
    try {
      tokenRes = await axios.post(
        GITHUB_TOKEN_URL,
        {
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          /* GitHub requires this to match the authorize step when one
             was sent there, and the client always sends one. */
          redirect_uri: GITHUB_REDIRECT_URI,
        },
        {
          headers: {
            /* Without this GitHub answers with a URL-encoded string
               and `data.access_token` is silently undefined. */
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": GITHUB_UA,
          },
          timeout: 10000,
          validateStatus: () => true,
        }
      );
    } catch (netErr) {
      /* Only a genuine transport failure reaches here now: DNS,
         refused connection, timeout. */
      logErr(trace, "token exchange unreachable", netErr.message);
      return res
        .status(502)
        .json({ error: "Could not reach GitHub. Please try again." });
    }

    log(trace, "step 2 — token endpoint answered", {
      status: tokenRes.status,
      contentType: tokenRes.headers?.["content-type"],
      /* The body shape matters more than the body: logging keys
         rather than values keeps the access token out of the log. */
      keys:
        tokenRes.data && typeof tokenRes.data === "object"
          ? Object.keys(tokenRes.data)
          : typeof tokenRes.data,
    });

    if (tokenRes.status >= 500) {
      logErr(trace, "GitHub 5xx on token exchange", tokenRes.status);
      return res
        .status(502)
        .json({ error: "GitHub is having trouble. Please try again." });
    }

    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      /* GitHub answers 200 with an `error` body for a spent or
         forged code, so the status alone proves nothing — but a
         4xx lands here too. Print exactly what came back: this is
         the single most useful line when the flow breaks, and it
         distinguishes a stale code from a misconfigured app from a
         blocked network. */
      logErr(trace, "no access_token in response", {
        status: tokenRes.status,
        error: tokenRes.data?.error,
        description: tokenRes.data?.error_description,
        raw:
          typeof tokenRes.data === "string"
            ? tokenRes.data.slice(0, 200)
            : JSON.stringify(tokenRes.data || {}).slice(0, 200),
      });
      return res.status(401).json({ error: "Invalid or expired GitHub code" });
    }

    const gh = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        /* GitHub rejects API requests with no User-Agent outright. */
        "User-Agent": GITHUB_UA,
      },
      timeout: 10000,
      validateStatus: () => true,
    };

    // 3. Profile, then addresses — the profile email may be private.
    const [profileRes, emailRes] = await Promise.all([
      axios.get("https://api.github.com/user", gh),
      axios.get("https://api.github.com/user/emails", gh),
    ]);

    log(trace, "step 3 — profile fetched", {
      status: profileRes.status,
      login: profileRes.data?.login,
      hasPublicEmail: Boolean(profileRes.data?.email),
    });

    const profile = profileRes.data;
    if (profileRes.status !== 200 || !profile?.id) {
      logErr(trace, "profile fetch failed", {
        status: profileRes.status,
        message: profile?.message,
      });
      return res.status(401).json({ error: "Could not read GitHub profile" });
    }

    /* The addresses call is the one most likely to fail on its own:
       it needs the `user:email` scope, and an app authorised before
       that scope was requested will 403 here while the profile call
       succeeds. That used to be swallowed by a `.catch(() => null)`,
       which turned a fixable scope problem into "your email is not
       verified" — a message pointing at the wrong thing entirely. */
    const addressesOk = emailRes.status === 200 && Array.isArray(emailRes.data);
    if (!addressesOk) {
      logErr(trace, "emails fetch failed", {
        status: emailRes.status,
        message: emailRes.data?.message,
        hint:
          emailRes.status === 403
            ? "the token is missing the user:email scope"
            : undefined,
      });
    }

    const addresses = addressesOk ? emailRes.data : [];

    /* Prefer the address GitHub itself calls primary and verified,
       then any verified one. profile.email is only whatever the user
       made public, which may be an alias they no longer control. */
    const primary =
      addresses.find((e) => e.primary && e.verified) ||
      addresses.find((e) => e.verified) ||
      null;

    log(trace, "step 4 — addresses resolved", {
      count: addresses.length,
      verified: addresses.filter((e) => e.verified).length,
      chose: primary?.email,
      /* A noreply address is usable — it is unique and GitHub
         verifies it — but it cannot receive mail, so it is worth
         seeing in the log when an account is created on one. */
      isNoReply: primary?.email?.endsWith("@users.noreply.github.com") || false,
    });

    if (!primary && addresses.length > 0) {
      logErr(trace, "no verified address among", addresses.length);
    }

    const result = await findOrCreateOAuthUser({
      provider: "github",
      providerId: String(profile.id),
      email: primary?.email || profile.email,
      emailVerified: Boolean(primary),
      displayName: profile.name || profile.login,
      login: profile.login,
    });

    log(trace, "step 5 — account resolved", {
      outcome: result.error || (result.created ? "created" : "signed in"),
      username: result.user?.username,
    });

    await completeOAuth(req, res, result, "GitHub");
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "That account is already registered." });
    }
    /* Anything reaching here is a genuine defect rather than a
       provider or user problem — every expected failure is handled
       above with its own status. Full stack, because there is no
       other record of it. */
    console.error("✗ GitHub OAuth — unhandled:", err.stack || err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ══════════════════════════════════════════════════════════════
   Driver ident — choosing a username after an OAuth sign-up
   ══════════════════════════════════════════════════════════════ */

/* Generous, because this fires on every keystroke of a name the user
   is still typing. Tight enough that it cannot be used to sweep the
   whole namespace. */
const usernameCheckLimiter = rateLimit({
  name: "username-check",
  windowMs: 5 * 60 * 1000,
  max: 120,
  message: "Too many checks. Please slow down.",
});

// ── GET /api/auth/check-username/:username ───────────────────
/* Public. Availability is not a secret — every username on the
   leaderboard is already visible — so this leaks nothing that the
   standings page does not. It is rate limited anyway, since a
   per-keystroke endpoint is an easy thing to point a script at. */
router.get("/check-username/:username", usernameCheckLimiter, async (req, res) => {
  try {
    const check = validateUsername(req.params.username);
    if (!check.ok) {
      /* 200, not 400: an illegal name is a normal state for a field
         someone is halfway through typing, and the client wants to
         render the reason rather than treat it as a failed request. */
      return res.json({ available: false, reason: check.error });
    }

    const taken = await User.exists({
      username: exactInsensitive(check.value),
    });

    res.json({
      username: check.value,
      available: !taken,
      reason: taken ? "That name is already on the grid" : null,
    });
  } catch (err) {
    console.error("check-username error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/auth/update-username ────────────────────────────
/* Protected by the pending token from the OAuth response — the same
   JWT the client is holding but has not yet committed to storage.
   `authenticate` treats it like any other session token, which is
   what lets this run before the user is formally "signed in". */
router.put("/update-username", authenticate, async (req, res) => {
  try {
    const check = validateUsername(req.body?.username);
    if (!check.ok) return res.status(400).json({ error: check.error });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    /* Excluding self, so re-confirming the name you already hold is
       not reported as a collision with yourself. */
    if (check.value.toLowerCase() !== user.username.toLowerCase()) {
      const taken = await User.findOne({
        _id: { $ne: user._id },
        username: exactInsensitive(check.value),
      });
      if (taken) {
        return res.status(409).json({ error: "That name is already on the grid" });
      }
    }

    user.username = check.value;
    await user.save();

    await cacheUserProfile(req.app.locals.redis, user);

    /* A fresh token: the old one carries the auto-generated username
       in its payload, and anything reading `req.user.username` from
       it afterwards would report the name the user just replaced. */
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "That name is already on the grid" });
    }
    console.error("update-username error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
/* Exported for tests: this is the security-critical half of OAuth —
   the rule about when an email may and may not link to an existing
   account — and it is worth being able to assert on directly. */
module.exports.findOrCreateOAuthUser = findOrCreateOAuthUser;
