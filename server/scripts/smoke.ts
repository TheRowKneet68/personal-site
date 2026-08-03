/* Run: npm run smoke -w server (or: npx tsx server/scripts/smoke.ts) */
import { app } from "../app.js";
import type { AddressInfo } from "node:net";
import { hashPassword, verifyPassword } from "../middleware/auth.js";
import { deepMerge } from "../services/storage.js";

let failures = 0;

function check(label: string, cond: boolean): void {
  if (cond) {
    console.log(`  ok   ${label}`);
  } else {
    failures++;
    console.error(`  FAIL ${label}`);
  }
}

async function call(path: string, init?: RequestInit): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, init);
  return { status: res.status, json: await res.json().catch(() => null) };
}

const server = app.listen(0);
const port = (server.address() as AddressInfo).port;

try {
  const health = await call("/api/health");
  check("GET /api/health -> 200", health.status === 200 && (health.json as { ok: boolean }).ok === true);

  const projects = await call("/api/projects");
  const projectList = (projects.json as { projects: unknown[] }).projects;
  check("GET /api/projects -> 45 projects", projects.status === 200 && projectList.length === 45);

  const skills = await call("/api/skills");
  check(
    "GET /api/skills -> categories + focus",
    skills.status === 200 && !!(skills.json as { skills: { categories: unknown } }).skills.categories,
  );

  const experience = await call("/api/experience");
  check("GET /api/experience -> journey entries", experience.status === 200);

  const stats = await call("/api/stats");
  check("GET /api/stats -> counts + profile stats", stats.status === 200 && !!(stats.json as { stats: unknown[] }).stats);

  const okContact = await call("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Smoke Test",
      email: "smoke@example.com",
      subject: "smoke",
      message: "This is a smoke test message with enough characters.",
    }),
  });
  check("POST /api/contact (valid) -> 200", okContact.status === 200 && (okContact.json as { ok: boolean }).ok === true);

  const badContact = await call("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "x", email: "nope", message: "short" }),
  });
  check("POST /api/contact (invalid) -> 400", badContact.status === 400);

  const honeypot = await call("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Bot", email: "bot@spam.com", message: "buy stuff", website: "http://spam" }),
  });
  check("POST /api/contact (honeypot) -> fake success", honeypot.status === 200 && (honeypot.json as { ok: boolean }).ok === true);

  const nlEmail = `smoke-${Date.now()}@example.com`;
  const sub1 = await call("/api/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: nlEmail }),
  });
  const sub2 = await call("/api/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: nlEmail }),
  });
  check(
    "POST /api/newsletter -> subscribed then deduped",
    sub1.status === 200 && (sub1.json as { subscribed: boolean }).subscribed === true && (sub2.json as { subscribed: boolean }).subscribed === false,
  );

  const visitor = await call("/api/visitors", { method: "POST" });
  check("POST /api/visitors -> 200", visitor.status === 200);

  // Password hashing (pure crypto, no DB) — guards the admin change-password feature.
  const hash = await hashPassword("smoke-test-password-123");
  check(
    "scrypt hash/verify round-trip",
    (await verifyPassword("smoke-test-password-123", hash)) === true &&
      (await verifyPassword("wrong-password", hash)) === false,
  );

  // Non-destructive seed merge (pure, no DB) — guards the image-loss fix.
  const priorContent = {
    title: "Old title",
    images: ["admin-added.jpg"],
    featured_in: [{ name: "ICT Frame", url: "https://a", images: ["supabase-only.png"] }],
    stats: [{ label: "A", value: "1" }],
  };
  const nextContent = {
    title: "New title",
    images: ["data-json.jpg"],
    featured_in: [{ name: "ICT Frame", url: "https://a", images: ["data-json.png"] }],
    extra: true,
  };
  const merged = deepMerge(priorContent, nextContent) as Record<string, unknown>;
  const images = merged.images as string[];
  const outlet = (merged.featured_in as { name: string; images: string[] }[])[0]!;
  check(
    "seed deepMerge: scalar from next, arrays unioned, prior-only preserved",
    merged.title === "New title" &&
      images.includes("data-json.jpg") &&
      images.includes("admin-added.jpg") &&
      outlet.images.includes("supabase-only.png") &&
      (merged.extra as boolean) === true,
  );
} finally {
  server.close();
}

console.log(failures === 0 ? "\n>> smoke test passed" : `\n>> ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
