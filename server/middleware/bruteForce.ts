import type { NextFunction, Request, Response } from "express";
import { clientIp } from "../services/visitors.js";

/**
 * Growing lockout for repeated failed logins, keyed by client IP.
 * The window doubles after repeated failures, so hammering the login endpoint
 * gets blocked for longer each round — flat rate limits alone just reset and
 * let an attacker retry forever.
 * Note: a client MAC address is never visible to a server over HTTP(S), so IP
 * (+ the per-IP rate limiter) is the practical fingerprint.
 * ponytail: in-memory only — same per-instance ceiling as rateLimit; move to
 * Vercel KV if abuse ever outgrows a single instance.
 */
interface Entry {
  fails: number;
  lockedUntil: number;
}

const state = new Map<string, Entry>();
const MAX_ENTRIES = 10_000;
/** Lockout minutes after the 1st..5th+ failure. */
const STEPS_MIN = [0, 1, 5, 15, 60, 720, 1440];

function lockoutMinutes(fails: number): number {
  const idx = Math.max(0, Math.min(fails - 1, STEPS_MIN.length - 1));
  return STEPS_MIN[idx]!;
}

export interface BruteForceRequest extends Request {
  bruteForce: {
    success: () => void;
    fail: () => number;
  };
}

export function bruteForce() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();

    if (state.size > MAX_ENTRIES) {
      for (const [k, e] of state) {
        if (e.lockedUntil <= now) state.delete(k);
      }
    }

    const ip = clientIp(req) || "unknown";
    const entry = state.get(ip);
    if (entry && entry.lockedUntil > now) {
      const wait = Math.ceil((entry.lockedUntil - now) / 1000);
      res.setHeader("Retry-After", String(wait));
      res.status(429).json({ error: `too many failed attempts — try again in ${Math.ceil(wait / 60)} min` });
      return;
    }

    (req as BruteForceRequest).bruteForce = {
      success: () => {
        state.delete(ip);
      },
      fail: () => {
        const e = state.get(ip) ?? { fails: 0, lockedUntil: 0 };
        e.fails++;
        e.lockedUntil = Date.now() + lockoutMinutes(e.fails) * 60_000;
        state.set(ip, e);
        return lockoutMinutes(e.fails);
      },
    };
    next();
  };
}
