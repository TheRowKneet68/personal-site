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
    mounted.current = true;
    // Offline: fail instantly instead of hanging the splash for 12s.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("error");
      return;
    }
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const logoUrl = data.profile?.logo ?? null;

  // Kick off image downloads the instant the URLs arrive from the API,
  // before React renders the <img> tags.
  useEffect(() => {
    for (const url of [data.profile?.portrait1, data.profile?.portrait]) {
      if (url) { const i = new Image(); i.src = url; }
    }
  }, [data.profile?.portrait1, data.profile?.portrait]);

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    if (!logoUrl) {
      link.href = "/images/favicon.svg";
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const s = 128;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = s;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no ctx");
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
        ctx.clip();
        const ir = img.width / img.height;
        let dw = s, dh = s, dx = 0, dy = 0;
        if (ir > 1) { dw = s * ir; dx = (s - dw) / 2; }
        else { dh = s / ir; dy = (s - dh) / 2; }
        ctx.drawImage(img, dx, dy, dw, dh);
        link.href = canvas.toDataURL("image/png");
      } catch {
        link.href = logoUrl;
      }
    };
    img.onerror = () => { link.href = logoUrl; };
    img.src = logoUrl;
  }, [logoUrl]);

  return (
    <DataContext.Provider value={{ ...data, status, reload: load }}>{children}</DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
