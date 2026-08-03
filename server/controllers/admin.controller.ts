import type { Request, Response } from "express";
import { env, hasSupabase } from "../config/env.js";
import {
  getStoredAuth,
  hashPassword,
  issueToken,
  setAdminPassword,
  verifyAdminPassword,
} from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { normalizeFromFile, type Content } from "../services/content.js";
import { storage } from "../services/storage.js";
import type { BruteForceRequest } from "../middleware/bruteForce.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Allowed upload types (magic bytes). SVG is excluded — scriptable vector XSS. */
const IMAGE_SIGNATURES: { contentType: string; ext: string; sniff: (b: Buffer) => boolean }[] = [
  { contentType: "image/jpeg", ext: "jpg", sniff: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { contentType: "image/png", ext: "png", sniff: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a },
  { contentType: "image/webp", ext: "webp", sniff: (b) => b.length > 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP" },
  { contentType: "image/gif", ext: "gif", sniff: (b) => b.length > 6 && (b.toString("latin1", 0, 6) === "GIF87a" || b.toString("latin1", 0, 6) === "GIF89a") },
  { contentType: "image/avif", ext: "avif", sniff: (b) => b.length > 12 && b.toString("latin1", 4, 12) === "ftypavif" },
];

function sniffImage(buffer: Buffer): { contentType: string; ext: string } | null {
  for (const sig of IMAGE_SIGNATURES) {
    if (sig.sniff(buffer)) return sig;
  }
  return null;
}

function safeName(raw: string | undefined, ext: string): string {
  const stripped = (raw ?? "").replace(/[^a-zA-Z0-9._-]/g, "").trim();
  const base = stripped && /^[a-zA-Z0-9._-]+$/.test(stripped) ? stripped.replace(/\.[a-zA-Z0-9]{1,5}$/, "") : `upload-${Date.now()}`;
  return `${base.slice(0, 80)}.${ext}`;
}

/** POST /api/admin/login — exchange password for a short-lived bearer token. */
export async function login(req: Request, res: Response): Promise<void> {
  const stored = await getStoredAuth();
  if (!(stored?.passwordHash || env.adminPassword)) {
    res.status(503).json({ error: "Admin panel not configured (ADMIN_PASSWORD missing)" });
    return;
  }
  const { password } = (req.body ?? {}) as { password?: unknown };
  if (typeof password !== "string" || !(await verifyAdminPassword(password))) {
    (req as BruteForceRequest).bruteForce.fail();
    res.status(401).json({ error: "Wrong password" });
    return;
  }
  (req as BruteForceRequest).bruteForce.success();
  res.json({
    token: issueToken(stored?.tokenVersion ?? 0, stored?.passwordHash || env.adminPassword),
  });
}

/** POST /api/admin/change-password — rotate the admin password. The current
    password must be re-entered, the new one is stored as a scrypt hash in
    Supabase, and the token version is bumped so every other session is
    signed out. A fresh token is returned so the caller stays signed in. */
export async function changePassword(req: Request, res: Response): Promise<void> {
  if (!hasSupabase()) {
    throw new HttpError(503, "Change password requires the Supabase backend");
  }
  const { currentPassword, newPassword } = (req.body ?? {}) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    throw new HttpError(400, "currentPassword and newPassword are required");
  }
  if (newPassword.length < 12) {
    throw new HttpError(400, "New password must be at least 12 characters");
  }
  if (!(await verifyAdminPassword(currentPassword))) {
    throw new HttpError(401, "Wrong current password");
  }

  const stored = await getStoredAuth();
  const nextVersion = (stored?.tokenVersion ?? 0) + 1;
  const hash = await hashPassword(newPassword);
  await setAdminPassword(hash, nextVersion);

  res.json({ ok: true, token: issueToken(nextVersion, hash) });
}

/** GET /api/admin/content — the full editable content (auth required).
    Reads fresh from the backend (never the TTL cache) so edits always start
    from the true DB state. */
export async function getContent(_req: Request, res: Response): Promise<void> {
  const c = await storage.getContentFresh();
  res.json({
    profile: { ...c.profile, tech: c.skills.categories, focus: c.skills.focus },
    projects: c.projects,
    achievements: c.achievements,
  });
}

/** GET /api/admin/messages — contact form submissions (auth required). */
export async function listMessages(_req: Request, res: Response): Promise<void> {
  res.json({ messages: await storage.listMessages() });
}

/** GET /api/admin/subscribers — newsletter emails (auth required). */
export async function listSubscribers(_req: Request, res: Response): Promise<void> {
  res.json({ subscribers: await storage.listSubscribers() });
}

/** DELETE /api/admin/messages/:id — remove a contact message (auth required). */
export async function deleteMessage(req: Request, res: Response): Promise<void> {
  await storage.deleteMessage(String(req.params.id));
  res.json({ ok: true });
}

/** DELETE /api/admin/subscribers/:email — remove a newsletter subscriber (auth required). */
export async function deleteSubscriber(req: Request, res: Response): Promise<void> {
  await storage.deleteSubscriber(String(req.params.email));
  res.json({ ok: true });
}

/** POST /api/admin/upload — save an image, return its public URL (auth required). */
export async function uploadImage(req: Request, res: Response): Promise<void> {
  const { data, name } = (req.body ?? {}) as { data?: string; name?: string };
  if (typeof data !== "string" || !data) throw new HttpError(400, "Image data (base64) is required");

  const buffer = Buffer.from(data, "base64");
  if (buffer.length === 0) throw new HttpError(400, "Image data is empty");
  if (buffer.length > MAX_IMAGE_BYTES) throw new HttpError(400, "Image is too large (max 5MB)");

  const matched = sniffImage(buffer);
  if (!matched) throw new HttpError(400, "Only jpg, png, webp, gif and avif images are allowed");

  const url = await storage.uploadImage(safeName(name, matched.ext), matched.contentType, buffer);
  res.json({ url });
}

/** PUT /api/admin/content — persist edits (auth required). */
export async function updateContent(req: Request, res: Response): Promise<void> {
  const body = req.body as { profile?: Content["profile"]; projects?: Content["projects"]; achievements?: Content["achievements"] };
  if (!body || typeof body.profile !== "object") {
    throw new HttpError(400, "Invalid content: profile is required");
  }
  const content = normalizeFromFile({
    profile: body.profile,
    projects: Array.isArray(body.projects) ? body.projects : [],
    achievements: Array.isArray(body.achievements) ? body.achievements : [],
  });
  await storage.updateContent(content);
  res.json({ ok: true });
}
