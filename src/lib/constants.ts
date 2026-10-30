import type { GitHubStats, StatsResponse } from "../types";

export const SITE = {
  name: "Ronit Baniya Gupta",
  handle: "RowKneetLabs",
  url: import.meta.env.VITE_SITE_URL || "https://www.ronitbaniyagupta.com.np",
  ogImage: "/images/og-card.jpg",
  email: "ronitbaniya68@gmail.com",
  phone: "+977 982-911-7277",
  whatsapp: "9779829117277",
  github: "https://github.com/TheRowKneet68",
  linkedin: "https://www.linkedin.com/in/jr-erronitbaniya/",
  resume: "/resume.pdf",
} as const;

/** Canonical, non-www connect URL. The business card QR encodes EXACTLY this
    string, so a change of social accounts never requires reprinting. */
export const CONNECT_URL = "https://ronitbaniyagupta.com.np/connect";

/** localStorage key for the admin session - also shows the site's Edit links. */
export const ADMIN_TOKEN_KEY = "rk-admin-token";

export const NAV_LINKS = [
  { label: "Work", href: "#work" },
  { label: "Numbers", href: "#numbers" },
  { label: "Recognition", href: "#recognition" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const;

/** status → { label, tone } for project ribbons */
export const STATUS_META: Record<string, { label: string; tone: "accent" | "moving" | "muted" }> = {
  "award-winning": { label: "award-winning", tone: "accent" },
  shipped: { label: "shipped", tone: "muted" },
  "market-launched": { label: "on the market", tone: "accent" },
  "major project": { label: "major project", tone: "accent" },
  "in development": { label: "in development", tone: "moving" },
  "in progress": { label: "in progress", tone: "moving" },
  concept: { label: "concept", tone: "moving" },
  experimental: { label: "experimental", tone: "moving" },
  prototype: { label: "prototype", tone: "moving" },
  built: { label: "built", tone: "muted" },
  tool: { label: "tool", tone: "muted" },
  fun: { label: "fun build", tone: "muted" },
  freelance: { label: "freelance", tone: "accent" },
  academic: { label: "academic", tone: "moving" },
  completed: { label: "completed", tone: "muted" },
};

export function statusMeta(status: string): { label: string; tone: "accent" | "moving" | "muted" } {
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

// Display names for profile.socials keys. Deliberately not lib/platforms:
// that module bundles every brand icon, too heavy for the footer.
const SOCIAL_NAMES: Record<string, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
  twitter: "X",
  whatsapp: "WhatsApp",
};

export function socialName(key: string): string {
  return SOCIAL_NAMES[key.toLowerCase()] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** Built-in copy. Anything set in /admin (profile.hero, profile.intros) wins. */
export const DEFAULT_HERO = {
  line1: "I build what",
  accent: "doesn't",
  line2: "exist yet.",
  lede: "Hardware on the workbench, software in the terminal, and a habit of shipping both before anyone asks.",
} as const;

export const DEFAULT_INTROS = {
  work: "Systems I designed and built, from the circuit board to the app. Open any of them for the problem, the build, and what broke along the way.",
  numbers: "Counted live from the project list and the competition record. Hover or tap any bar for detail, or open the numbers under each chart.",
  recognition: "Results from project competitions and expos in Nepal, best first. Each one links to its certificate.",
  about: "",
  contact:
    "A hackathon team short an embedded engineer? A product idea that needs a circuit, firmware and an app? Tell me about it. My phone is always within reach of my soldering iron.",
} as const;

export function introOf(intros: Partial<Record<keyof typeof DEFAULT_INTROS, string>> | undefined, key: keyof typeof DEFAULT_INTROS): string {
  return intros?.[key]?.trim() || DEFAULT_INTROS[key];
}
