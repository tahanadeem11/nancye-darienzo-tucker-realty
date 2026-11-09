// Vercel serverless function: receives the website contact / inquiry forms and emails them.
//
// Required environment variables (Vercel > Project > Settings > Environment Variables):
//   SMTP_USER   the sending mailbox, e.g. Nancyedarienzo25@gmail.com
//   SMTP_PASS   an app password for that mailbox (Gmail: Google Account > Security > App passwords)
// Optional:
//   SMTP_HOST   default smtp.gmail.com
//   SMTP_PORT   default 465
//   CONTACT_TO  where messages are delivered, default Nancyedarienzo25@gmail.com

const nodemailer = require("nodemailer");

const clean = (v, max) =>
  String(v == null ? "" : v).replace(/\r/g, "").trim().slice(0, max);
const oneLine = (v, max) => clean(v, max).replace(/\s*\n\s*/g, " ");
const esc = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function readBody(req) {
  const b = req.body;
  if (b && typeof b === "object") return b;
  if (typeof b === "string") {
    try { return JSON.parse(b); } catch (e) { return Object.fromEntries(new URLSearchParams(b)); }
  }
  return {};
}

module.exports = async function handler(req, res) {
  const wantsJson = /application\/json/i.test(req.headers.accept || "") ||
    /application\/json/i.test(req.headers["content-type"] || "");
  const finish = (status, ok, error) => {
    if (wantsJson) return res.status(status).json(ok ? { ok: true } : { ok: false, error });
    res.setHeader("Location", "/contact.html?message=" + (ok ? "Successfull" : "Failed"));
    return res.status(303).end();
  };

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = readBody(req);

  // Honeypot: real visitors never fill this hidden field; pretend success to bots.
  if (clean(body.website, 200)) return finish(200, true);

  const name = oneLine(body.username || body.name, 120);
  const email = oneLine(body.email, 200);
  const phone = oneLine(body.phone, 60);
  const message = clean(body.message, 5000);

  if (!name || !EMAIL_RE.test(email) || !message) {
    return finish(400, false, "Please fill in your name, a valid email address and a message.");
  }

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    console.error("contact form: SMTP_USER / SMTP_PASS are not configured");
    return finish(500, false, "The contact form is not configured yet. Please call (360) 941-5415.");
  }

  const to = process.env.CONTACT_TO || "Nancyedarienzo25@gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const text = `New website enquiry\n\nName: ${name}\nEmail: ${email}\n` +
    (phone ? `Phone: ${phone}\n` : "") + `\nMessage:\n${message}\n`;
  const html = `<h2>New website enquiry</h2>
<p><strong>Name:</strong> ${esc(name)}<br>
<strong>Email:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a><br>
${phone ? `<strong>Phone:</strong> ${esc(phone)}<br>` : ""}</p>
<p><strong>Message:</strong></p>
<p>${esc(message).replace(/\n/g, "<br>")}</p>`;

  try {
    await transporter.sendMail({
      from: `"Nancye D'Arienzo Website" <${user}>`,
      to,
      replyTo: `"${name.replace(/"/g, "")}" <${email}>`,
      subject: `New website enquiry from ${name}`,
      text,
      html,
    });
    return finish(200, true);
  } catch (err) {
    console.error("contact form: send failed", err && err.message);
    return finish(502, false, "Sorry, your message could not be sent. Please call (360) 941-5415 or email Nancyedarienzo25@gmail.com.");
  }
};
