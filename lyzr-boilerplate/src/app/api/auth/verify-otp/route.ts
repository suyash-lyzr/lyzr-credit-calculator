import { NextRequest, NextResponse } from "next/server";
import {
  verifyOtp,
  findOrCreateUser,
  createSession,
  setSessionCookie,
} from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (typeof email !== "string" || typeof code !== "string") {
      return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
    }
    const normalized = email.trim().toLowerCase();
    const cleanedCode = code.trim();
    const ip = clientIp(req.headers);

    // Per-email: 10 attempts per 10 min (the OTP itself only allows 5 hits, this caps cross-OTP retries)
    const emailLimit = rateLimit({
      key: `verify-otp:email:${normalized}`,
      max: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Please wait ${emailLimit.retryAfterSec}s and try again.` },
        { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSec) } }
      );
    }
    // Per-IP: 30 attempts per hour
    const ipLimit = rateLimit({
      key: `verify-otp:ip:${ip}`,
      max: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Please try again in ${ipLimit.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } }
      );
    }

    const ok = await verifyOtp(normalized, cleanedCode);
    if (!ok) {
      return NextResponse.json(
        { error: "That code is incorrect or has expired. Please request a new one." },
        { status: 401 }
      );
    }

    const user = await findOrCreateUser(normalized);
    const session = await createSession(user.id);
    await setSessionCookie(session.id, session.expiresAt);

    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch (e) {
    console.error("[auth/verify-otp]", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
