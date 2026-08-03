import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Renders public/images/favicon.svg -> public/favicon.ico (embedded PNGs at 48/32/16px).
// favicon.svg is the simplified favicon version of logo.svg — update both when the logo changes.
// ponytail: subset SVG parser (rect / path M-L / circle, solid fills). Add a real renderer if favicon.svg ever grows gradients or filters.

const SS = 8;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "public", "images", "favicon.svg"), "utf8");

function parseAttrs(tag) {
  const attrs = {};
  for (const m of tag.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
}

const hexToRgb = (hex) =>
  hex.startsWith("#")
    ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    : [0, 0, 0];

function parseD(d) {
  const segs = [];
  let cur = null;
  for (const cmd of d.trim().match(/[ML][\d\s,.-]*/g)) {
    const nums = (cmd.slice(1).match(/-?\d*\.?\d+/g) || []).map(Number);
    if (cmd[0] === "M") cur = [nums[0], nums[1]];
    else for (let i = 0; i + 1 < nums.length; i += 2) {
      const next = [nums[i], nums[i + 1]];
      segs.push([cur, next]);
      cur = next;
    }
  }
  return segs;
}

let vb = [64, 64];
const shapes = [];

const group = parseAttrs([...src.matchAll(/<g\b([^>]*)>/g)].map((m) => m[1]).join(" "));
const vbMatch = src.match(/<svg\b([^>]*)>/);
if (vbMatch) {
  const sva = parseAttrs(vbMatch[1]);
  if (sva.viewBox) vb = sva.viewBox.trim().split(/\s+/).slice(2).map(Number);
}

for (const el of src.matchAll(/<(rect|path|circle)\b([^>]*?)\/?>/g)) {
  const [, tag, raw] = el;
  const a = { ...group, ...parseAttrs(raw) };
  if (a.fill === "none" && (a.stroke === "none" || !a.stroke)) continue;
  if (tag === "rect") {
    shapes.push({ type: "rect", x: +a.x || 0, y: +a.y || 0, w: +a.width, h: +a.height, rx: +a.rx || 0, color: hexToRgb(a.fill), opacity: a.opacity ? +a.opacity : 1 });
  } else if (tag === "circle") {
    shapes.push({ type: "circle", cx: +a.cx, cy: +a.cy, r: +a.r, color: hexToRgb(a.fill), opacity: a.opacity ? +a.opacity : 1 });
  } else if (tag === "path") {
    const cap = a["stroke-linecap"] || "round";
    for (const [p0, p1] of parseD(a.d)) {
      shapes.push({ type: "seg", p0, p1, w: +a["stroke-width"] || 1, cap, color: hexToRgb(a.stroke), opacity: a.opacity ? +a.opacity : 1 });
    }
  }
}

const [W, H] = vb;
const BW = Math.round(W * SS), BH = Math.round(H * SS);
const buf = Buffer.alloc(BW * BH * 4);

function set(x, y, color, opacity) {
  const i = (y * BW + x) * 4;
  const a = opacity * 255, na = 255 - a;
  buf[i] = (color[0] * a + buf[i] * na) / 255;
  buf[i + 1] = (color[1] * a + buf[i + 1] * na) / 255;
  buf[i + 2] = (color[2] * a + buf[i + 2] * na) / 255;
  buf[i + 3] = Math.max(buf[i + 3], a);
}

function insideRoundRect(x, y, r) {
  if (r.r === 0) return x >= 0 && x <= r.w && y >= 0 && y <= r.h;
  const dx = Math.max(r.x - x, 0, x - (r.w - r.x));
  const dy = Math.max(r.y - y, 0, y - (r.h - r.y));
  return dx * dx + dy * dy <= r.r * r.r;
}

function pointInSeg(p, s) {
  const [ax, ay] = s.p0, [bx, by] = s.p1, [px, py] = p;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const qx = ax + t * dx, qy = ay + t * dy;
  const dist = Math.hypot(px - qx, py - qy);
  if (s.cap === "round") return dist <= s.w / 2;
  const hx = dx / Math.hypot(dx, dy), hy = dy / Math.hypot(dx, dy);
  const tx = px - ax, ty = py - ay;
  const along = tx * hx + ty * hy;
  const perp = Math.abs(tx * -hy + ty * hx);
  return along >= -s.w / 2 && along <= len2 / Math.hypot(dx, dy) + s.w / 2 && perp <= s.w / 2;
}

for (let y = 0; y < BH; y++) {
  for (let x = 0; x < BW; x++) {
    const px = (x + 0.5) / SS, py = (y + 0.5) / SS;
    for (const s of shapes) {
      if (s.type === "rect" && insideRoundRect(px, py, s)) set(x, y, s.color, s.opacity);
      else if (s.type === "circle" && (px - s.cx) ** 2 + (py - s.cy) ** 2 <= s.r * s.r) set(x, y, s.color, s.opacity);
      else if (s.type === "seg" && pointInSeg([px, py], s)) set(x, y, s.color, s.opacity);
    }
  }
}

function downsample(dst) {
  const f = BW / dst;
  const out = Buffer.alloc(dst * dst * 4);
  for (let y = 0; y < dst; y++) {
    for (let x = 0; x < dst; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < f; sy++) for (let sx = 0; sx < f; sx++) {
        const i = ((y * f + sy) * BW + (x * f + sx)) * 4;
        r += buf[i] * buf[i + 3]; g += buf[i + 1] * buf[i + 3];
        b += buf[i + 2] * buf[i + 3]; a += buf[i + 3];
      }
      const o = (y * dst + x) * 4;
      if (a) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; out[o + 3] = a / (f * f); }
    }
  }
  return out;
}

const TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; TABLE[n] = c; }
const crc32 = (b) => { let c = -1; for (const byte of b) c = TABLE[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(rgba, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const pngs = [48, 32, 16].map((s) => [s, encodePNG(downsample(s), s)]);
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
const entries = [];
let offset = 6 + 16 * pngs.length;
for (const [size, data] of pngs) {
  const e = Buffer.alloc(16);
  e[0] = size; e[1] = size; e[2] = 0; e[3] = 0;
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12);
  offset += data.length;
  entries.push(e);
}
const out = path.join(ROOT, "public", "favicon.ico");
fs.writeFileSync(out, Buffer.concat([header, ...entries, ...pngs.map(([, d]) => d)]));
console.log("wrote", path.relative(ROOT, out));
