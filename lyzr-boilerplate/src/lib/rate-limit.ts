/**
 * Simple in-memory sliding-window rate limiter.
 * Adequate for a single-instance dev/preview deployment; for multi-instance
 * production, replace with a Redis-backed limiter.
 */

type Bucket = { hits: number[]; blockedUntil: number };
const buckets = new Map<string, Bucket>();

interface LimitOptions {
  /** unique key (e.g. `request-otp:email:foo@bar.com`) */
  key: string;
  /** max requests allowed within `windowMs` */
  max: number;
  /** sliding window size in ms */
  windowMs: number;
  /** if exceeded, block for this many ms (default: windowMs) */
  blockMs?: number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

export function rateLimit(opts: LimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(opts.key) || { hits: [], blockedUntil: 0 };

  if (bucket.blockedUntil > now) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.blockedUntil - now) / 1000) };
  }

  // drop expired hits
  bucket.hits = bucket.hits.filter((t) => now - t < opts.windowMs);

  if (bucket.hits.length >= opts.max) {
    bucket.blockedUntil = now + (opts.blockMs ?? opts.windowMs);
    buckets.set(opts.key, bucket);
    return { ok: false, retryAfterSec: Math.ceil((bucket.blockedUntil - now) / 1000) };
  }

  bucket.hits.push(now);
  buckets.set(opts.key, bucket);
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") || "unknown";
}
