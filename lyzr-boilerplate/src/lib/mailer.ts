import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || user;

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS missing)");
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendOtpEmail(to: string, code: string) {
  const t = getTransporter();
  const subject = `Your Lyzr Credit Calculator login code: ${code}`;
  const text = `Your one-time login code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, you can safely ignore this email.`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background:#F4EEE2; padding:40px 20px;">
      <div style="max-width:480px; margin:0 auto; background:#FAF6EE; border:1px solid #D9C8AE; border-radius:16px; padding:32px;">
        <h1 style="color:#3D2510; font-family: Georgia, 'Times New Roman', serif; margin:0 0 8px 0; font-size:22px;">Lyzr Credit Calculator</h1>
        <p style="color:#5A4A38; margin:0 0 24px 0; font-size:14px;">Enter this code to sign in:</p>
        <div style="background:#fff; border:1px solid #D9C8AE; border-radius:12px; padding:20px; text-align:center; margin-bottom:24px;">
          <div style="font-family: 'SF Mono', Menlo, monospace; font-size:32px; letter-spacing:8px; color:#673F1B; font-weight:700;">${code}</div>
        </div>
        <p style="color:#7A6650; font-size:12px; margin:0;">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
      </div>
    </div>
  `.trim();

  await t.sendMail({ from, to, subject, text, html });
}
