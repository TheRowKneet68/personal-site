import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { issueToken } from "../middleware/auth.js";
import { normalizeFromFile, type Content } from "../services/content.js";
import { storage } from "../services/storage.js";

/** POST /api/admin/login — exchange password for a short-lived bearer token. */
export function login(req: Request, res: Response): void {
  if (!env.adminPassword) {
    res.status(503).json({ error: "Admin panel not configured (ADMIN_PASSWORD missing)" });
    return;
  }
  const { password } = (req.body ?? {}) as { password?: unknown };
  if (typeof password !== "string" || password !== env.adminPassword) {
    res.status(401).json({ error: "Wrong password" });
    return;
  }
  res.json({ token: issueToken() });
}

/** GET /api/admin/content — the full editable content (auth required). */
export async function getContent(_req: Request, res: Response): Promise<void> {
  try {
    const c = await storage.getContent();
    res.json({
      profile: { ...c.profile, tech: c.skills.categories, focus: c.skills.focus },
      projects: c.projects,
      achievements: c.achievements,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/** GET /api/admin/messages — contact form submissions (auth required). */
export async function listMessages(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ messages: await storage.listMessages() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/** GET /api/admin/subscribers — newsletter emails (auth required). */
export async function listSubscribers(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ subscribers: await storage.listSubscribers() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/** PUT /api/admin/content — persist edits (auth required). */
export async function updateContent(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as { profile?: Content["profile"]; projects?: Content["projects"]; achievements?: Content["achievements"] };
    if (!body || typeof body.profile !== "object") {
      res.status(400).json({ error: "Invalid content: profile is required" });
      return;
    }
    const content = normalizeFromFile({
      profile: body.profile,
      projects: Array.isArray(body.projects) ? body.projects : [],
      achievements: Array.isArray(body.achievements) ? body.achievements : [],
    });
    await storage.updateContent(content);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
