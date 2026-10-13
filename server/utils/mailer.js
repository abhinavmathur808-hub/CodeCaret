/* ══════════════════════════════════════════════════════════════
   mailer — the one way the server sends an email.

   SMTP, through nodemailer, so any provider works (Gmail with an app
   password, Brevo, Resend, Postmark, SES…). Configured entirely from
   the environment:

     SMTP_HOST, SMTP_PORT (587 by default; 465 means TLS from the
     start), SMTP_USER, SMTP_PASS, and MAIL_FROM for the sender
     ("CodeCaret <no-reply@example.com>"; SMTP_USER if unset).

   Unconfigured, nothing is sent. Outside production the message is
   printed to this server's console instead, so a password reset can
   still be finished on a development machine; in production it is
   only reported as not sent.
   ══════════════════════════════════════════════════════════════ */

const nodemailer = require("nodemailer");

let transport = null;

function getTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transport;
}

/** "abhinav@example.com" → "ab•••@example.com", for logs. */
const maskEmail = (email) => String(email).replace(/^(.{0,2})[^@]*/, "$1•••");

/**
 * @returns {Promise<{ sent: boolean }>} Never throws: a mail failure
 *   is reported, and the caller decides what the user is told.
 */
async function sendMail({ to, subject, text, html }) {
  const t = getTransport();
  if (!t) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`✉️  [mail not configured] to ${maskEmail(to)}: ${subject}\n${text}`);
    } else {
      console.warn(`✉️  Mail not configured; "${subject}" to ${maskEmail(to)} was not sent`);
    }
    return { sent: false };
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error(`✉️  Sending "${subject}" to ${maskEmail(to)} failed:`, err.message);
    return { sent: false };
  }
}

module.exports = { sendMail, maskEmail };
