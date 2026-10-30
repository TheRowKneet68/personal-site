/* Resume PDF built from live content on each request, so it always matches the
   site. A4, at most two pages: the "more projects" list shrinks until it fits.
   ponytail: hand-rolled PDF with the two built-in Helvetica faces and estimated
   glyph widths - no PDF library. Swap one in if the layout ever needs real
   typography (custom fonts, kerning, images). */
import { deflateSync } from "node:zlib";
import { isPlacement, type AchievementRecord, type Content, type ProjectRecord } from "./content.js";

const W = 595.28;
const H = 841.89;
const ML = 50;
const MR = 50;
const USABLE = W - ML - MR;
const TOP = H - 54;
const BOTTOM = 46;
const MAX_PAGES = 2;
const SITE = "ronitbaniyagupta.com.np";

// PDF fill colours: the site's light-mode ink, secondary text and green accent
const INK = "0.086 0.086 0.086";
const DIM = "0.282 0.282 0.282";
const ACCENT = "0.153 0.408 0.11";

type Font = "F1" | "F2";
interface Op { x: number; y: number; font: Font; size: number; color: string; text: string }
interface Page { ops: Op[]; rules: [number, number, number, number][] }

/** Built-in fonts only cover Latin-1; map the common typographic characters, drop the rest. */
const ascii = (s: unknown): string =>
  String(s ?? "")
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•·]/g, "-")
    .replace(/₀|₁|₂|₃|₄|₅|₆|₇|₈|₉/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const pdfStr = (s: string): string => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
// Helvetica / Helvetica-Bold advance widths (1/1000 em) for ASCII 32-126, from the standard AFM files
const AFM: Record<Font, number[]> = {
  F1: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584],
  F2: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584],
};
const widthOf = (s: string, size: number, font: Font): number =>
  ([...s].reduce((a, c) => a + (AFM[font][c.charCodeAt(0) - 32] ?? 556), 0) * size) / 1000;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const month = (v?: string): string => {
  const m = /^(\d{4})-(\d{2})/.exec(v ?? "");
  return m ? `${MONTHS[Number(m[2]) - 1] ?? ""} ${m[1]}` : (v ?? "");
};
type Dated = ProjectRecord;
const when = (p: Dated): string =>
  p.started && p.finished
    ? p.started === p.finished ? month(p.started) : `${month(p.started)} - ${month(p.finished)}`
    : p.started ? `Since ${month(p.started)}` : p.year;
const sortKey = (p: Dated): string => p.started || p.year || "";
const achDate = (a: AchievementRecord): string => (a.date ? month(a.date.slice(0, 7)) : a.year);
const firstSentence = (s: string): string => {
  const t = ascii(s);
  const m = /^(.{40,220}?[.!?])\s/.exec(t + " ");
  return m ? m[1]! : t.slice(0, 200);
};
const domain = (url?: string): string => ascii(url).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

class Doc {
  pages: Page[] = [];
  y = TOP;
  constructor() {
    this.newPage();
  }
  private get page(): Page {
    return this.pages[this.pages.length - 1]!;
  }
  newPage(): void {
    this.pages.push({ ops: [], rules: [] });
    this.y = TOP;
  }
  ensure(h: number): void {
    if (this.y - h < BOTTOM) this.newPage();
  }
  /** One line made of runs in different fonts/colours. */
  runs(size: number, parts: [Font, string, string][], gap = 1.36): void {
    this.ensure(size * gap);
    let x = ML;
    for (const [font, color, text] of parts) {
      let t = ascii(text);
      const room = ML + USABLE - x;
      if (!t || room <= 0) continue;
      if (widthOf(t, size, font) > room) {
        // one-line rows never wrap: cut the tail instead of running off the page
        while (t && widthOf(`${t}...`, size, font) > room) t = t.slice(0, -1);
        t = `${t.trimEnd()}...`;
      }
      this.page.ops.push({ x, y: this.y, font, size, color, text: t });
      x += widthOf(t + " ", size, font);
    }
    this.y -= size * gap;
  }
  /** Wrapped paragraph. */
  para(size: number, text: string, font: Font = "F1", color = INK, indent = 0): void {
    let line = "";
    const flush = () => {
      this.ensure(size * 1.36);
      this.page.ops.push({ x: ML + indent, y: this.y, font, size, color, text: line });
      this.y -= size * 1.36;
    };
    for (const word of ascii(text).split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (line && indent + widthOf(test, size, font) > USABLE) {
        flush();
        line = word;
      } else line = test;
    }
    if (line) flush();
  }
  heading(title: string): void {
    this.ensure(34);
    this.y -= 7;
    this.page.ops.push({ x: ML, y: this.y, font: "F2", size: 10, color: ACCENT, text: ascii(title).toUpperCase() });
    this.page.rules.push([ML, this.y - 4, W - MR, this.y - 4]);
    this.y -= 17;
  }
  gap(h: number): void {
    this.y -= h;
  }
}

function layout(c: Content, moreCount: number): Doc {
  const p = c.profile as Content["profile"] & { about?: string[] };
  const d = new Doc();
  const github = p.socials?.github;
  const linkedin = p.socials?.linkedin;

  d.runs(22, [["F2", INK, p.name]], 1.2);
  d.runs(11, [["F1", DIM, [p.role, p.location].filter(Boolean).join(", ")]], 1.5);
  d.para(8.6, [p.email, p.phone, SITE, domain(github), domain(linkedin)].filter(Boolean).join("   |   "), "F1", DIM);

  const about = (p.about ?? []).find((x) => ascii(x).length > 40);
  if (about) {
    d.heading("Profile");
    d.para(9.4, about);
  }

  const projects = (c.projects as Dated[]).filter((x) => x.title);
  const featured = projects.filter((x) => x.featured);
  const placements = c.achievements.filter(isPlacement);
  d.heading("Selected projects");
  for (const pr of featured) {
    d.ensure(40);
    d.runs(10, [["F2", INK, pr.title], ["F1", DIM, `${when(pr)}  |  ${pr.category}`]], 1.42);
    const tagline = ascii(pr.tagline).replace(/[.!?\s]+$/, "");
    d.para(9, tagline ? `${tagline}. ${firstSentence(pr.description)}` : firstSentence(pr.description));
    const wins = placements.filter((a) => {
      const t = `${a.title} ${a.event}`.toLowerCase();
      return t.includes(pr.title.toLowerCase());
    });
    if (wins.length) d.para(8.6, `Recognition: ${wins.map((a) => `${a.result}, ${a.event.split(/\s+-\s+|\s+—\s+/)[0]}`).join("; ")}`, "F1", ACCENT);
    d.gap(3);
  }

  const more = projects.filter((x) => !x.featured).sort((a, b) => sortKey(b).localeCompare(sortKey(a))).slice(0, moreCount);
  if (more.length) {
    d.heading("More recent projects");
    for (const pr of more) d.runs(9, [["F2", INK, pr.title], ["F1", DIM, `(${pr.year})`], ["F1", INK, pr.tagline ? `- ${pr.tagline}` : ""]]);
  }
  d.gap(2);
  d.para(8.8, `${projects.length} projects in total, with case studies and photos, at ${SITE}`, "F1", DIM);

  if (placements.length) {
    d.heading("Awards");
    const rankOrder = (a: AchievementRecord) => {
      const s = a.result.toLowerCase();
      return /1st|first (place|position)|winner/.test(s) ? 1 : /first runner/.test(s) ? 2 : /second runner/.test(s) ? 3 : /choice/.test(s) ? 4 : 5;
    };
    for (const a of [...placements].sort((x, y) => rankOrder(x) - rankOrder(y) || (y.date ?? y.year).localeCompare(x.date ?? x.year))) {
      d.runs(9, [["F2", INK, a.result], ["F1", INK, `- ${a.event}`], ["F1", DIM, `(${achDate(a)})`]]);
    }
  }

  const roles = c.achievements.filter((a) => !isPlacement(a) && /appointed|partner|organi[sz]er|market|launch/i.test(`${a.result} ${a.title}`));
  if (roles.length) {
    d.heading("Roles and milestones");
    for (const a of roles) d.runs(9, [["F2", INK, a.title === a.result ? a.result : a.title], ["F1", INK, `- ${a.event}`], ["F1", DIM, `(${achDate(a)})`]]);
  }

  const credentials = (p.badges ?? []).filter((b) => !/\d+\+/.test(b));
  if (credentials.length) {
    d.heading("Education and credentials");
    for (const b of credentials) d.para(9, `- ${b}`);
  }

  const tech = Object.entries(p.tech ?? {}).filter(([, items]) => items.length);
  if (tech.length) {
    d.heading("Skills");
    for (const [cat, items] of tech) d.para(9, `${cat.charAt(0).toUpperCase()}${cat.slice(1)}: ${items.join(", ")}`);
  }
  return d;
}

function serialize(doc: Doc, title: string): Buffer {
  const n = doc.pages.length;
  const fontRegular = 3 + n;
  const fontBold = fontRegular + 1;
  const firstContent = fontBold + 1;
  const info = firstContent + n;
  const streams = doc.pages.map((pg, i) => {
    const s: string[] = [];
    for (const o of pg.ops) s.push(`BT ${o.color} rg /${o.font} ${o.size} Tf ${o.x.toFixed(1)} ${o.y.toFixed(1)} Td (${pdfStr(o.text)}) Tj ET`);
    s.push(`${ACCENT} RG 0.6 w`);
    for (const [x1, y1, x2, y2] of pg.rules) s.push(`${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
    s.push(`BT ${DIM} rg /F1 7.5 Tf ${ML} 26 Td (${pdfStr(`${title} - page ${i + 1} of ${n} - ${SITE}`)}) Tj ET`);
    const body = deflateSync(Buffer.from(s.join("\n") + "\n", "latin1"));
    return `<< /Length ${body.length} /Filter /FlateDecode >>\nstream\n${body.toString("latin1")}\nendstream`;
  });
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${doc.pages.map((_, i) => `${i + 3} 0 R`).join(" ")}] /Count ${n} >>`,
    ...doc.pages.map(
      (_, i) =>
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${firstContent + i} 0 R >>`,
    ),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    ...streams,
    `<< /Title (${pdfStr(title)}) /Producer (${SITE}) >>`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

/** Resume for the given content, trimmed to MAX_PAGES. */
export function buildResumePdf(content: Content): { pdf: Buffer; pages: number } {
  let doc = layout(content, 8);
  for (let more = 7; doc.pages.length > MAX_PAGES && more >= 0; more--) doc = layout(content, more);
  return { pdf: serialize(doc, `${ascii(content.profile.name)} - Resume`), pages: doc.pages.length };
}
