require("dotenv").config({ quiet: true });
const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const compression = require("compression");
const mongoose = require("mongoose");

// ── Configuration, checked before anything else loads ───────
const { assertEnv, IS_PRODUCTION } = require("./config/env");
assertEnv();

// ── Config modules ──────────────────────────────────────────
const connectMongo = require("./config/db");
const { dropStaleIndexes } = require("./models/staleIndexes");
const { redisClient, connectRedis } = require("./config/redisClient");

// ── Route modules ───────────────────────────────────────────
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const leaderboardRoutes = require("./routes/leaderboard");
const snippetRoutes = require("./routes/snippets");
const racesRoutes = require("./routes/races");
const { securityHeaders } = require("./middleware/security");
const { mountClient } = require("./utils/clientApp");

// ── Express App ──────────────────────────────────────────────
const app = express();

/* No "X-Powered-By: Express": it tells a scanner what to try. */
app.disable("x-powered-by");

/* ── CORS ─────────────────────────────────────────────────────
   Production answers exactly one origin: CLIENT_URL.

   Development also answers any loopback origin, on any port. Vite
   takes 5173 if it can and silently moves to 5174, 5175… when it
   cannot — a second project, a stale dev server, a preview tool. With
   only CLIENT_URL allowed, the client on the shifted port had every
   request blocked by the browser, and a blocked request surfaces in
   fetch exactly like a server that is down: the app reported "is the
   server running?" against a server that was running fine. Nothing
   outside this machine can send a loopback Origin, so allowing them
   in development opens nothing. */
const CORS_ORIGIN = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

app.use(securityHeaders({ production: IS_PRODUCTION, clientUrl: CORS_ORIGIN }));
app.use(compression());

app.use(
  cors({
    origin(origin, callback) {
      /* No Origin at all: curl, server-to-server, same-origin. CORS is
         a browser rule, so there is nothing to enforce. */
      if (!origin) return callback(null, true);
      if (origin === CORS_ORIGIN) return callback(null, true);
      if (!IS_PRODUCTION && LOOPBACK_ORIGIN.test(origin)) return callback(null, true);
      // Not allowed: answer without the header, so the browser refuses.
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
/* ── Proxy trust ──────────────────────────────────────────────
   Behind a proxy or load balancer, req.ip must reflect the client so
   the auth rate limiter keys on the right address.

   Parsed rather than passed through. Express treats a STRING setting
   as a comma-separated list of trusted addresses, and env values are
   always strings — so `TRUST_PROXY=true` was handed to proxy-addr as
   an IP and threw "invalid IP address: true" before the server could
   listen. The one spelling an operator is most likely to reach for
   was the one that refused to boot.

   Accepts: true/false, a hop count, or a list of IPs and subnets. */
function parseTrustProxy(raw) {
  if (raw === undefined || raw === null || raw === "") return false;

  const value = String(raw).trim();
  if (/^(true|yes|on)$/i.test(value)) return true;
  if (/^(false|no|off)$/i.test(value)) return false;

  // A hop count — "1" means "the nearest proxy is ours".
  if (/^\d+$/.test(value)) return Number(value);

  // Anything else is an address list, which Express parses itself.
  return value;
}

app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

// 5mb was well beyond anything this API accepts.
app.use(express.json({ limit: "256kb" }));

// ── Health Check ─────────────────────────────────────────────
// For load balancers and uptime monitors: 200 while MongoDB is
// reachable, 503 when it is not.
app.get("/health", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  const health = {
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
    services: {
      mongo:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      redis: redisClient.isReady ? "connected" : "disconnected",
    },
  };
  const httpStatus = health.services.mongo === "connected" ? 200 : 503;
  res.status(httpStatus).json(health);
});

// ── HTTP ─────────────────────────────────────────────────────
const server = http.createServer(app);


// ── Database Connections ─────────────────────────────────────


/** Bring up both datastores. */
async function bootstrapDatastores() {
  app.locals.redis = redisClient;

  const [mongoResult, redisResult] = await Promise.allSettled([
    connectMongo(),
    connectRedis(),
  ]);

  /* Only once Mongo is actually up — a dropIndex against a dead
     connection would just queue and then fail confusingly. */
  if (mongoResult.status === "fulfilled") {
    await dropStaleIndexes().catch((err) =>
      console.warn("⚠️  Index cleanup skipped:", err.message)
    );
  }

  if (mongoResult.status === "rejected") {
    console.error(
      "⚠️  Starting without MongoDB — retrying in the background. " +
        "Auth and race persistence will fail until it connects."
    );
  }
  if (redisResult.status === "rejected") {
    console.error("⚠️  Starting without Redis — profile caching is unavailable.");
  }
}

bootstrapDatastores();

// ── API Routes ───────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/snippets", snippetRoutes);
app.use("/api/races", racesRoutes);

/* ── The client ───────────────────────────────────────────────
   In production this server also serves the built client (client/
   dist), so one process is the whole site. CLIENT_DIST points it at a
   build elsewhere; SERVE_CLIENT=false turns it off when the client is
   hosted separately. Never in development — Vite serves it there. */
const CLIENT_DIST = process.env.CLIENT_DIST || path.resolve(__dirname, "../client/dist");
const serveClient =
  process.env.SERVE_CLIENT === "true" || (IS_PRODUCTION && process.env.SERVE_CLIENT !== "false");
if (serveClient && mountClient(app, CLIENT_DIST)) {
  console.log(`🖥️  Serving the client from ${CLIENT_DIST}`);
} else if (serveClient) {
  console.warn(`⚠️  No client build at ${CLIENT_DIST}; serving the API only.`);
}

// ── Global Error-Handling Middleware ─────────────────────────
// 404 handler — must come after all routes
app.use((_req, res, _next) => {
  res.status(404).json({ error: "Route not found" });
});

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("💥 Unhandled error:", err.stack || err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: IS_PRODUCTION ? "Internal server error" : err.message,
  });
});

// ── Graceful Shutdown ────────────────────────────────────────
let shuttingDown = false;
const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n🛑 ${signal} received — shutting down gracefully…`);

  server.close(async () => {
    await mongoose.connection.close().catch(() => {});
    await redisClient.quit().catch(() => {});
    console.log("👋 All connections closed. Goodbye.");
    process.exit(exitCode);
  });

  // Force exit after 10s. unref'd so it never holds the process open
  // when everything closed cleanly.
  const forceExit = setTimeout(() => {
    console.error("⚠️  Forced exit after 10s shutdown timeout");
    process.exit(1);
  }, 10000);
  forceExit.unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

/* A promise nobody handled is a bug, but not one worth dropping every
   other request over: log it loudly and carry on. An exception that
   escaped everything leaves the process in an unknown state, so that
   one shuts down — the process manager starts a clean one. */
process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled promise rejection:", reason instanceof Error ? reason.stack : reason);
});
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught exception:", err.stack || err.message);
  shutdown("uncaughtException", 1);
});

// ── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

/* Longer than the idle timeout of common load balancers (60s on AWS
   ALB, for one), so the balancer always closes an idle connection
   first. The other way round, it can send a request down a socket
   this server is closing, and the client gets a 502. */
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT} (${IS_PRODUCTION ? "production" : "development"})`);
});

module.exports = { app, server, redisClient };
