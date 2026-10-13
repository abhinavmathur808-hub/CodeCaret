/**
 * Fixed-window rate limiter.
 *
 * Prefers Redis (so the limit holds across instances) and falls back
 * to an in-process map when Redis is unavailable, so a Redis outage
 * degrades the limit rather than removing it.
 *
 * No external dependency by design — the project already ships a
 * Redis client, and auth endpoints were previously unthrottled.
 */

/** In-process fallback: key → { count, resetAt }. */
const memoryHits = new Map();

/** Drop expired fallback entries so the map cannot grow without bound. */
function sweepMemory(now) {
  if (memoryHits.size < 1000) return;
  for (const [key, entry] of memoryHits) {
    if (entry.resetAt <= now) memoryHits.delete(key);
  }
}

function hitMemory(key, windowMs, now) {
  sweepMemory(now);

  const entry = memoryHits.get(key);
  if (!entry || entry.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    memoryHits.set(key, fresh);
    return fresh;
  }

  entry.count++;
  return entry;
}

/**
 * One round trip, and the counter can never outlive its window.
 *
 * This was INCR, then a separate EXPIRE when the count came back 1.
 * Two problems with that: it is three round trips per request, and
 * if the process died or the connection dropped between the two,
 * the key was left with no TTL at all — a counter that only ever
 * climbs, locking that address out of sign-in permanently.
 *
 * MULTI makes the pair atomic, and `expire(..., "NX")` sets the TTL
 * only when there is not one already, so a window is never extended
 * by the requests arriving inside it (which would turn a fixed
 * window into a sliding one that never resets under load).
 */
async function hitRedis(redis, key, windowSeconds) {
  const [count, , ttl] = await redis
    .multi()
    .incr(key)
    .expire(key, windowSeconds, "NX")
    .ttl(key)
    .exec();

  /* A key with no TTL reports -1, and -2 means it expired between
     the INCR and the TTL read. Treat both as "a full window from
     now" rather than letting a negative reach the Retry-After. */
  const seconds = typeof ttl === "number" && ttl >= 0 ? ttl : windowSeconds;

  return { count: Number(count), resetAt: Date.now() + seconds * 1000 };
}

/**
 * @param {object}  options
 * @param {number}  options.windowMs  Window length in ms.
 * @param {number}  options.max       Allowed requests per window.
 * @param {string}  options.name      Namespace, so limiters don't share counters.
 * @param {string} [options.message]  Response message on limit.
 */
function rateLimit({ windowMs, max, name, message }) {
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req, res, next) => {
    // req.ip honours trust proxy; fall back for odd transports.
    const who = req.ip || req.socket?.remoteAddress || "unknown";
    const key = `ratelimit:${name}:${who}`;
    const now = Date.now();

    let result;
    try {
      const redis = req.app.locals.redis;
      result =
        redis && redis.isReady
          ? await hitRedis(redis, key, windowSeconds)
          : hitMemory(key, windowMs, now);
    } catch {
      result = hitMemory(key, windowMs, now);
    }

    const remaining = Math.max(0, max - result.count);
    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(remaining));
    res.set("RateLimit-Reset", String(Math.ceil((result.resetAt - now) / 1000)));

    if (result.count > max) {
      const retryAfter = Math.max(1, Math.ceil((result.resetAt - now) / 1000));
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: message || "Too many requests. Please try again shortly.",
        retryAfter,
      });
    }

    next();
  };
}

module.exports = rateLimit;
