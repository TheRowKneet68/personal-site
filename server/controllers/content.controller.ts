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

/** GET /api/experience — the journey timeline, with achievements merged in,
    sorted oldest → newest. Narrative milestones whose text merely repeats the
    dated achievements of the same year are dropped so no event shows twice. */
export async function getExperience(_req: Request, res: Response): Promise<void> {
  const content = await storage.getContent();

  const achievementEntries: ExperienceEntry[] = [];
  // Distinctive words per year, built from achievement titles/events/results.
  // Used to detect journey lines that merely narrate the same dated events.
  const vocabByYear = new Map<number, Set<string>>();
  for (const a of content.achievements ?? []) {
    const prettyYear = a.date || a.year;
    const { y } = parseTimeline(prettyYear);
    achievementEntries.push({
      year: prettyYear,
      title: `🏆 ${a.result} — ${a.title}${a.event ? ` @ ${a.event}` : ""}`,
      note: a.detail,
      type: "achievement",
      order: a.order,
      yearGroup: y,
    });
    if (y >= 1960 && y <= 9998) {
      const vocab = vocabByYear.get(y) ?? new Set<string>();
      for (const w of significantWords(`${a.title} ${a.event ?? ""} ${a.result ?? ""}`)) vocab.add(w);
      vocabByYear.set(y, vocab);
    }
  }

  const milestones: ExperienceEntry[] = (content.experience ?? [])
    .filter((e) => keepNarrative(e, vocabByYear))
    .map((e) => ({ ...e, type: "journey" as const, yearGroup: parseTimeline(e.year).y }));

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
  if (ka.m !== kb.m) return ka.m - kb.m;
  if (ka.d !== kb.d) return ka.d - kb.d;
  return (a.order ?? 0) - (b.order ?? 0);
}

/** Content words (≥4 chars, alphanumeric only) — the basis of repetition checks. */
function significantWords(text: string): string[] {
  return (text || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
}

/** A year-summary milestone is dropped when it merely narrates the same events
    as the dated achievements of that year (3+ shared significant words =
    "this milestone recaps those achievements"). Word-based, so it is immune
    to emoji/„??"/wording differences between the seed and the DB copy.
    Milestones for years without achievements are always kept. */
function keepNarrative(e: ExperienceEntry, vocabByYear: Map<number, Set<string>>): boolean {
  const { y } = parseTimeline(e.year);
  const vocab = vocabByYear.get(y);
  if (!vocab || vocab.size === 0) return true;
  const hits = significantWords(`${e.title} ${e.note}`).filter((w) => vocab.has(w)).length;
  return hits < 3;
}

/** GET /api/profile — everything about the person (used by the hero/about). */
export async function getProfile(_req: Request, res: Response): Promise<void> {
  const content = await storage.getContent();
  res.json({ profile: content.profile, achievements: content.achievements });
}
