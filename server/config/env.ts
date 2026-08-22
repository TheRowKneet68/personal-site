import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The single project-wide env file lives at the repo root. Walk up from this
// file so dev (server/config) and build (server/dist/config) both find it
// regardless of cwd. On Vercel there is no .env — vars come from the dashboard.
function repoRoot(): string {
  let dir = __dirname;
  while (dir !== path.parse(dir).root) {
    if (existsSync(path.join(dir, "data.json"))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

dotenv.config({ path: path.join(repoRoot(), ".env"), quiet: true });

/** Centralised env access — every value read once, typed, validated. */
export const env = {
  isVercel: process.env.VERCEL === "1",
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT || 3001),

  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",

  githubToken: process.env.GITHUB_TOKEN || "",
  githubUser: process.env.GITHUB_USER || "TheRowKneet68",

  /** No default — a default password would be public knowledge from this repo. */
  adminPassword: process.env.ADMIN_PASSWORD || "",

  /** Cyber-Deck credential — deliberately SEPARATE from ADMIN_PASSWORD so a
      leaked deck key can't edit site content and vice versa. */
  deckPassword: process.env.DECK_PASSWORD || "",

  /** Blynk IoT tokens (Suraksha Ghar home hub). Server-side ONLY: proxied
      through /api/iot/* so they never reach the browser bundle. Comma-
      separated to support multiple Blynk apps controlled simultaneously;
      each becomes an independently addressable hub (hub-1, hub-2, …).
      Empty = hub endpoints respond 503 and the dashboard shows offline. */
  blynkTokens: (process.env.BLYNK_TOKEN || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean),

  // Capacitor WebView origins are always allowed: the APK serves its UI
  // locally (https://localhost on Android, capacitor://localhost on iOS)
  // and calls this API cross-origin. Bearer auth still gates every route.
  corsOrigins: [
    ...(process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
    "capacitor://localhost",
    "https://localhost",
  ],
  geolocate: process.env.IP_GEOLOCATION === "true",
} as const;

export function hasSupabase(): boolean {
  return Boolean(env.supabaseUrl && (env.supabaseServiceRoleKey || env.supabaseAnonKey));
}

/** Admin login must be explicitly configured with a strong password. */
export function adminPasswordValid(): boolean {
  return env.adminPassword.length >= 12;
}

/** Deck login: same 12-char floor, warn-once machinery mirrored from admin. */
let deckWarned = false;

export function deckEnabled(): boolean {
  if (env.deckPassword) {
    if (env.deckPassword.length < 12) {
      if (!deckWarned) {
        deckWarned = true;
        console.warn("[deck] DECK_PASSWORD is shorter than 12 characters — the deck is disabled.");
      }
      return false;
    }
    return true;
  }
  if (!deckWarned) {
    deckWarned = true;
    console.warn("[deck] DECK_PASSWORD is not set — the deck is disabled.");
  }
  return false;
}

let adminWarned = false;

export function adminEnabled(): boolean {
  if (env.adminPassword) {
    if (!adminPasswordValid()) {
      if (!adminWarned) {
        adminWarned = true;
        console.warn("[admin] ADMIN_PASSWORD is shorter than 12 characters — the admin panel is disabled.");
      }
      return false;
    }
    return true;
  }
  if (!adminWarned) {
    adminWarned = true;
    console.warn("[admin] ADMIN_PASSWORD is not set — the admin panel is disabled.");
  }
  return false;
}
