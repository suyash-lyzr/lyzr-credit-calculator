import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { sessions, users, otpCodes } from "./schema";
import { eq, and, gt, desc } from "drizzle-orm";

export const SESSION_COOKIE = "lyzr_session";
const SESSION_TTL_DAYS = 30;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function generateOtp(): string {
  // 6-digit numeric, zero-padded
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

export async function storeOtp(email: string, code: string) {
  if (!db) throw new Error("Database not available");
  const normalizedEmail = email.toLowerCase();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  // Invalidate any prior outstanding codes for this email so only one is active.
  await db.delete(otpCodes).where(eq(otpCodes.email, normalizedEmail));
  await db.insert(otpCodes).values({ email: normalizedEmail, codeHash, expiresAt });
}

/**
 * Verifies the OTP for an email. Returns true if valid and consumes the code.
 * Increments attempts on failure; gives up after OTP_MAX_ATTEMPTS.
 */
export async function verifyOtp(email: string, code: string): Promise<boolean> {
  if (!db) throw new Error("Database not available");
  const normalizedEmail = email.toLowerCase();
  const codeHash = hashCode(code);

  const [latest] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.email, normalizedEmail), gt(otpCodes.expiresAt, new Date())))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!latest) return false;
  if (latest.attempts >= OTP_MAX_ATTEMPTS) return false;

  if (latest.codeHash !== codeHash) {
    await db
      .update(otpCodes)
      .set({ attempts: latest.attempts + 1 })
      .where(eq(otpCodes.id, latest.id));
    return false;
  }

  // success — consume code (delete all otp rows for this email)
  await db.delete(otpCodes).where(eq(otpCodes.email, normalizedEmail));
  return true;
}

export async function findOrCreateUser(email: string) {
  if (!db) throw new Error("Database not available");
  const normalizedEmail = email.toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(users).values({ email: normalizedEmail }).returning();
  return created;
}

export async function createSession(userId: number) {
  if (!db) throw new Error("Database not available");
  const id = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return { id, expiresAt };
}

export async function deleteSession(sessionId: string) {
  if (!db) return;
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function getCurrentUser() {
  if (!db) return null;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];
  if (row.expiresAt.getTime() < Date.now()) {
    await deleteSession(row.sessionId);
    return null;
  }
  return { id: row.userId, email: row.email };
}

export async function setSessionCookie(sessionId: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
