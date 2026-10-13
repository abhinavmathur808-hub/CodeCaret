/* ══════════════════════════════════════════════════════════════
   clientApp — serve the built client from this server.

   One process, one origin: the browser talks to the API on the same
   host it loaded the app from, so there is no CORS to configure and
   one thing to deploy. Optional — the client can equally be hosted on
   its own (a CDN, Vercel, Netlify) with VITE_SERVER_URL pointing here.

   Caching follows how Vite names files:
     /assets/*     content-hashed, so a year and immutable; a missing
                   one is a real 404, never index.html (a stale tab
                   after a deploy then reloads instead of running HTML
                   as JavaScript)
     index.html    never cached, so a deploy is picked up on the next
                   load
     the rest      icons, the manifest, the 3D model: an hour
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");
const express = require("express");

/**
 * Mount the client on `app` if a build exists at `distDir`.
 * Call AFTER the API routes, so they always win.
 * @returns {boolean} whether the client is being served
 */
function mountClient(app, distDir) {
  const indexHtml = path.join(distDir, "index.html");
  if (!fs.existsSync(indexHtml)) return false;

  app.use(
    "/assets",
    express.static(path.join(distDir, "assets"), {
      immutable: true,
      maxAge: "365d",
      index: false,
      fallthrough: false,
    })
  );

  app.use(
    express.static(distDir, {
      index: false,
      maxAge: "1h",
      setHeaders(res, file) {
        if (file.endsWith(".webmanifest")) res.type("application/manifest+json");
        if (file.endsWith(".html")) res.set("Cache-Control", "no-cache");
      },
    })
  );

  /* Client-side routes: any other page request gets the app, which
     routes it (and shows its own 404 for paths it does not know). */
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api/") || req.path === "/health") return next();
    if (!req.accepts("html")) return next();
    res.set("Cache-Control", "no-cache");
    res.sendFile(indexHtml);
  });

  return true;
}

module.exports = { mountClient };
