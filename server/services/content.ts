/* Shared content model + normalization between the JSON fallback and Supabase. */

export interface SocialLinkRecord {
  id: string;
  platform: string;
  name: string;
  url: string;
  description: string;
  enabled: boolean;
  showOnConnect: boolean;
  sortOrder: number;
  iconOverride: string | null;
}

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
  /** Structured social links (the /connect page + admin manager). The legacy
      `socials` record above is DERIVED from the enabled links on serve - one
      source of truth, nothing else in the site needs to change. */
  social_links?: SocialLinkRecord[];
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
  /** Manual display order - stamped from array position on save/seed. */
  order?: number;
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
  order?: number;
}

export interface ExperienceEntry {
  year: string;
  title: string;
  note: string;
  order?: number;
  type?: "journey" | "achievement";
  /** Numeric (1960-9998) bucket used to group a timeline chronologically;
      gets stamped by the /api/experience controller. */
  yearGroup?: number;
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

/** First occurrence wins - a safety net against duplicate labels/values that
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

/* ---- Social links (display names used by the auto-migration below). Keep
        in sync with src/lib/platforms.ts (the client's detection table). ---- */

const DEFAULT_PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  github: "GitHub",
  youtube: "YouTube",
  x: "X",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  threads: "Threads",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  snapchat: "Snapchat",
  reddit: "Reddit",
  pinterest: "Pinterest",
  discord: "Discord",
  twitch: "Twitch",
  medium: "Medium",
  substack: "Substack",
  dev: "dev.to",
  hashnode: "Hashnode",
  dribbble: "Dribbble",
  behance: "Behance",
  figma: "Figma",
  codepen: "CodePen",
  codesandbox: "CodeSandbox",
  replit: "Replit",
  spotify: "Spotify",
  vimeo: "Vimeo",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  mixcloud: "Mixcloud",
  stackoverflow: "Stack Overflow",
  gitlab: "GitLab",
  bitbucket: "Bitbucket",
  huggingface: "Hugging Face",
  quora: "Quora",
  paypal: "PayPal",
  linktree: "Linktree",
  tumblr: "Tumblr",
  flickr: "Flickr",
  yelp: "Yelp",
  tripadvisor: "Tripadvisor",
  kaggle: "Kaggle",
  hackerrank: "HackerRank",
  leetcode: "LeetCode",
  producthunt: "Product Hunt",
  patreon: "Patreon",
  zoom: "Zoom",
  signal: "Signal",
  line: "LINE",
  wechat: "WeChat",
  messenger: "Messenger",
  meetup: "Meetup",
  kick: "Kick",
};

function makeSocialLink(platform: string, url: string, sortOrder: number): SocialLinkRecord {
  return {
    id: `social-${platform}`,
    platform,
    name: DEFAULT_PLATFORM_LABELS[platform] ?? platform,
    url,
    description: "",
    enabled: true,
    showOnConnect: true,
    sortOrder,
    iconOverride: null,
  };
}

/** Idempotent bridge between the legacy `socials` record and the structured
    `social_links` array. Any socials key without a matching social_links row
    gets absorbed once (with defaults); `socials` is then re-derived from the
    ENABLED links so the rest of the site keeps working with no code change.
    Running it on every serve/save means existing URLs migrate automatically -
    nothing has to be re-entered by hand. */
export function migrateSocialLinks(profile: ProfileRecord): ProfileRecord {
  const socials = profile.socials ?? {};
  const existing = Array.isArray(profile.social_links) ? [...profile.social_links] : [];
  const byPlatform = new Map<string, SocialLinkRecord>();
  for (const link of existing) byPlatform.set(link.platform, link);

  let nextOrder = existing.reduce((m, l) => Math.max(m, l.sortOrder + 1), existing.length);
  for (const [platform, url] of Object.entries(socials)) {
    if (typeof url !== "string" || !url.trim()) continue;
    if (!byPlatform.has(platform)) {
      const link = makeSocialLink(platform, url, nextOrder++);
      existing.push(link);
      byPlatform.set(platform, link);
    }
  }

  const sorted = [...existing].sort((a, b) => a.sortOrder - b.sortOrder);
  const enabled = sorted.filter((l) => l.enabled);
  return {
    ...profile,
    social_links: sorted,
    socials: Object.fromEntries(enabled.map((l) => [l.platform, l.url])),
  };
}

/** Only http(s) is allowed - rejects javascript:, data:, vbscript:, file:, etc. */
export function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

/** Data-only cleanup of an admin-submitted social_links array: trims text,
    nulls empty icon overrides, stamps sort order from array position. */
export function normalizeSocialLinks(links: SocialLinkRecord[]): SocialLinkRecord[] {
  return links.map((l, i) => ({
    id: l.id && /^[a-z0-9._-]+$/i.test(l.id) ? l.id : `social-${(l.platform || "").toLowerCase() || i}`,
    platform: l.platform.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || "link",
    name: l.name.trim().slice(0, 80),
    url: l.url.trim(),
    description: l.description.trim().slice(0, 300),
    enabled: Boolean(l.enabled),
    showOnConnect: Boolean(l.showOnConnect),
    sortOrder: i,
    iconOverride: l.iconOverride && l.iconOverride.trim() ? l.iconOverride.trim().slice(0, 100) : null,
  }));
}

/** Returns a human-readable error message, or null when the links are safe
    to store. Trust-boundary check - runs on the server on every admin save. */
export function validateSocialLinks(links: unknown): string | null {
  if (!Array.isArray(links)) return null;
  for (let i = 0; i < links.length; i++) {
    const l = links[i] as Partial<SocialLinkRecord> | null;
    if (!l || typeof l !== "object") return `social link #${i + 1}: invalid record`;
    if (typeof l.platform !== "string" || !l.platform.trim())
      return `social link #${i + 1}: platform is required`;
    if (typeof l.name !== "string" || !l.name.trim())
      return `social link #${i + 1}: display name is required`;
    if (l.name.trim().length > 80) return `social link #${i + 1}: display name is too long (max 80)`;
    if (typeof l.url !== "string" || !isValidHttpUrl(l.url))
      return `social link #${i + 1}: URL must start with http:// or https://`;
    if (l.url.length > 2048) return `social link #${i + 1}: URL is too long (max 2048)`;
    if (typeof l.description === "string" && l.description.length > 300)
      return `social link #${i + 1}: description is too long (max 300)`;
  }
  return null;
}
