/* ══════════════════════════════════════════════════════════════
   token — the one place a session JWT is minted.

   The payload carries the username as well as the id, and that is
   why this is shared rather than a local helper in routes/auth.js:
   anything that changes a username has to re-issue the token too,
   or the old name keeps travelling with every request the client
   makes afterwards. routes/users.js needs to do that as much as
   routes/auth.js does, and a second copy of the signing config is
   how the two drift apart.
   ══════════════════════════════════════════════════════════════ */

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Sign a session token for a user document.
 *
 * @param {{ _id: unknown, username: string }} user
 * @returns {string}
 */
const signToken = (user) =>
  jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

module.exports = { signToken, JWT_EXPIRES_IN };
