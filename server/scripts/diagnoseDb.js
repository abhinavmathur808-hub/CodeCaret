/**
 * diagnoseDb.js — MongoDB Atlas Connection Diagnostics
 *
 * Usage:  node scripts/diagnoseDb.js
 * Run from the /server directory so .env is found.
 */

require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");

/* ── Helpers ──────────────────────────────────────────────────── */

const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const ok = (msg) => console.log(`${GREEN}  ✅ ${msg}${RESET}`);
const warn = (msg) => console.log(`${YELLOW}  ⚠️  ${msg}${RESET}`);
const fail = (msg) => console.log(`${RED}  ❌ ${msg}${RESET}`);
const info = (msg) => console.log(`${CYAN}  ℹ️  ${msg}${RESET}`);
const heading = (msg) => console.log(`\n${BOLD}${msg}${RESET}`);
const dim = (msg) => console.log(`${DIM}     ${msg}${RESET}`);

const SPECIAL_CHARS_RE = /[@#?%&=+,/:;]/;
/** Same class, global — used to list which characters offended. */
const SPECIAL_CHARS_ALL = /[@#?%&=+,/:;]/g;

/* ── Step 1: Parse & Validate the URI ─────────────────────────── */

function parseAndValidateUri() {
  heading("STEP 1 — URI Parser");

  const raw = process.env.MONGODB_URI;

  if (!raw) {
    fail("MONGODB_URI is not set in .env");
    process.exit(1);
  }

  ok("MONGODB_URI is present in .env");
  dim(`Length: ${raw.length} chars`);

  // Extract components using URL parser
  let url;
  try {
    // mongodb+srv:// → replace with https:// temporarily for URL parsing
    const parseable = raw.replace(/^mongodb(\+srv)?:\/\//, "https://");
    url = new URL(parseable);
  } catch {
    fail("MONGODB_URI is not a valid URL — check the format");
    dim(`Raw value starts with: ${raw.slice(0, 30)}…`);
    process.exit(1);
  }

  const protocol = raw.startsWith("mongodb+srv") ? "mongodb+srv" : "mongodb";

  /* decodeURIComponent throws on a stray '%' — which is exactly the
     kind of malformed credential this script exists to diagnose, so
     it must not be the thing that crashes it. */
  const safeDecode = (s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };

  const username = safeDecode(url.username);
  const password = safeDecode(url.password);
  const host = url.hostname;
  const dbName = url.pathname.replace("/", "") || "(default)";

  info(`Protocol : ${protocol}`);
  info(`Host     : ${host}`);
  info(`Username : ${username}`);
  info(`Database : ${dbName}`);
  dim(`Password : ${"•".repeat(Math.min(password.length, 20))} (${password.length} chars)`);

  /* ── Unencoded characters in the password ─────────────────────
     The credential segment is everything between "//" and the LAST
     "@" before the host. Anchoring on the last one matters: the
     previous pattern stopped at the first, so a password containing
     "@" — the single most common reason a URI fails to parse, and
     the first character this check lists — could never be seen by
     the check meant to catch it. */
  const credentialMatch = raw.match(/^mongodb(?:\+srv)?:\/\/(.*)@[^@]*$/);
  if (credentialMatch) {
    const credentials = credentialMatch[1];
    const splitAt = credentials.indexOf(":");
    const rawUser = splitAt === -1 ? credentials : credentials.slice(0, splitAt);
    const rawPassword = splitAt === -1 ? "" : credentials.slice(splitAt + 1);

    if (rawPassword && SPECIAL_CHARS_RE.test(rawPassword)) {
      const encoded = encodeURIComponent(rawPassword);
      if (encoded !== rawPassword) {
        warn(`${BOLD}Password contains unencoded special characters!${RESET}`);
        /* The characters, never the password. Everything else here
           is careful to mask it — printing it in full to diagnose an
           encoding problem defeats that, and a terminal scrollback
           or a pasted bug report then carries the credential. */
        const offenders = [...new Set(rawPassword.match(SPECIAL_CHARS_ALL) || [])];
        dim(`Offending character(s): ${offenders.join(" ")}`);
        dim(`Password is ${rawPassword.length} chars, ${encoded.length} once encoded`);
        warn("Auto-encoding the password for subsequent tests…");

        /* Rebuilt from its parts rather than string-replaced: the
           password is attacker-shaped data as far as this script is
           concerned, and feeding it back into a replace() pattern is
           how a '$' in a password corrupts the URI it is fixing. */
        const scheme = raw.slice(0, raw.indexOf("://") + 3);
        const afterCredentials = raw.slice(raw.lastIndexOf("@") + 1);
        const fixed = `${scheme}${encodeURIComponent(rawUser)}:${encoded}@${afterCredentials}`;

        process.env.MONGODB_URI = fixed;
        return { host, protocol, uri: fixed, passwordWasFixed: true };
      }
    }

    ok("Password has no unencoded special characters");
  }

  return { host, protocol, uri: raw, passwordWasFixed: false };
}

/* ── Step 2: DNS SRV Resolution ───────────────────────────────── */

function testDns(host, protocol) {
  return new Promise((resolve) => {
    heading("STEP 2 — DNS SRV Lookup");

    /* Only mongodb+srv:// uses SRV records. A plain mongodb:// URI —
       including the localhost default in .env.example — has none, so
       this lookup always failed and printed a full-screen "YOUR
       NETWORK IS BLOCKING MONGODB ATLAS" banner at anyone running
       against a local database. The step does not apply; say so and
       move on. */
    if (protocol !== "mongodb+srv") {
      info("Skipped — this is a direct mongodb:// URI, which uses no SRV records.");
      resolve(true);
      return;
    }

    const srvHostname = `_mongodb._tcp.${host}`;
    info(`Resolving: ${srvHostname}`);

    dns.resolveSrv(srvHostname, (err, addresses) => {
      if (err) {
        fail(`DNS SRV lookup failed: ${err.code || err.message}`);
        dim(`Full error: ${err.message}`);
        console.log("");
        console.log(
          `${BOLD}${RED}  ╔════════════════════════════════════════════════════════════════╗${RESET}`
        );
        console.log(
          `${BOLD}${RED}  ║  YOUR NETWORK IS BLOCKING MONGODB ATLAS DNS RESOLUTION       ║${RESET}`
        );
        console.log(
          `${BOLD}${RED}  ╠════════════════════════════════════════════════════════════════╣${RESET}`
        );
        console.log(
          `${BOLD}${YELLOW}  ║  Your current Wi-Fi / ISP is blocking SRV record lookups     ║${RESET}`
        );
        console.log(
          `${BOLD}${YELLOW}  ║  for MongoDB Atlas clusters. This is common on:              ║${RESET}`
        );
        console.log(
          `${BOLD}${YELLOW}  ║                                                              ║${RESET}`
        );
        console.log(
          `${BOLD}${YELLOW}  ║    • College / university Wi-Fi networks                     ║${RESET}`
        );
        console.log(
          `${BOLD}${YELLOW}  ║    • Corporate firewalls / VPNs                              ║${RESET}`
        );
        console.log(
          `${BOLD}${YELLOW}  ║    • ISPs that filter DNS (Jio, Airtel, etc.)                ║${RESET}`
        );
        console.log(
          `${BOLD}${YELLOW}  ║                                                              ║${RESET}`
        );
        console.log(
          `${BOLD}${GREEN}  ║  FIX: Switch to a mobile hotspot or use a VPN, then retry.   ║${RESET}`
        );
        console.log(
          `${BOLD}${GREEN}  ║  ALT: Use Google DNS (8.8.8.8) or Cloudflare DNS (1.1.1.1).  ║${RESET}`
        );
        console.log(
          `${BOLD}${RED}  ╚════════════════════════════════════════════════════════════════╝${RESET}`
        );
        console.log("");

        resolve(false);
        return;
      }

      ok(`DNS resolved — ${addresses.length} SRV record(s) found`);
      addresses.forEach((a) =>
        dim(`→ ${a.name}:${a.port} (priority ${a.priority}, weight ${a.weight})`)
      );
      resolve(true);
    });
  });
}

/* ── Step 3: Mongoose Connection Test ─────────────────────────── */

async function testMongoose(uri) {
  heading("STEP 3 — Mongoose Connection Test");

  info("Attempting mongoose.connect() with 10s timeout…");

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10_000,
      connectTimeoutMS: 10_000,
      maxPoolSize: 1,
    });

    ok("Successfully connected to MongoDB Atlas!");

    // Quick sanity check — list collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    dim(`Database has ${collections.length} collection(s): ${collections.map((c) => c.name).join(", ") || "(empty)"}`);

    await mongoose.connection.close();
    ok("Connection closed cleanly");
    return true;
  } catch (err) {
    fail(`Mongoose connection failed: ${err.message}`);
    dim(`Error name: ${err.name}`);
    dim(`Error code: ${err.code || "N/A"}`);

    const msg = (err.message || "").toLowerCase();

    // ── Authentication / IP Whitelist errors ──────────────────
    if (
      msg.includes("authentication failed") ||
      msg.includes("auth") ||
      msg.includes("not authorized") ||
      msg.includes("bad auth") ||
      err.code === 8000 ||
      err.codeName === "AtlasError"
    ) {
      console.log("");
      console.log(
        `${BOLD}${RED}  ╔════════════════════════════════════════════════════════════════╗${RESET}`
      );
      console.log(
        `${BOLD}${RED}  ║  AUTHENTICATION / IP WHITELIST ERROR                          ║${RESET}`
      );
      console.log(
        `${BOLD}${RED}  ╠════════════════════════════════════════════════════════════════╣${RESET}`
      );
      console.log(
        `${BOLD}${YELLOW}  ║  This usually means your IP address is not whitelisted        ║${RESET}`
      );
      console.log(
        `${BOLD}${YELLOW}  ║  in MongoDB Atlas, or the credentials are wrong.             ║${RESET}`
      );
      console.log(
        `${BOLD}${YELLOW}  ║                                                              ║${RESET}`
      );
      console.log(
        `${BOLD}${GREEN}  ║  FIX — Go to the MongoDB Atlas Dashboard:                    ║${RESET}`
      );
      console.log(
        `${BOLD}${GREEN}  ║                                                              ║${RESET}`
      );
      console.log(
        `${BOLD}${GREEN}  ║    1. https://cloud.mongodb.com                              ║${RESET}`
      );
      console.log(
        `${BOLD}${GREEN}  ║    2. Select your project → Network Access (left sidebar)    ║${RESET}`
      );
      console.log(
        `${BOLD}${GREEN}  ║    3. Click "+ Add IP Address"                               ║${RESET}`
      );
      console.log(
        `${BOLD}${GREEN}  ║    4. Click "Allow Access from Anywhere" (0.0.0.0/0)         ║${RESET}`
      );
      console.log(
        `${BOLD}${GREEN}  ║    5. Click "Confirm" and wait ~60 seconds                   ║${RESET}`
      );
      console.log(
        `${BOLD}${GREEN}  ║                                                              ║${RESET}`
      );
      console.log(
        `${BOLD}${YELLOW}  ║  Also verify username/password in server/.env match Atlas.   ║${RESET}`
      );
      console.log(
        `${BOLD}${RED}  ╚════════════════════════════════════════════════════════════════╝${RESET}`
      );
      console.log("");
    }

    // ── Timeout / server selection errors (often DNS-related) ──
    if (
      msg.includes("enotfound") ||
      msg.includes("server selection") ||
      msg.includes("timeout") ||
      msg.includes("getaddrinfo") ||
      msg.includes("querysrv")
    ) {
      console.log("");
      warn(
        `${BOLD}This is likely a network / DNS issue (see Step 2 above).${RESET}`
      );
      dim("If Step 2 also failed, your network is blocking MongoDB Atlas.");
      dim("Switch to a mobile hotspot or change your DNS settings.");
    }

    return false;
  }
}

/* ── Main ──────────────────────────────────────────────────────── */

async function main() {
  console.log("");
  console.log(
    `${BOLD}${CYAN}  ╔══════════════════════════════════════════════╗${RESET}`
  );
  console.log(
    `${BOLD}${CYAN}  ║   CodeCaret — MongoDB Diagnostics v1.0      ║${RESET}`
  );
  console.log(
    `${BOLD}${CYAN}  ╚══════════════════════════════════════════════╝${RESET}`
  );

  // Step 1
  const { host, protocol, uri, passwordWasFixed } = parseAndValidateUri();

  // Step 2
  const dnsOk = await testDns(host, protocol);

  // Step 3 — attempt even if DNS failed (mongoose has its own resolver)
  const mongoOk = await testMongoose(uri);

  // ── Final Verdict ──────────────────────────────────────────
  heading("VERDICT");

  if (mongoOk) {
    console.log(
      `${BOLD}${GREEN}  ✅ All good! Your MongoDB connection is healthy.${RESET}`
    );
    if (passwordWasFixed) {
      warn("Update your .env with the encoded password shown in Step 1.");
    }
  } else if (!dnsOk) {
    console.log(
      `${BOLD}${RED}  ❌ NETWORK ISSUE — Your DNS cannot resolve MongoDB Atlas.${RESET}`
    );
    console.log(
      `${BOLD}${YELLOW}     → Switch to a mobile hotspot or use Google DNS (8.8.8.8).${RESET}`
    );
  } else {
    console.log(
      `${BOLD}${RED}  ❌ CONNECTION FAILED — DNS is fine, but Mongoose cannot connect.${RESET}`
    );
    console.log(
      `${BOLD}${YELLOW}     → Check IP whitelist & credentials in MongoDB Atlas.${RESET}`
    );
  }

  console.log("");
  process.exit(mongoOk ? 0 : 1);
}

main();
