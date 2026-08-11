import { NextRequest } from "next/server";

/**
 * In-memory fixed-window rate limiter. Good enough to stop casual/scripted
 * enumeration against public endpoints (e.g. the NIS parent-report lookup)
 * without adding external infra. It's per-lambda-instance, not distributed,
 * so on a multi-instance deploy the effective limit is `limit * warm
 * instances` rather than a hard global cap — for a harder guarantee, swap
 * this for a shared store (Upstash Redis, Vercel KV, etc).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// Periodically drop expired buckets so this doesn't grow unbounded on a
// long-lived warm instance.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function getClientIp(request: NextRequest): string {
  // On Vercel, x-forwarded-for is APPENDED to, not overwritten — a client
  // can send its own fake XFF value and Vercel's edge tacks the real IP on
  // as the LAST entry, not the first. Trusting the first (leftmost) entry,
  // as many generic examples do, lets an attacker mint a fresh IP on every
  // request and fully bypass the limiter. x-real-ip is set by Vercel's edge
  // directly and isn't client-settable, so prefer it; fall back to the last
  // XFF hop, not the first, if it's ever absent.
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor.split(",").map((h) => h.trim());
    return hops[hops.length - 1];
  }

  return "unknown";
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/** `key` should already include a namespace, e.g. `parent-lookup:<ip>`. */
export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}
