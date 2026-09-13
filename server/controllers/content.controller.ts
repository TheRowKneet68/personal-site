import type { Request, Response } from "express";
import { storage } from "../services/storage.js";
import type { ExperienceEntry } from "../services/content.js";

/** GET /api/projects - all projects, featured first, newest first. */
export async function getProjects(_req: Request, res: Response): Promise<void> {
  const content = await storage.getContent();
  const projects = [...content.projects].sort(
    (a, b) => Number(b.featured ?? false) - Number(a.featured ?? false) || b.year.localeCompare(a.year),
  );
  res.json({ projects });
}

/** GET /api/skills - tech categories + focus areas. */
export async function getSkills(_req: Request, res: Response): Promise<void> {
  const content = await storage.getContent();
  res.json({ skills: content.skills });
}

/** GET /api/experience - the journey timeline, with achievements merged in,
    sorted oldest → newest. Every journey milestone is kept; nothing is dropped. */
export async function getExperience(_req: Request, res: Response): Promise<void> {
  const content = await storage.getContent();

  const achievementEntries: ExperienceEntry[] = [];
  for (const a of content.achievements ?? []) {
    const prettyYear = a.date || a.year;
    const { y } = parseTimeline(prettyYear);
    achievementEntries.push({
      year: prettyYear,
      title: `🏆 ${a.result} - ${a.title}${a.event ? ` @ ${a.event}` : ""}`,
      note: a.detail,
      type: "achievement",
      order: a.order,
      yearGroup: y,
    });
  }

  const milestones: ExperienceEntry[] = (content.experience ?? []).map((e) => ({
    ...e,
    type: "journey" as const,
    yearGroup: parseTimeline(e.year).y,
  }));

  const merged = [...milestones, ...achievementEntries].sort(compareEntries);
  res.json({ experience: merged });
}

const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Reduce "Present"/"2028 (Expected)"/"September 2024"/"2025-02-12,13" into a
    comparable timeline key. Date-less months sort before dated events of the
    same year; "Present" is pinned to the far future. */
function parseTimeline(value: string): { y: number; m: number; d: number } {
  const s = (value ?? "").trim().toLowerCase();
  if (!s) return { y: 0, m: 0, d: 0 };
  if (s === "present") return { y: 9999, m: 0, d: 0 };
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (iso && iso[1] && iso[2] && iso[3]) return { y: +iso[1], m: +iso[2], d: +iso[3] };
  const yMatch = /\b(\d{4})\b/.exec(s);
  const year = yMatch?.[1];
  if (year) {
    const monIndex = MONTH_NAMES.findIndex((mn) => s.includes(mn));
    return { y: +year, m: monIndex >= 0 ? monIndex + 1 : 0, d: 0 };
  }
  return { y: 0, m: 0, d: 0 };
}

function compareEntries(a: ExperienceEntry, b: ExperienceEntry): number {
  const ka = parseTimeline(a.year);
  const kb = parseTimeline(b.year);
  if (ka.y !== kb.y) return ka.y - kb.y;
  const ar = a.type === "journey" ? 0 : 1;
  const br = b.type === "journey" ? 0 : 1;
  if (ar !== br) return ar - br;
  if (ka.m !== kb.m) return ka.m - kb.m;
  if (ka.d !== kb.d) return ka.d - kb.d;
  return (a.order ?? 0) - (b.order ?? 0);
}

/** GET /api/profile - everything about the person (used by the hero/about). */
export async function getProfile(_req: Request, res: Response): Promise<void> {
  const content = await storage.getContent();
  res.json({ profile: content.profile, achievements: content.achievements });
}
