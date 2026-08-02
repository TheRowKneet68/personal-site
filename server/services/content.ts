/* Shared content model + normalization between the JSON fallback and Supabase. */

export interface ProfileRecord {
  name: string;
  handle: string;
  role: string;
  slogan: string;
  location: string;
  phone: string;
  phone_raw: string;
  whatsapp: string;
  email: string;
  socials: Record<string, string>;
  badges: string[];
  stats: { label: string; value: string }[];
  focus: string[];
  tech: Record<string, string[]>;
  principles: { title: string; note: string }[];
  journey: ExperienceEntry[];
  fun_facts: string[];
  testimonials?: { quote: string; source: string }[];
  featured_in?: { name: string; url: string; images?: string[] }[];
}

export interface CaseStudy {
  problem: string[];
  solution: string[];
  architecture?: string[];
  stack?: string[];
  challenges?: { problem: string; fix: string }[];
  impact?: string[];
  lessons?: string[];
  timeline?: string;
}

export interface ProjectRecord {
  id: string;
  title: string;
  tagline: string;
  category: string;
  year: string;
  status: string;
  featured?: boolean;
  images?: string[];
  tech: string[];
  description: string;
  highlights?: string[];
  links?: { github?: string; demo?: string };
  caseStudy?: CaseStudy;
}

export interface AchievementRecord {
  id: string;
  event: string;
  title: string;
  year: string;
  result: string;
  detail: string;
  rank?: string;
  highlight?: boolean;
  images?: string[];
}

export interface ExperienceEntry {
  year: string;
  title: string;
  note: string;
}

export interface Skills {
  categories: Record<string, string[]>;
  focus: string[];
}

export interface Content {
  profile: ProfileRecord;
  projects: ProjectRecord[];
  achievements: AchievementRecord[];
  skills: Skills;
  experience: ExperienceEntry[];
}

interface RawDataFile {
  profile: ProfileRecord;
  projects: ProjectRecord[];
  achievements: AchievementRecord[];
}

/** Normalize the raw JSON file into the shared Content shape. */
export function normalizeFromFile(raw: RawDataFile): Content {
  const profile = raw.profile;
  return {
    profile,
    projects: raw.projects,
    achievements: raw.achievements,
    skills: { categories: profile.tech || {}, focus: profile.focus || [] },
    experience: profile.journey || [],
  };
}

/* ---- Supabase row mapping ---- */

export interface ContentRow {
  id: string;
  data: unknown;
}

export function contentToRows(content: Content): {
  profile: ContentRow[];
  projects: ContentRow[];
  achievements: ContentRow[];
  skills: ContentRow[];
  experience: ContentRow[];
} {
  return {
    profile: [{ id: "main", data: content.profile }],
    projects: content.projects.map((p) => ({ id: p.id, data: p })),
    achievements: content.achievements.map((a) => ({ id: a.id, data: a })),
    skills: [{ id: "skills", data: content.skills }],
    experience: content.experience.map((e) => ({ id: `${e.year}-${e.title}`, data: e })),
  };
}

export function rowsToContent(rows: {
  profile: ContentRow[];
  projects: ContentRow[];
  achievements: ContentRow[];
  skills: ContentRow[];
  experience: ContentRow[];
}): Content {
  const profile = (rows.profile[0]?.data ?? {}) as ProfileRecord;
  const skills = (rows.skills[0]?.data ?? { categories: profile.tech, focus: profile.focus }) as Skills;
  const experience = (rows.experience.map((r) => r.data) as ExperienceEntry[]).length
    ? (rows.experience.map((r) => r.data) as ExperienceEntry[])
    : (profile.journey as ExperienceEntry[]);
  return {
    profile,
    projects: rows.projects.map((r) => r.data as ProjectRecord),
    achievements: rows.achievements.map((r) => r.data as AchievementRecord),
    skills,
    experience,
  };
}

export function dedupeRowsById<T extends ContentRow>(rows: T[]): T[] {
  const keep = new Map<string, T>();
  for (const row of rows) {
    keep.set(row.id, row);
  }
  return [...keep.values()];
}
