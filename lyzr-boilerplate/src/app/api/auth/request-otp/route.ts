import { NextRequest, NextResponse } from "next/server";
import { generateOtp, storeOtp } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/mailer";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const normalized = email.trim().toLowerCase();
    const ip = clientIp(req.headers);

    // Per-email: 3 codes per 10 min
    const emailLimit = rateLimit({
      key: `request-otp:email:${normalized}`,
      max: 3,
      windowMs: 10 * 60 * 1000,
    });
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: `Too many requests for this email. Please wait ${emailLimit.retryAfterSec}s and try again.` },
        { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSec) } }
      );
    }

    // Per-IP: 10 codes per hour (prevents enumeration sweeps)
    const ipLimit = rateLimit({
      key: `request-otp:ip:${ip}`,
      max: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${ipLimit.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } }
      );
    }

    const code = generateOtp();
    await storeOtp(normalized, code);
    await sendOtpEmail(normalized, code);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[auth/request-otp]", e);
    return NextResponse.json(
      { error: "We couldn't send the code. Please try again in a moment." },
      { status: 500 }
    );
  }
}
