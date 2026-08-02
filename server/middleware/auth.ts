import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

const TTL_MS = 12 * 60 * 60 * 1000;

export function adminConfigured(): boolean {
  return Boolean(env.adminPassword);
}

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(payload: string): string {
  const sig = createHmac("sha256", env.adminPassword).update(payload).digest();
  return `${payload}.${base64url(sig)}`;
}

/** HMAC-signed, expiring bearer token. No session store, stateless verify. */
export function issueToken(): string {
  const payload = base64url(Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS })));
  return sign(payload);
}

function verifyToken(token: string): boolean {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = createHmac("sha256", env.adminPassword).update(payload).digest();
  const received = Buffer.from(sig, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

/** Express guard for admin routes. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!adminConfigured()) {
    res.status(503).json({ error: "Admin panel not configured (ADMIN_PASSWORD missing)" });
    return;
  }
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !verifyToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
