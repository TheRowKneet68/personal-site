import type { Request, Response } from "express";
import { storage } from "../services/storage.js";
import type { ExperienceEntry } from "../services/content.js";

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

/** GET /api/experience — the journey timeline, with achievements merged in. */
export async function getExperience(_req: Request, res: Response): Promise<void> {
  const content = await storage.getContent();

  const journey: ExperienceEntry[] = (content.experience ?? []).map((e) => ({ ...e, type: "journey" as const }));

  const achievementEntries: ExperienceEntry[] = (content.achievements ?? []).map((a) => ({
    year: a.date || a.year,
    title: `🏆 ${a.result} — ${a.title}${a.event ? ` @ ${a.event}` : ""}`,
    note: a.detail,
    type: "achievement" as const,
    order: a.order,
  }));

  const merged = [...journey, ...achievementEntries].sort((a, b) => b.year.localeCompare(a.year));

  res.json({ experience: merged });
}

/** GET /api/profile — everything about the person (used by the hero/about). */
export async function getProfile(_req: Request, res: Response): Promise<void> {
  const content = await storage.getContent();
  res.json({ profile: content.profile, achievements: content.achievements });
}
