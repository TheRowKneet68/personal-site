import type { GitHubStats, StatsResponse } from "../types";

export const SITE = {
  name: "Ronit Baniya Gupta",
  handle: "TheRowKneet",
  url: import.meta.env.VITE_SITE_URL || "https://www.ronitbaniyagupta.com.np",
  ogImage: "/images/og-card.jpg",
  email: "ronitbaniya68@gmail.com",
  phone: "+977 982-911-7277",
  whatsapp: "9779829117277",
  github: "https://github.com/TheRowKneet68",
  linkedin: "https://www.linkedin.com/in/jr-erronitbaniya/",
  resume: "/resume.pdf",
} as const;

export const NAV_LINKS = [
  { label: "about", href: "#about" },
  { label: "work", href: "#work" },
  { label: "wins", href: "#wins" },
  { label: "contact", href: "#contact" },
] as const;

/** status → { label, tone } for project ribbons */
export const STATUS_META: Record<string, { label: string; tone: "accent" | "warn" | "muted" }> = {
  "award-winning": { label: "award-winning", tone: "accent" },
  shipped: { label: "shipped", tone: "muted" },
  "market-launched": { label: "on the market", tone: "accent" },
  "major project": { label: "major project", tone: "accent" },
  "in development": { label: "in development", tone: "warn" },
  "in progress": { label: "in progress", tone: "warn" },
  concept: { label: "concept", tone: "warn" },
  experimental: { label: "experimental", tone: "warn" },
  prototype: { label: "prototype", tone: "warn" },
  built: { label: "built", tone: "muted" },
  tool: { label: "tool", tone: "muted" },
  fun: { label: "fun build", tone: "muted" },
  freelance: { label: "freelance", tone: "accent" },
  academic: { label: "academic", tone: "warn" },
  completed: { label: "completed", tone: "muted" },
};

export function statusMeta(status: string): { label: string; tone: "accent" | "warn" | "muted" } {
  return STATUS_META[status] ?? { label: status, tone: "muted" };
}

export const GITHUB_EMPTY: GitHubStats = {
  username: "",
  publicRepos: 0,
  followers: 0,
  totalStars: 0,
  topLanguages: [],
  fetchedAt: "",
};

export const STATS_EMPTY: StatsResponse["stats"] = [];
