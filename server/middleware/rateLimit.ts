import type { NextFunction, Request, Response } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

/**
 * In-memory rate limit. Per-IP keyed on req.ip; a `global` cap is enforced
 * across all clients of this instance, so spoofed X-Forwarded-For headers
 * can't launder abuse past the limiter.
 * ponytail: in-memory only — on Vercel serverless each instance has its own
 * counters, so this is a per-instance limit. Upgrade to Vercel KV if abuse
 * ever becomes a real problem.
 */
export function rateLimit(options: { windowMs: number; max: number; global?: number; name: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();

    // Keep the map from growing forever (single-instance personal API).
    if (buckets.size > MAX_BUCKETS) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }

    const keys = [`${options.name}:${req.ip || "unknown"}`];
    if (options.global) keys.push(`${options.name}:global`);
    const limits = [options.max];
    if (options.global) limits.push(options.global);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + options.windowMs };
        buckets.set(key, bucket);
      }
      bucket.count++;
      if (bucket.count > limits[i]!) {
        res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
        res.status(429).json({ error: "slow down — try again in a moment" });
        return;
      }
    }
    next();
  };
}
