/**
 * Lightweight in-memory rate limiter for development and single-instance deploys.
 * For production on Vercel/serverless, add Upstash Redis or Vercel KV and swap the
 * backing store — keys and windows can stay the same.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 10_000;

function pruneBuckets(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, entry] of buckets) {
    if (now >= entry.resetAt) buckets.delete(key);
    if (buckets.size <= MAX_BUCKETS * 0.8) break;
  }
}

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec?: number;
  remaining?: number;
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  pruneBuckets(now);

  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  entry.count += 1;
  return { ok: true, remaining: limit - entry.count };
}

export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/** Public federated search — per IP and optional signed-in user. */
export function enforceSearchRateLimit(
  request: Request,
  userId?: string | null,
): RateLimitResult {
  const ip = getRequestIp(request);
  const ipResult = checkRateLimit(`search:ip:${ip}`, 60, 60_000);
  if (!ipResult.ok) {
    console.warn("[security] search rate limit exceeded (ip)", { ip });
    return ipResult;
  }
  if (userId) {
    const userResult = checkRateLimit(`search:user:${userId}`, 120, 60_000);
    if (!userResult.ok) {
      console.warn("[security] search rate limit exceeded (user)", { userId });
      return userResult;
    }
  }
  return { ok: true };
}

export function rateLimitResponse(result: RateLimitResult) {
  return new Response(
    JSON.stringify({ ok: false, error: "Too many requests. Please try again shortly." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSec ?? 60),
      },
    },
  );
}
