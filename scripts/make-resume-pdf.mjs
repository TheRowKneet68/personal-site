/* Generate public/resume.pdf from data.json with zero dependencies.
   Run: node scripts/make-resume-pdf.mjs
   ponytail: hand-rolled PDF (letter, Helvetica) - no pdf/puppeteer.
   Content flows onto additional pages when it runs long, so the resume can
   carry the full project list. If rich design is ever needed, swap in a real
   PDF library then. */
import { deflateSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw = JSON.parse(readFileSync(path.join(root, "data.json"), "utf8"));
const p = raw.profile;

const W = 612;
const H = 792;
const ML = 54;
const USABLE = W - ML - 54;
const BOTTOM = 40;
const PAGE_TOP = H - 62;

const ascii = (s) =>
  String(s)
    .replace(/-/g, "-")
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "");

const charW = (ch, size) => (ch === " " ? 0.28 : 0.5) * size;
const widthOf = (s, size) => [...s].reduce((a, c) => a + charW(c, size), 0);
const yearOf = (s) => {
  const m = String(s ?? "").match(/(19|20)\d{2}/);
  return m ? +m[0] : 0;
};

const pages = [];
let index = -1;

function cur() {
  return pages[index];
}
function newPage() {
  pages.push({ lines: [], rules: [] });
  index++;
  y = PAGE_TOP;
}
function ensure(px) {
  if (y - px < BOTTOM) newPage();
}

let y = PAGE_TOP;
newPage();

function draw(size, font, str) {
  ensure(size * 1.1);
  cur().lines.push({ x: ML, y, font, size, text: ascii(str) });
}

/** Per-line page guard so wrapped paragraphs break onto the next page instead
    of running past the bottom margin. */
function flow(size, font, str, indent = 0) {
  for (const para of ascii(str).split("\n")) {
    let curText = "";
    for (const word of para.split(/\s+/)) {
      const test = curText ? `${curText} ${word}` : word;
      if (indent + widthOf(test, size) > USABLE && curText) {
        ensure(size * 1.35);
        draw(size, font, curText);
        y -= size * 1.32;
        curText = word;
      } else {
        curText = test;
      }
    }
    if (curText) {
      ensure(size * 1.35);
      draw(size, font, curText);
      y -= size * 1.32;
    }
    if (para.length === 0) y -= size * 0.8;
  }
}

function heading(title) {
  ensure(30);
  y -= 4;
  draw(10.5, "F2", title.toUpperCase());
  cur().rules.push([ML, y - 3, W - 54, y - 3]);
  y -= 17;
}

function line(font, size, label, value) {
  flow(size, font, `${label}: ${value}`);
}

/* ---- assemble content ---- */

draw(21, "F2", p.name);
y -= 23;
draw(11.5, "F1", ascii(p.role));
y -= 16;
draw(8.5, "F1", [p.email, p.phone, p.location, p.socials?.github ?? ""].filter(Boolean).join("   |   "));
y -= 18;

heading("Profile");
flow(9.5, "F1", (p.about ?? []).join(" "));
y -= 6;

heading("Education");
for (const b of p.badges ?? []) line("F1", 9.5, "-", b);
y -= 4;

heading("Skills");
for (const [cat, items] of Object.entries(p.tech ?? {})) {
  line("F1", 9.5, cat[0].toUpperCase() + cat.slice(1), items.join(", "));
}
y -= 2;

heading("Projects");
const projects = (raw.projects ?? [])
  .slice()
  .sort((a, b) => yearOf(String(b.year)) - yearOf(String(a.year)))
  .filter((pr) => pr.title);
for (const proj of projects) {
  line("F1", 9.5, "-", `${proj.title} (${proj.year}) ${proj.tagline ? `- ${proj.tagline}` : ""}`.trim());
}
y -= 2;

heading("Achievements");
const POSITION_APPEND_SKIP = new Set([
  "Suraksha360",
  "Participant",
  "Multiple projects",
  "Suraksha Ghar - Community Partner & Core Organizer",
]);
const statusResults = new Set(["Shipped", "v2 planned", "Market-launched"]);
for (const a of (raw.achievements ?? []).filter((x) => !statusResults.has(x.result))) {
  const place = a.result || "";
  const event = a.event || a.title || "Award";
  let parts = `${place} - ${event} (${a.year})`;
  if (a.title && a.title !== event && !POSITION_APPEND_SKIP.has(a.title)) parts += ` - ${a.title}`;
  line("F1", 9.5, "-", parts);
}
y -= 2;

heading("Principles & Extras");
for (const pr of (p.principles ?? []).slice(0, 3)) line("F1", 9.5, "-", `${pr.title} - ${pr.note}`);
for (const f of (p.fun_facts ?? []).slice(0, 2)) line("F1", 9.5, "-", f);

/* ---- serialize ---- */

const fontObjs = [
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
];
const contentObjs = pages.map((pg) => {
  const stream = [];
  for (const l of pg.lines) stream.push(`BT /${l.font} ${l.size} Tf ${l.x.toFixed(1)} ${l.y.toFixed(1)} Td (${l.text}) Tj ET`);
  for (const [x1, y1, x2, y2] of pg.rules) stream.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  const content = deflateSync(Buffer.from(stream.join("\n") + "\n"));
  return `<< /Length ${content.length} /Filter /FlateDecode >>\nstream\n${content.toString("binary")}\nendstream`;
});
const n = pages.length;
const font1 = 3 + n;
const font2 = font1 + 1;
const contentStart = font2 + 1;

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  `<< /Type /Pages /Kids [${pages.map((_, i) => `${i + 3} 0 R`).join(" ")}] /Count ${n} >>`,
  ...pages.map((_, i) => {
    const contentRef = contentStart + i;
    return `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${contentRef} 0 R >>`;
  }),
  ...fontObjs,
  ...contentObjs,
];

let pdf = "%PDF-1.4\n";
const offsets = [];
for (let i = 0; i < objects.length; i++) {
  offsets.push(pdf.length);
  pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
}
const xref = pdf.length;
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

/* ---- self-check: every xref offset must point at "N 0 obj" ---- */

let bad = 0;
for (let i = 0; i < offsets.length; i++) {
  const at = pdf.indexOf(`${i + 1} 0 obj`, offsets[i]);
  if (at !== offsets[i]) bad++;
}
if (bad > 0) throw new Error(`xref self-check failed: ${bad} bad offset(s)`);
if (!pdf.includes("%%EOF")) throw new Error("missing %%EOF");
const pageCount = (pdf.match(/\/Type \/Page[^s]/g) || []).length;
if (pageCount !== n) throw new Error(`expected ${n} pages, got ${pageCount}`);

mkdirSync(path.join(root, "public"), { recursive: true });
writeFileSync(path.join(root, "public", "resume.pdf"), Buffer.from(pdf, "binary"));
console.log(`wrote public/resume.pdf (${Buffer.byteLength(pdf, "binary")} bytes, ${n} page(s), ${pages.reduce((a, s) => a + s.lines.length, 0)} text ops, self-check passed)`);