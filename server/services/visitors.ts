import type { Request } from "express";
import { env } from "../config/env.js";
import type { NewVisitor } from "./storage.js";

const IP_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/; // IPv4
const IPV6_RE = /^[0-9a-fA-F:]{2,45}$/;

function plausibleIp(value: string | undefined): string | null {
  if (!value) return null;
  const ip = value.trim();
  if (ip.length > 45) return null;
  // Strip an IPv6 scope id (`fe80::1%eth0`) and bracket notation.
  const bare = ip.replace(/^\[|\]$/g, "").split("%")[0] ?? "";
  if (IP_RE.test(bare) || IPV6_RE.test(bare)) return bare;
  return null;
}

function clientIp(req: Request): string {
  // X-Forwarded-For is only trusted because the app runs behind Vercel, which
  // overwrites the header. Anything that doesn't look like an IP is dropped.
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") {
    const first = fwd.split(",")[0];
    const ip = plausibleIp(first);
    if (ip) return ip;
  }
  const real = req.headers["x-real-ip"];
  const realFirst = Array.isArray(real) ? real[0] : real;
  const realIp = plausibleIp(realFirst);
  if (realIp) return realIp;
  const socket = plausibleIp(req.socket?.remoteAddress);
  return socket || "";
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
