import "dotenv/config";

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

  corsOrigins: (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
  geolocate: process.env.IP_GEOLOCATION === "true",
} as const;

export function hasSupabase(): boolean {
  return Boolean(env.supabaseUrl && (env.supabaseServiceRoleKey || env.supabaseAnonKey));
}
