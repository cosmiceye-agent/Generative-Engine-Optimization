/**
 * In-memory fixed-window rate limiter.
 *
 * This is deliberately the simplest thing that works for a single instance. It
 * does NOT hold up in production on Vercel: each serverless instance keeps its
 * own Map, so the effective limit is (limit × instances), and the state is lost
 * on every cold start. Swap in Upstash Redis or Vercel KV before this matters —
 * see the README's "Known limitations".
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Unix ms when the current window ends. */
  resetAt: number;
  /** Whole seconds until the window resets. Computed here so callers — including
   *  React Server Components, where calling Date.now() during render is impure —
   *  never have to read the clock themselves. */
  retryAfterSeconds: number;
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Drop expired entries so a long-lived instance does not grow unbounded. */
function evictExpired(now: number): void {
  if (windows.size < 1000) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  limit: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  evictExpired(now);

  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    windows.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Test seam — resets the shared window map. */
export function resetRateLimits(): void {
  windows.clear();
}

/**
 * Best-effort client identity. On Vercel `x-forwarded-for` is set by the edge and
 * the left-most entry is the real client; elsewhere it is spoofable, which is
 * another reason this limiter is not a security control.
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
