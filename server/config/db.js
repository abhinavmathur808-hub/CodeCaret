const mongoose = require("mongoose");

/**
 * Connect to MongoDB with retry logic.
 * Exports a callable so index.js can await the initial connection.
 */
const MAX_RETRY_DELAY_MS = 30_000;

const connectMongo = async (attempt = 1) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
    });
    console.log("✅ MongoDB connected");
    return mongoose.connection;
  } catch (err) {
    console.error(
      `❌ MongoDB connection error (attempt ${attempt}):`,
      err.message
    );

    // Exponential backoff, capped. Retry in the background but reject
    // so the caller knows this attempt failed — resolving here made a
    // failed startup look identical to a successful one.
    const delay = Math.min(5000 * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
    const timer = setTimeout(() => {
      connectMongo(attempt + 1).catch(() => {});
    }, delay);
    timer.unref?.();

    throw err;
  }
};

// Runtime event listeners
mongoose.connection.on("disconnected", () =>
  console.warn("⚠️  MongoDB disconnected — attempting reconnect…")
);
mongoose.connection.on("error", (err) =>
  console.error("❌ MongoDB runtime error:", err.message)
);

module.exports = connectMongo;
