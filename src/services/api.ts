import type {
  ApiError,
  ExperienceResponse,
  ProfileResponse,
  ProjectsResponse,
  SkillsResponse,
  StatsResponse,
} from "../types";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = `request failed (${res.status})`;
    try {
      const body = (await res.json()) as ApiError;
      if (body.error) message = body.error;
    } catch {
      /* non-JSON error body — keep the default message */
    }
    throw new ApiClientError(message, res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  getProfile: () => request<ProfileResponse>("/api/profile"),
  getProjects: () => request<ProjectsResponse>("/api/projects"),
  getSkills: () => request<SkillsResponse>("/api/skills"),
  getExperience: () => request<ExperienceResponse>("/api/experience"),
  getStats: () => request<StatsResponse>("/api/stats"),

  postContact: (payload: { name: string; email: string; subject: string; message: string }) =>
    request<{ ok: boolean }>("/api/contact", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  postNewsletter: (email: string) =>
    request<{ ok: boolean; subscribed: boolean }>("/api/newsletter", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  /** Fire-and-forget visit beacon. */
  trackVisit: () => {
    fetch("/api/visitors", { method: "POST", keepalive: true }).catch(() => undefined);
  },
};
