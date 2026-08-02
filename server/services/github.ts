import { env } from "../config/env.js";

export interface GitHubStats {
  username: string;
  publicRepos: number;
  followers: number;
  totalStars: number;
  topLanguages: string[];
  fetchedAt: string;
}

interface GitHubUser {
  public_repos: number;
  followers: number;
}
interface GitHubRepo {
  stargazers_count: number;
  language: string | null;
  fork: boolean;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { at: number; data: GitHubStats | null } | null = null;

/** GitHub profile summary, cached 5 minutes. Returns null when unreachable. */
export async function getGitHubStats(): Promise<GitHubStats | null> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "therowkneet-portfolio",
    };
    if (env.githubToken) headers.Authorization = `Bearer ${env.githubToken}`;

    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${env.githubUser}`, { headers }),
      fetch(`https://api.github.com/users/${env.githubUser}/repos?per_page=100&sort=pushed`, { headers }),
    ]);
    if (!userRes.ok || !reposRes.ok) {
      cache = { at: Date.now(), data: null };
      return null;
    }

    const user = (await userRes.json()) as GitHubUser;
    const repos = (await reposRes.json()) as GitHubRepo[];

    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
    const langCount = new Map<string, number>();
    for (const r of repos) {
      if (r.language) langCount.set(r.language, (langCount.get(r.language) ?? 0) + 1);
    }
    const topLanguages = [...langCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([lang]) => lang);

    const data: GitHubStats = {
      username: env.githubUser,
      publicRepos: user.public_repos,
      followers: user.followers,
      totalStars,
      topLanguages,
      fetchedAt: new Date().toISOString(),
    };
    cache = { at: Date.now(), data };
    return data;
  } catch {
    cache = { at: Date.now(), data: null };
    return null;
  }
}
