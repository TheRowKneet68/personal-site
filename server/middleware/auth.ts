import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env, adminEnabled, deckEnabled, hasSupabase } from "../config/env.js";
import { getSupabase } from "../config/supabase.js";

const TTL_MS = 12 * 60 * 60 * 1000;
const SCRYPT_KEYLEN = 64;
const ADMIN_AUTH_TABLE = "admin_auth";

/** Two independent vaults: the content admin panel and the Cyber-Deck.
    Each has its own password row, its own env fallback, and tokens scoped to
    exactly one role — a deck token can never call admin routes, and vice
    versa. */
export type AuthRole = "admin" | "deck";
const ROLE_ID: Record<AuthRole, string> = { admin: "admin", deck: "deck" };

function envPasswordFor(role: AuthRole): string {
  return role === "deck" ? env.deckPassword : env.adminPassword;
}

function roleConfigured(role: AuthRole): boolean {
  return role === "deck" ? deckEnabled() : adminEnabled();
}

export function adminConfigured(): boolean {
  return adminEnabled();
}

/* ---- scrypt password hashing (node:crypto — no new dependency) ---- */

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = Buffer.from(await deriveKey(password, salt));
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

/** Verify a plaintext password against a hash produced by hashPassword. */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algo, salt, hashHex] = storedHash.split("$");
  if (algo !== "scrypt" || !salt || !hashHex) return false;
  const derived = Buffer.from(await deriveKey(password, salt));
  const expected = Buffer.from(hashHex, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/* ---- persisted admin credential store (Supabase) ---- */

export interface StoredAuth {
  passwordHash: string;
  tokenVersion: number;
}

export async function getStoredAuth(role: AuthRole = "admin"): Promise<StoredAuth | null> {
  if (!hasSupabase()) return null;
  const { data, error } = await getSupabase()
    .from(ADMIN_AUTH_TABLE)
    .select("password_hash, token_version")
    .eq("id", ROLE_ID[role])
    .maybeSingle();
  if (error) {
    // 42P01 = table not created yet — fall back to env-password mode gracefully.
    if (error.code === "42P01") return null;
    throw error;
  }
  if (!data) return null;
  return { passwordHash: data.password_hash as string, tokenVersion: data.token_version as number };
}

/** Password check against the stored hash, falling back to the role's env
    password before the first rotation (or in JSON mode). */
export async function verifyAdminPassword(input: string, role: AuthRole = "admin"): Promise<boolean> {
  const stored = await getStoredAuth(role);
  if (stored?.passwordHash) return verifyPassword(input, stored.passwordHash);
  const fallback = envPasswordFor(role);
  if (!fallback || !input) return false;
  const a = Buffer.from(fallback);
  const b = Buffer.from(input);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Persist the new password hash and bump the token version (signs out old sessions). */
export async function setAdminPassword(hash: string, version: number, role: AuthRole = "admin"): Promise<void> {
  const { error } = await getSupabase().from(ADMIN_AUTH_TABLE).upsert({
    id: ROLE_ID[role],
    password_hash: hash,
    token_version: version,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

function isConfigured(stored: StoredAuth | null, role: AuthRole): boolean {
  return Boolean(stored?.passwordHash) || roleConfigured(role);
}

/* ---- HMAC-signed, expiring bearer tokens ---- */

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

/** The HMAC key is the effective credential secret: the stored hash once a
    password has been rotated, otherwise the role's env password. */
function tokenSecret(stored: StoredAuth | null, role: AuthRole): string {
  return stored?.passwordHash || envPasswordFor(role);
}

function sign(payload: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(payload).digest();
  return `${payload}.${base64url(sig)}`;
}

/** v = token version: bumped on password change so old tokens stop working.
    a = audience: tokens only verify against their own role's guard. */
export function issueToken(version: number, secret: string, role: AuthRole): string {
  const payload = base64url(Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS, v: version, a: role })));
  return sign(payload, secret);
}

function verifyToken(token: string, stored: StoredAuth | null, role: AuthRole): boolean {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const secret = tokenSecret(stored, role);
  const expected = createHmac("sha256", secret).update(payload).digest();
  const received = Buffer.from(sig, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
  try {
    const { exp, v, a } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
      v?: number;
      a?: AuthRole;
    };
    const version = stored?.tokenVersion ?? 0;
    return typeof exp === "number" && exp > Date.now() && v === version && a === role;
  } catch {
    return false;
  }
}

/** Express guard factory — one per role (async — reads the stored token version). */
function requireRole(role: AuthRole) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const stored = await getStoredAuth(role);
    if (!isConfigured(stored, role)) {
      res.status(503).json({ error: `${role} panel not configured (password env missing)` });
      return;
    }
    const auth = req.headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token || !verifyToken(token, stored, role)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole("admin");
export const requireDeck = requireRole("deck");
