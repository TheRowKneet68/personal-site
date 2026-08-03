import type {
  AdminContent,
  ApiError,
  ContactMessage,
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers as Record<string, string> | undefined) },
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

  /* ---- Admin ---- */

  adminLogin: (password: string) =>
    request<{ token: string }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  adminChangePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<{ ok: boolean; token: string }>("/api/admin/change-password", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getAdminContent: (token: string) =>
    request<AdminContent>("/api/admin/content", { headers: { Authorization: `Bearer ${token}` } }),

  saveAdminContent: (token: string, content: AdminContent) =>
    request<{ ok: boolean }>("/api/admin/content", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(content),
    }),

  adminMessages: (token: string) =>
    request<{ messages: ContactMessage[] }>("/api/admin/messages", { headers: { Authorization: `Bearer ${token}` } }),

  adminSubscribers: (token: string) =>
    request<{ subscribers: string[] }>("/api/admin/subscribers", { headers: { Authorization: `Bearer ${token}` } }),

  adminDeleteMessage: (token: string, id: string) =>
    request<{ ok: boolean }>(`/api/admin/messages/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminDeleteSubscriber: (token: string, email: string) =>
    request<{ ok: boolean }>(`/api/admin/subscribers/${encodeURIComponent(email)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminUpload: (token: string, payload: { data: string; contentType: string; name: string }) =>
    request<{ url: string }>("/api/admin/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
};
