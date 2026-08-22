import type {
  AdminContent,
  ApiError,
  ContactMessage,
  ExperienceResponse,
  IotDevice,
  IotDevicesResponse,
  IotSetResponse,
  IotStateResponse,
  ProfileResponse,
  ProjectsResponse,
  SkillsResponse,
  StatsResponse,
} from "../types";
import { isNativeApp } from "../lib/native";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/** Inside the APK the WebView serves the bundled UI from https://localhost,
    where no /api exists — calls must go absolute to the live backend.
    On the website this stays "" (same-origin), exactly as before. */
const API_BASE = isNativeApp() ? "https://www.ronitbaniyagupta.com.np" : "";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    // Hard ceiling so a dead mobile link can never leave a toggle pending forever.
    signal: AbortSignal.timeout(12_000),
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
    fetch(`${API_BASE}/api/visitors`, { method: "POST", keepalive: true }).catch(() => undefined);
  },

  /* ---- Admin ---- */

  adminLogin: (password: string) =>
    request<{ token: string }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  /** Cyber-Deck credential — a separate vault from the content admin. */
  deckLogin: (password: string) =>
    request<{ token: string }>("/api/deck/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  deckChangePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<{ ok: boolean; token: string }>("/api/deck/change-password", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
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

  /* ---- Cyber-Deck IoT (server proxies to Blynk; no token client-side) ---- */

  listIotDevices: (token: string) =>
    request<IotDevicesResponse>("/api/iot/devices", { headers: { Authorization: `Bearer ${token}` } }),

  saveIotDevices: (token: string, devices: IotDevice[]) =>
    request<{ ok: boolean; devices: IotDevice[] }>("/api/iot/devices", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ devices }),
    }),

  getIotState: (token: string) =>
    request<IotStateResponse>("/api/iot/state", { headers: { Authorization: `Bearer ${token}` } }),

  setIotDeviceState: (token: string, id: string, value: 0 | 1) =>
    request<IotSetResponse>(`/api/iot/devices/${encodeURIComponent(id)}/state`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ value }),
    }),
};
