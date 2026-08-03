/* Shared content model + normalization between the JSON fallback and Supabase. */

export interface ProfileRecord {
  name: string;
  handle: string;
  role: string;
  est?: string;
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
  weight?: number;
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
  date?: string;
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

/** Recompute count-driven hero stats from live content so the numbers can't
    drift from the data. Labels without a countable source (dan, stubbornness)
    keep their saved value. */
export function deriveStats(
  profile: ProfileRecord,
  projects: ProjectRecord[],
  achievements: AchievementRecord[],
): { label: string; value: string }[] {
  const byCount = {
    "projects shipped": `${projects.length}+`,
    "awards & wins": `${achievements.length}+`,
  } as const;
  const danBadge = profile.badges.find((b) => /^\d+(st|nd|rd|th) dan/i.test(b));
  const mapped = profile.stats.map((s) => {
    if (s.label in byCount) return { ...s, value: byCount[s.label as keyof typeof byCount] };
    if (s.label === "martial arts dan" && danBadge) {
      const dan = danBadge.match(/^\d+(st|nd|rd|th) dan/i)?.[0];
      if (dan) return { ...s, value: dan };
    }
    return s;
  });
  return dedupeBy(mapped, (s) => s.label);
}

/** Keep the "N+ Innovation Awards" badge in lockstep with the achievements
    collection (same count the hero "awards & wins" stat reports). */
export function deriveBadges(profile: ProfileRecord, achievements: AchievementRecord[]): string[] {
  const wins = achievements.length;
  const mapped = profile.badges.map((b) => (/^\d+\+ innovation awards/i.test(b) ? `${wins}+ Innovation Awards` : b));
  return dedupeBy(mapped, (b) => b);
}

/** First occurrence wins — a safety net against duplicate labels/values that
    seed's additive merge can introduce when derived values land in the DB. */
function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Collapse duplicate stat labels / badge strings so additive seeding can't
    leave the DB with double entries (derived values + canonical ones). */
export function normalizeProfile(profile: ProfileRecord): ProfileRecord {
  return {
    ...profile,
    stats: dedupeBy(profile.stats, (s) => s.label),
    badges: dedupeBy(profile.badges, (b) => b),
  };
}
