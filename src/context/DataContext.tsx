import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../services/api";
import type {
  Achievement,
  Counts,
  ExperienceEntry,
  GitHubStats,
  Profile,
  ProfileStats,
  Project,
  Skills,
} from "../types";

type DataStatus = "loading" | "ready" | "error";

interface DataContextValue {
  status: DataStatus;
  profile: Profile | null;
  projects: Project[] | null;
  achievements: Achievement[] | null;
  skills: Skills | null;
  experience: ExperienceEntry[] | null;
  profileStats: ProfileStats[] | null;
  counts: Counts | null;
  github: GitHubStats | null;
  storage: "supabase" | "json" | null;
  reload: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DataStatus>("loading");
  const [data, setData] = useState<Omit<DataContextValue, "status" | "reload">>({
    profile: null,
    projects: null,
    achievements: null,
    skills: null,
    experience: null,
    profileStats: null,
    counts: null,
    github: null,
    storage: null,
  });
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [profileRes, projectsRes, skillsRes, experienceRes, statsRes] = await Promise.all([
        api.getProfile(),
        api.getProjects(),
        api.getSkills(),
        api.getExperience(),
        api.getStats(),
      ]);
      if (!mounted.current) return;
      setData({
        profile: profileRes.profile,
        achievements: profileRes.achievements,
        projects: projectsRes.projects,
        skills: skillsRes.skills,
        experience: experienceRes.experience,
        profileStats: statsRes.stats,
        counts: statsRes.counts,
        github: statsRes.github,
        storage: statsRes.storage,
      });
      setStatus("ready");
    } catch {
      if (mounted.current) setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  return (
    <DataContext.Provider value={{ ...data, status, reload: load }}>{children}</DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
