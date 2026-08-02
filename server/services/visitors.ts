import type { Request } from "express";
import { env } from "../config/env.js";
import type { NewVisitor } from "./storage.js";

function clientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real) return real.trim();
  return req.socket?.remoteAddress || "";
}

function parseDevice(ua: string): string {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) return "mobile";
  return "desktop";
}

function parseBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Unknown";
}

/** Best-effort IP geolocation. Off unless IP_GEOLOCATION=true. */
async function geolocate(ip: string): Promise<{ country: string | null; city: string | null }> {
  if (!env.geolocate || !ip || ip === "::1" || ip === "127.0.0.1") return { country: null, city: null };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
      headers: { "User-Agent": "therowkneet-portfolio" },
    });
    clearTimeout(timer);
    if (!res.ok) return { country: null, city: null };
    const json = (await res.json()) as { country_name?: string; city?: string };
    return { country: json.country_name || null, city: json.city || null };
  } catch {
    return { country: null, city: null };
  }
}

export async function buildVisitor(req: Request): Promise<NewVisitor> {
  const ua = req.headers["user-agent"] || "";
  const ip = clientIp(req);
  const geo = await geolocate(ip);
  return {
    ip,
    device: parseDevice(ua),
    browser: parseBrowser(ua),
    country: geo.country,
    city: geo.city,
  };
}

export { clientIp };
