const jwt = require("jsonwebtoken");
const { isRevoked } = require("../utils/sessions");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * JWT authentication middleware.
 * Expects header: Authorization: Bearer <token>
 * Attaches `req.user = { id, username }` on success.
 */
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = header.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const message =
      err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return res.status(401).json({ error: message });
  }

  /* Signed before the account's password last changed: that session
     was ended by the change (see utils/sessions.js). */
  if (await isRevoked(req.app.locals.redis, decoded)) {
    return res.status(401).json({ error: "Session ended. Sign in again." });
  }

  req.user = { id: decoded.id, username: decoded.username };
  next();
};

/**
 * Like `authenticate`, but never refuses the request.
 *
 * For public reads that say a little more to a signed-in caller —
 * a track's board is the same for everyone, plus "and here is where
 * YOU stand" when it knows who is asking. A missing, malformed or
 * expired token is simply treated as an anonymous visitor: the board
 * is not a reason to fail, and a 401 here would blank it for exactly
 * the people a stale session already inconveniences.
 */
const optionalAuth = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
      if (!(await isRevoked(req.app.locals.redis, decoded))) {
        req.user = { id: decoded.id, username: decoded.username };
      }
    } catch {
      // Anonymous it is.
    }
  }
  next();
};

module.exports = authenticate;
module.exports.optionalAuth = optionalAuth;
