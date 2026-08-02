/* Generate public/sitemap.xml from data.json so project URLs stay in sync.
   Run: node scripts/generate-sitemap.mjs */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw = JSON.parse(readFileSync(path.join(root, "data.json"), "utf8"));
const base = (process.env.VITE_SITE_URL ?? "https://therowkneet.vercel.app").replace(/\/$/, "");

const urls = [{ loc: "/", priority: "1.0", changefreq: "weekly" }];
for (const p of raw.projects) urls.push({ loc: `/projects/${p.id}`, priority: "0.8", changefreq: "monthly" });

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls
    .map(
      (u) =>
        `  <url>\n    <loc>${base}${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join("\n") +
  "\n</urlset>\n";

mkdirSync(path.join(root, "public"), { recursive: true });
writeFileSync(path.join(root, "public", "sitemap.xml"), xml);
console.log(`wrote public/sitemap.xml (${urls.length} urls)`);
