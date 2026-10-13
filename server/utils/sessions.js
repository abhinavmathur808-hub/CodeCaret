/* ══════════════════════════════════════════════════════════════
   sessions — ending every session an account has open.

   Sessions are JWTs, which cannot be taken back once issued. After a
   password change or reset, though, every device signed in with the
   old password has to be signed out — a reset is usually the answer
   to "someone else may have my password".

   So the moment of the change is recorded, and a token issued before
   it is refused. Kept in Redis, which the auth middleware can read
   without a database round trip on every request; it only has to
   outlive the longest token, so it expires on its own.

   Without Redis the check is skipped rather than failing every
   request: the password itself has still changed.
   ══════════════════════════════════════════════════════════════ */

/* Longer than any token lives (JWT_EXPIRES_IN is 7d by default). */
const REVOCATION_TTL = 60 * 60 * 24 * 30;

const key = (userId) => `sessions-from:${userId}`;

/**
 * End every session issued before now. A token minted afterwards in
 * the same second — the one handed back to the device that made the
 * change — stays valid, because `iat` is in whole seconds.
 */
async function revokeSessions(redis, userId) {
  if (!redis?.isReady) return;
  try {
    await redis.set(key(userId), String(Math.floor(Date.now() / 1000)), {
      EX: REVOCATION_TTL,
    });
  } catch (err) {
    console.warn("⚠️  Session revocation write failed:", err.message);
  }
}

/** Whether a verified token was issued before its account's cut-off. */
async function isRevoked(redis, decoded) {
  if (!redis?.isReady || !decoded?.id) return false;
  try {
    const from = Number(await redis.get(key(decoded.id)));
    return Number.isFinite(from) && from > 0 && decoded.iat < from;
  } catch {
    return false;
  }
}

module.exports = { revokeSessions, isRevoked };
