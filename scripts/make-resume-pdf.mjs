/* Generate public/resume.pdf from data.json with zero dependencies.
   Run: node scripts/make-resume-pdf.mjs
   ponytail: hand-rolled single-page PDF (letter, Helvetica) — a real,
   text-searchable, printable resume with no pdf/puppeteer dependency.
   If the resume ever needs multiple pages or rich design, swap in a real
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

const ascii = (s) =>
  String(s)
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "");

const charW = (ch, size) => (ch === " " ? 0.28 : 0.5) * size;
const widthOf = (s, size) => [...s].reduce((a, c) => a + charW(c, size), 0);

const lines = [];
const rules = [];
let y = H - 62;

function draw(size, font, str) {
  lines.push({ x: ML, y, font, size, text: ascii(str) });
}

function flow(size, font, str, indent = 0) {
  let count = 0;
  for (const para of ascii(str).split("\n")) {
    let cur = "";
    for (const word of para.split(/\s+/)) {
      const test = cur ? `${cur} ${word}` : word;
      if (indent + widthOf(test, size) > USABLE && cur) {
        draw(size, font, cur);
        y -= size * 1.32;
        count++;
        cur = word;
      } else {
        cur = test;
      }
    }
    if (cur) {
      draw(size, font, cur);
      y -= size * 1.32;
      count++;
    }
    if (para.length === 0) {
      y -= size * 0.8;
      count++;
    }
  }
  return count;
}

function heading(title) {
  y -= 4;
  draw(10.5, "F2", title.toUpperCase());
  rules.push([ML, y + 3, W - 54, y + 3]);
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

heading("Selected Projects");
for (const proj of raw.projects.filter((pr) => pr.featured)) {
  flow(9.5, "F2", `${proj.title} (${proj.year}) — ${proj.tagline}`);
}
y -= 2;

heading("Achievements");
for (const a of (raw.achievements ?? []).slice(0, 6)) {
  flow(9.5, "F1", `${a.result} — ${a.event} (${a.year}): ${a.title}`, 0);
}

heading("Principles & Extras");
for (const pr of (p.principles ?? []).slice(0, 3)) line("F1", 9.5, "-", `${pr.title} — ${pr.note}`);
for (const f of (p.fun_facts ?? []).slice(0, 2)) line("F1", 9.5, "-", f);

if (y < BOTTOM) {
  // ponytail: single-page resume — content is tuned to fit. If this fires,
  // trim copy in data.json or swap to a real PDF lib (see header note).
  console.warn(`content overflows one page (reached y=${y.toFixed(1)}, limit ${BOTTOM})`);
}

/* ---- serialize ---- */

const stream = [];
for (const l of lines) stream.push(`BT /${l.font} ${l.size} Tf ${l.x.toFixed(1)} ${l.y.toFixed(1)} Td (${l.text}) Tj ET`);
for (const [x1, y1, x2, y2] of rules) stream.push(`${x1} ${y1} m ${x2} ${y2} l S`);

const content = deflateSync(Buffer.from(stream.join("\n") + "\n"));
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  `<< /Length ${content.length} /Filter /FlateDecode >>\nstream\n${content.toString("binary")}\nendstream`,
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
if (pageCount !== 1) throw new Error(`expected 1 page, got ${pageCount}`);

mkdirSync(path.join(root, "public"), { recursive: true });
writeFileSync(path.join(root, "public", "resume.pdf"), Buffer.from(pdf, "binary"));
console.log(`wrote public/resume.pdf (${Buffer.byteLength(pdf, "binary")} bytes, 1 page, ${lines.length} text ops, self-check passed)`);
