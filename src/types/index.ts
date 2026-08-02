export interface ProfileStats {
  label: string;
  value: string;
}

export interface Principle {
  title: string;
  note: string;
}

export interface ExperienceEntry {
  year: string;
  title: string;
  note: string;
}

export interface Testimonial {
  quote: string;
  source: string;
}

export interface FeaturedIn {
  name: string;
  url: string;
  images?: string[];
}

export interface Profile {
  name: string;
  handle: string;
  logo?: string;
  portrait?: string;
  role: string;
  slogan: string;
  location: string;
  phone: string;
  phone_raw: string;
  whatsapp: string;
  email: string;
  socials: Record<string, string>;
  badges: string[];
  stats: ProfileStats[];
  focus: string[];
  about?: string[];
  tech: Record<string, string[]>;
  principles: Principle[];
  journey: ExperienceEntry[];
  fun_facts: string[];
  testimonials?: Testimonial[];
  featured_in?: FeaturedIn[];
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

export interface Project {
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

export interface Achievement {
  id: string;
  event: string;
  title: string;
  year: string;
  result: string;
  detail: string;
  images?: string[];
}

export interface Skills {
  categories: Record<string, string[]>;
  focus: string[];
}

export interface GitHubStats {
  username: string;
  publicRepos: number;
  followers: number;
  totalStars: number;
  topLanguages: string[];
  fetchedAt: string;
}

export interface Counts {
  projects: number;
  messages: number;
  visitors: number;
  subscribers: number;
}

/* ---- API response shapes ---- */

export interface ProjectsResponse {
  projects: Project[];
}

export interface SkillsResponse {
  skills: Skills;
}

export interface ExperienceResponse {
  experience: ExperienceEntry[];
}

export interface ProfileResponse {
  profile: Profile;
  achievements: Achievement[];
}

export interface StatsResponse {
  stats: ProfileStats[];
  counts: Counts;
  github: GitHubStats | null;
  storage: "supabase" | "json";
}

/** Shape used by the admin panel — profile.tech/focus double as the skills. */
export interface AdminContent {
  profile: Profile;
  projects: Project[];
  achievements: Achievement[];
}

export interface ContactMessage {
  id?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  ip?: string;
  created_at?: string;
}

export interface ApiError {
  error: string;
}
