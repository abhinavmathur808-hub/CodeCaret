const { createClient } = require("redis");

/**
 * Redis client singleton.
 * Configured with reconnect strategy and event logging.
 */
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("❌ Redis max retries reached — stopping reconnect");
        return new Error("Redis max retries");
      }
      const delay = Math.min(retries * 200, 3000);
      console.warn(`⚠️  Redis reconnect attempt ${retries} in ${delay}ms…`);
      return delay;
    },
  },
});

redisClient.on("error", (err) =>
  console.error("❌ Redis error:", err.message)
);
redisClient.on("connect", () => console.log("✅ Redis connected"));
redisClient.on("reconnecting", () =>
  console.warn("⚠️  Redis reconnecting…")
);

/**
 * Connect to Redis. Call once at startup.
 *
 * Rejects on failure. It used to swallow the error, which meant the
 * boot sequence's Promise.allSettled always saw this as fulfilled —
 * so the "Starting without Redis" warning it prints on the rejected
 * branch could never fire, and a Redis outage started the server
 * looking exactly like a healthy one. Mongo's connector already
 * rethrows for the same reason.
 */
const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log("✅ Redis client ready");
  } catch (err) {
    console.error("❌ Could not connect to Redis:", err.message);
    throw err;
  }
};

module.exports = { redisClient, connectRedis };
