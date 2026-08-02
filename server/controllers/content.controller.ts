import type { Request, Response } from "express";
import { storage } from "../services/storage.js";

/** GET /api/projects — all projects, featured first, newest first. */
export async function getProjects(_req: Request, res: Response): Promise<void> {
  const content = await storage.getContent();
  const projects = [...content.projects].sort(
    (a, b) => Number(b.featured ?? false) - Number(a.featured ?? false) || b.year.localeCompare(a.year),
  );
  res.json({ projects });
}

/** GET /api/skills — tech categories + focus areas. */
export async function getSkills(_req: Request, res: Response): Promise<void> {
  const content = await storage.getContent();
  res.json({ skills: content.skills });
}

/** GET /api/experience — the journey timeline. */
export async function getExperience(_req: Request, res: Response): Promise<void> {
  const content = await storage.getContent();
  res.json({ experience: content.experience });
}

/** GET /api/profile — everything about the person (used by the hero/about). */
export async function getProfile(_req: Request, res: Response): Promise<void> {
  const content = await storage.getContent();
  res.json({ profile: content.profile, achievements: content.achievements });
}
