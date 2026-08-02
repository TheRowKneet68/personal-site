import type { Request, Response } from "express";
import { storage } from "../services/storage.js";
import { getGitHubStats } from "../services/github.js";

/** GET /api/stats — profile stats + dynamic counts + GitHub summary. */
export async function getStats(_req: Request, res: Response): Promise<void> {
  const content = await storage.getContent();
  const [counts, github] = await Promise.all([storage.getCounts(), getGitHubStats()]);
  res.json({
    stats: content.profile.stats,
    counts: { projects: content.projects.length, ...counts },
    github,
    storage: storage.mode(),
  });
}

/** GET /api/health — cheap liveness check. */
export function getHealth(_req: Request, res: Response): void {
  res.json({ ok: true, storage: storage.mode() });
}
