/* ══════════════════════════════════════════════════════════════
   security — response headers for the API and, when this server also
   serves the built client, for the app's pages.

   The Content-Security-Policy lists exactly what the client loads:

     scripts   its own bundle, Google's sign-in script, and WebAssembly
               (the Draco decoder that unpacks the 3D car)
     workers   blob: workers, which the Draco decoder starts
     styles    its own CSS, Google Fonts, Google's sign-in styles, and
               inline <style> elements (components render a few)
     fonts     Google Fonts
     frames    Google's sign-in button, which is an iframe
     connect   this origin, and Google's sign-in endpoints

   Anything else — a script injected through a bug, a page framing the
   app to trick clicks — is refused by the browser.
   ══════════════════════════════════════════════════════════════ */

const helmet = require("helmet");

const GOOGLE_SIGN_IN = "https://accounts.google.com";

/**
 * @param {object}  opts
 * @param {boolean} opts.production  HSTS and https upgrades only apply here.
 * @param {string}  opts.clientUrl   The public origin; https decides upgrades.
 */
function securityHeaders({ production, clientUrl = "" }) {
  const https = clientUrl.startsWith("https://");

  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'wasm-unsafe-eval'", GOOGLE_SIGN_IN],
        workerSrc: ["'self'", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", GOOGLE_SIGN_IN],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:"],
        mediaSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", GOOGLE_SIGN_IN],
        frameSrc: [GOOGLE_SIGN_IN],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        /* Only when the site is served over https: on plain http this
           would rewrite the app's own requests to https and break them. */
        ...(https ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    /* Google's sign-in opens a popup and reads its result back. */
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    /* The app embeds nothing that would need isolation. */
    crossOriginEmbedderPolicy: false,
    /* An API on api.example.com serving a client on example.com is
       same-site; allow that split as well as a single origin. */
    crossOriginResourcePolicy: { policy: "same-site" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    strictTransportSecurity: production && https ? { maxAge: 31536000, includeSubDomains: true } : false,
  });
}

module.exports = { securityHeaders };
