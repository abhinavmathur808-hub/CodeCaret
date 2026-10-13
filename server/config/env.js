/* ══════════════════════════════════════════════════════════════
   env — the server's configuration, checked once at boot.

   Missing or unsafe settings stop the process before it listens, with
   one message naming everything that needs fixing, rather than
   surfacing later as a failed sign-in or a silently open CORS policy.

   Production is stricter than development: a short JWT secret or a
   missing CLIENT_URL are fine on a laptop and a real problem on the
   internet.
   ══════════════════════════════════════════════════════════════ */

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/* A JWT signed with a short secret can be brute-forced offline from a
   single token; 32 characters of randomness puts that out of reach.
   Generate one with:
     node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))" */
const MIN_SECRET_LENGTH = 32;

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Check the environment. Returns { errors, warnings }; the caller
 * decides how to report them. Pure, so it can be unit-tested.
 */
function checkEnv(env = process.env) {
  const production = env.NODE_ENV === "production";
  const errors = [];
  const warnings = [];

  for (const key of ["JWT_SECRET", "MONGODB_URI"]) {
    if (!env[key]) errors.push(`${key} is required.`);
  }

  if (env.CLIENT_URL && !isHttpUrl(env.CLIENT_URL)) {
    errors.push("CLIENT_URL must be a full http(s) origin, e.g. https://codecaret.app.");
  }

  if (production) {
    if (env.JWT_SECRET && env.JWT_SECRET.length < MIN_SECRET_LENGTH) {
      errors.push(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters in production.`);
    }
    if (!env.CLIENT_URL) {
      errors.push("CLIENT_URL is required in production: it is the only origin CORS allows and the base of emailed links.");
    } else if (!env.CLIENT_URL.startsWith("https://")) {
      warnings.push("CLIENT_URL is not https. Sessions and passwords would cross the network unencrypted.");
    }
    if (!env.REDIS_URL) {
      warnings.push("REDIS_URL is not set: rate limits count per process, and a password change cannot sign other devices out.");
    }
    if (!env.SMTP_HOST) {
      warnings.push("SMTP_HOST is not set: password-reset emails will not be sent.");
    }
  }

  return { errors, warnings };
}

/** Check, report, and stop the process if anything is wrong. */
function assertEnv() {
  const { errors, warnings } = checkEnv();
  for (const w of warnings) console.warn(`⚠️  ${w}`);
  if (errors.length > 0) {
    console.error(
      `❌ The server cannot start:\n${errors.map((e) => `   • ${e}`).join("\n")}\n` +
        "   Set these in server/.env (see server/.env.example)."
    );
    process.exit(1);
  }
}

module.exports = { IS_PRODUCTION, checkEnv, assertEnv, MIN_SECRET_LENGTH };
