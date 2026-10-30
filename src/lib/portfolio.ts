/* Presentation helpers over the CMS data. Everything here derives from the
   content the admin panel manages - nothing is invented, only ranked,
   cleaned up or cross-referenced. */
import type { Achievement, FeaturedIn, Project } from "../types";
import { diagramFor } from "./diagrams";

/** Strip copy-paste artifacts like "[cite: 1, 2]" and stray whitespace. */
export function clean(text: string | undefined | null): string {
  return (text ?? "").replace(/\s*\[cite:[^\]]*\]/gi, "").replace(/\s+/g, " ").trim();
}

/** A case study only counts if it actually has a problem or a build section. */
export function hasCaseStudy(p: Project): boolean {
  const cs = p.caseStudy;
  return Boolean(cs && ((cs.problem?.length ?? 0) > 0 || (cs.solution?.length ?? 0) > 0));
}

export function techOf(p: Project): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...(p.tech ?? []), ...(p.caseStudy?.stack ?? [])]) {
    const t = clean(raw);
    const key = t.toLowerCase();
    if (t && !seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-01-28,29" -> "28-29 Jan 2026", "2025-02-07" -> "7 Feb 2025", "2025" -> "2025". */
export function formatDate(raw: string | undefined): string {
  const s = (raw ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})((?:,\d{1,2})*)$/.exec(s);
  if (!m) return s;
  const [, y, mo, d, rest] = m;
  const month = MONTHS[Number(mo) - 1] ?? mo;
  const extra = (rest ?? "").split(",").filter(Boolean);
  const first = String(Number(d));
  const day = extra.length ? `${first}–${Number(extra[extra.length - 1])}` : first;
  return `${day} ${month} ${y}`;
}

/** Sortable key from the same raw date. */
export function dateKey(a: Achievement): string {
  return (a.date || a.year || "").slice(0, 10);
}

/** 1 = first place ... 5 = consolation; Infinity = not a placement. */
export function placementRank(a: Achievement): number {
  if (a.rank !== undefined && a.rank !== null && a.rank !== "") {
    const n = Number(a.rank);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const s = a.result.toLowerCase().replace(/-/g, " ");
  if (/\b1st\b|\bwinner\b|\bfirst (place|position)\b/.test(s)) return 1;
  if (s.includes("first runner")) return 2;
  if (s.includes("second runner")) return 3;
  if (s.includes("people's choice") || s.includes("public choice")) return 4;
  if (s.includes("consolation")) return 5;
  return Number.POSITIVE_INFINITY;
}

export function isPlacement(a: Achievement): boolean {
  return Number.isFinite(placementRank(a));
}

const PLACE_LABEL: Record<number, string> = {
  1: "1st place",
  2: "1st runner-up",
  3: "2nd runner-up",
  4: "People's choice",
  5: "Consolation prize",
};

export function placeLabel(a: Achievement): string {
  return PLACE_LABEL[placementRank(a)] ?? a.result;
}

/** Best placement first, then oldest first. */
export function byPlacement(a: Achievement, b: Achievement): number {
  return placementRank(a) - placementRank(b) || dateKey(a).localeCompare(dateKey(b));
}

/** "UDAAN 2025 — Project Expo (IOE ...)" -> "UDAAN 2025". */
export function shortEvent(event: string | undefined): string {
  return clean(event).split(/\s+[—–-]\s+|\s+\(/)[0] ?? "";
}

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Achievements whose title names this project ("Team Suraksha360" counts). */
export function recognitionFor(p: Project, achievements: Achievement[]): Achievement[] {
  const key = norm(p.title);
  if (key.length < 4) return [];
  return achievements.filter((a) => norm(a.title).includes(key));
}

/** Press items the project's own write-up mentions by outlet name. */
export function pressFor(p: Project, outlets: FeaturedIn[]): FeaturedIn[] {
  const text = norm(
    [p.description, ...(p.highlights ?? []), ...(p.caseStudy?.impact ?? [])].join(" "),
  );
  return outlets.filter((o) => o.name && text.includes(norm(o.name)));
}

/** "github.com/user" is a profile; "github.com/user/repo" is source code. */
export function githubLabel(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts.length >= 2 ? "Source code" : "GitHub profile";
  } catch {
    return "GitHub";
  }
}

// ponytail: stoplist of category words that live in tech lists but aren't
// parts or tools. Extend it when a new vague tag shows up in the index.
const NOT_A_PART = new Set(
  [
    "iot", "ai", "web", "electronics", "hardware", "sensors", "internet", "security",
    "automation", "robotics", "robots", "civil", "embedded systems", "communication",
    "modelling", "smart city", "wearables", "voice control", "smartphone control",
    "computer vision", "telemetry", "recovery", "rockets", "drones", "3d design",
    "event-driven architecture", "json persistence", "power electronics", "sms",
  ].map((s) => s.toLowerCase()),
);

export interface PartUse {
  name: string;
  projects: Project[];
}

/** Parts and tools ranked by how many projects actually used them. */
export function partsIndex(projects: Project[], min = 2): PartUse[] {
  const map = new Map<string, PartUse>();
  for (const p of projects) {
    for (const t of techOf(p)) {
      const key = t.toLowerCase();
      if (NOT_A_PART.has(key)) continue;
      const entry = map.get(key) ?? { name: t, projects: [] };
      if (!entry.projects.includes(p)) entry.projects.push(p);
      map.set(key, entry);
    }
  }
  return [...map.values()]
    .filter((e) => e.projects.length >= min)
    .sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name));
}

/** Drop emoji bullets from CMS notes ("🏆 Winner" -> "Winner"). */
export function stripEmoji(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]+\s?/gu, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** Mirrors ProjectVisual's fallback order, so layouts can drop the empty column. */
export function hasVisual(p: Project, outlets: FeaturedIn[]): boolean {
  return (
    Boolean(diagramFor(p)) ||
    Boolean(p.images?.length) ||
    pressFor(p, outlets).some((o) => o.images?.length) ||
    (p.highlights ?? []).some((h) => clean(h))
  );
}

/** "2023-06" -> "Jun 2023", "2024" -> "2024", "2025-01-27" -> "Jan 2025". */
export function formatMonth(raw: string | undefined): string {
  const s = (raw ?? "").trim();
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(s);
  if (!m) return s;
  const month = m[2] ? MONTHS[Number(m[2]) - 1] : undefined;
  return month ? `${month} ${m[1]}` : m[1]!;
}

/** "Jun 2023 – Feb 2024", "Since Jan 2024", or "" when unknown. */
export function dateRange(started?: string, finished?: string): string {
  const a = formatMonth(started);
  const b = formatMonth(finished);
  if (a && b) return a === b ? a : `${a} – ${b}`;
  if (a) return `Since ${a}`;
  return b ? `Until ${b}` : "";
}
