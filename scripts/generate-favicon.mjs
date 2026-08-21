import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Generates public/favicon.ico + public/images/apple-touch-icon.png from the
// current brand logo, so the favicon always matches the logo.
// The logo is fetched from FAVICON_LOGO_URL (or the fallback URL below) at build
// time and cached to public/images/logo.png. Update the URL here when the logo
// file changes; the env var overrides it. If the fetch fails, the cached copy is used.
// ponytail: hand-rolled PNG decoder (zlib inflate + filters), 8/16-bit, color types
// 0/2/3/4/6. Plenty for a favicon; swap in a real image lib if logos grow exotic.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOGO_URL =
  process.env.FAVICON_LOGO_URL ||
  "https://csmfpzbyzqqsnwffzjqg.supabase.co/storage/v1/object/public/images/Ronit-Logo-With-Background-Color.png";
const LOCAL_LOGO = path.join(ROOT, "public", "images", "logo.png");

let png;
try {
  const res = await fetch(LOGO_URL, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  png = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(LOCAL_LOGO, png);
  console.log("favicon: fetched logo from URL");
} catch (err) {
  png = fs.readFileSync(LOCAL_LOGO);
  console.log(`favicon: fetch failed (${err.message}), using ${path.relative(ROOT, LOCAL_LOGO)}`);
}

function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let pos = 8;
  let w = 0, h = 0, depth = 8, ctype = 0;
  let palette = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      depth = data[8];
      ctype = data[9];
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (!w || !h) throw new Error("missing IHDR");
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  const bytesPerPx = channels * (depth === 16 ? 2 : 1);
  const stride = w * bytesPerPx;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const recon = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const rowStart = y * stride;
    for (let x = 0; x < stride; x++) {
      const b = raw[y * (stride + 1) + 1 + x];
      const left = x >= bytesPerPx ? recon[rowStart + x - bytesPerPx] : 0;
      const up = y > 0 ? recon[rowStart - stride + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPx ? recon[rowStart - stride + x - bytesPerPx] : 0;
      let v;
      if (filter === 0) v = b;
      else if (filter === 1) v = b + left;
      else if (filter === 2) v = b + up;
      else if (filter === 3) v = b + ((left + up) >> 1);
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
        v = b + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
      } else throw new Error(`bad filter ${filter}`);
      recon[rowStart + x] = v & 0xff;
    }
  }
  const rgba = Buffer.alloc(w * h * 4);
  const sample = (si, n) => (depth === 16 ? recon[si + n * 2] : recon[si + n]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = y * stride + x * bytesPerPx;
      const di = (y * w + x) * 4;
      if (ctype === 0) {
        const g = sample(si, 0);
        rgba[di] = rgba[di + 1] = rgba[di + 2] = g;
        rgba[di + 3] = trns && sample(si, 0) === trns[0] ? 0 : 255;
      } else if (ctype === 2) {
        rgba[di] = sample(si, 0); rgba[di + 1] = sample(si, 1); rgba[di + 2] = sample(si, 2);
        rgba[di + 3] = 255;
      } else if (ctype === 3) {
        const idx = recon[si];
        rgba[di] = palette[idx * 3]; rgba[di + 1] = palette[idx * 3 + 1]; rgba[di + 2] = palette[idx * 3 + 2];
        rgba[di + 3] = trns && trns.length > idx ? trns[idx] : 255;
      } else if (ctype === 4) {
        const g = sample(si, 0);
        rgba[di] = rgba[di + 1] = rgba[di + 2] = g;
        rgba[di + 3] = sample(si, 1);
      } else {
        rgba[di] = sample(si, 0); rgba[di + 1] = sample(si, 1); rgba[di + 2] = sample(si, 2); rgba[di + 3] = sample(si, 3);
      }
    }
  }
  return { w, h, rgba };
}

/** Area-weighted box downsample with premultiplied alpha (no dark fringe). */
function downsample({ w, h: _h, rgba }, dst) {
  const out = Buffer.alloc(dst * dst * 4);
  const scale = w / dst;
  for (let y = 0; y < dst; y++) {
    const y0 = y * scale, y1 = (y + 1) * scale;
    for (let x = 0; x < dst; x++) {
      const x0 = x * scale, x1 = (x + 1) * scale;
      let pr = 0, pg = 0, pb = 0, pa = 0;
      for (let sy = Math.floor(y0); sy < y1; sy++) {
        const cy = Math.min(sy + 1, y1) - Math.max(sy, y0);
        for (let sx = Math.floor(x0); sx < x1; sx++) {
          const cx = Math.min(sx + 1, x1) - Math.max(sx, x0);
          const i = (sy * w + sx) * 4;
          const a = rgba[i + 3];
          const wgt = cx * cy;
          pr += rgba[i] * a * wgt;
          pg += rgba[i + 1] * a * wgt;
          pb += rgba[i + 2] * a * wgt;
          pa += a * wgt;
        }
      }
      const o = (y * dst + x) * 4;
      if (pa) { out[o] = Math.round(pr / pa); out[o + 1] = Math.round(pg / pa); out[o + 2] = Math.round(pb / pa); }
      out[o + 3] = Math.round(pa / (scale * scale));
    }
  }
  return out;
}

const img = decodePNG(png);

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

const apple = downsample(img, 180);
fs.writeFileSync(path.join(ROOT, "public", "images", "apple-touch-icon.png"), encodePNG(apple, 180));

// PWA manifest icons (referenced by vite.config.ts -> VitePWA manifest).
for (const size of [192, 512]) {
  fs.writeFileSync(
    path.join(ROOT, "public", "images", `icon-${size}.png`),
    encodePNG(downsample(img, size), size),
  );
}

const pngs = [48, 32, 16].map((s) => [s, encodePNG(downsample(img, s), s)]);
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
console.log("favicon: wrote", path.relative(ROOT, out), `(${img.w}x${img.h} logo)`);
