/* Site colours from the admin: one accent + an optional background tint.
   Everything is derived in OKLCH so both modes stay readable: each token keeps
   the chosen hue and chroma and only its lightness moves until it meets its
   contrast target. No saved colours = the built-in green in index.css. */

export interface SiteColors {
  /** #rrggbb */
  accent: string;
  /** #rrggbb; only its hue is used */
  tint?: string;
  /** 0-100, how strongly the backgrounds take the tint's hue */
  tintAmount?: number;
}

type Rgb = [number, number, number]; // 0-1 sRGB
type Lch = [number, number, number]; // L 0-1, C, H degrees

const HEX = /^#[0-9a-f]{6}$/i;
export const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

const hexToRgb = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb;
const rgbToHex = (c: Rgb): string =>
  `#${c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("")}`;

const toLin = (v: number): number => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGam = (v: number): number => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function rgbToLch([r, g, b]: Rgb): Lch {
  const [lr, lg, lb] = [toLin(r), toLin(g), toLin(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360];
}

function lchToRgbRaw([L, C, H]: Lch): Rgb {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toGam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** Into sRGB, giving up chroma (never hue or lightness) when out of gamut. */
function lchToHex([L, C, H]: Lch): string {
  let c = C;
  for (let i = 0; i < 24; i++) {
    const rgb = lchToRgbRaw([L, c, H]);
    if (rgb.every((v) => v >= -0.001 && v <= 1.001)) return rgbToHex(rgb);
    c *= 0.9;
  }
  return rgbToHex(lchToRgbRaw([L, 0, H]));
}

const luminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map(toLin) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string): number => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
};

/** Move only lightness (towards `dir`) until the colour reaches `ratio` against `on`. */
function reach(lch: Lch, on: string, ratio: number, dir: "lighter" | "darker"): string {
  let hex = lchToHex(lch);
  for (let L = lch[0]; contrast(hex, on) < ratio && L >= 0 && L <= 1; L += dir === "lighter" ? 0.01 : -0.01) {
    hex = lchToHex([L, lch[1], lch[2]]);
  }
  return hex;
}

const alpha = (hex: string, a: number): string => {
  const [r, g, b] = hexToRgb(hex).map((v) => Math.round(v * 255));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export type Tokens = Record<string, string>;

/** Token overrides for both modes. Contrast targets match the built-in palette. */
export function deriveTokens(c: SiteColors): { dark: Tokens; light: Tokens } {
  const acc = rgbToLch(hexToRgb(c.accent));
  const amount = Math.min(100, Math.max(0, c.tintAmount ?? 0)) / 100;
  const tintHue = c.tint && isHex(c.tint) ? rgbToLch(hexToRgb(c.tint))[2] : acc[2];
  const tc = 0.035 * amount; // a background tint, never a colour wash
  const bgTone = (L: number): string => lchToHex([L, tc, tintHue]);
  const inkTone = (L: number): string => lchToHex([L, tc * 0.25, tintHue]);

  const dark: Tokens = {
    "--rk-bg": bgTone(0.215),
    "--rk-surface": bgTone(0.24),
    "--rk-raised": bgTone(0.27),
    "--rk-border": bgTone(0.315),
    "--rk-border-strong": bgTone(0.375),
    "--rk-ink": inkTone(0.965),
    "--rk-ink-dim": inkTone(0.83),
    "--rk-ink-faint": inkTone(0.72),
  };
  const light: Tokens = {
    "--rk-bg": bgTone(0.985),
    "--rk-surface": bgTone(0.993),
    "--rk-raised": bgTone(0.962),
    "--rk-border": bgTone(0.895),
    "--rk-border-strong": bgTone(0.835),
    "--rk-ink": inkTone(0.2),
    "--rk-ink-dim": inkTone(0.42),
    "--rk-ink-faint": inkTone(0.52),
  };

  // dark: accent marks >= 4.5 on the page, accent text >= 7 on cards, buttons hold white text at 4.5
  const dAccent = reach(acc, dark["--rk-bg"]!, 4.5, "lighter");
  const dInk = reach(rgbToLch(hexToRgb(dAccent)), dark["--rk-surface"]!, 7, "lighter");
  const fill = reach(acc, "#ffffff", 4.5, "darker");
  Object.assign(dark, {
    "--rk-accent": dAccent,
    "--rk-accent-ink": dInk,
    "--rk-accent-fill": fill,
    "--rk-on-accent": "#ffffff",
    "--rk-accent-soft": alpha(dAccent, 0.14),
    "--rk-signal": dAccent,
    "--ch-1": reach(acc, dark["--rk-surface"]!, 3, "lighter"),
  });
  // light: the accent is used as text, so it must hold 4.5 on the page; ink goes further
  const lAccent = reach(acc, light["--rk-bg"]!, 4.5, "darker");
  Object.assign(light, {
    "--rk-accent": lAccent,
    "--rk-accent-ink": reach(rgbToLch(hexToRgb(lAccent)), light["--rk-surface"]!, 7, "darker"),
    "--rk-accent-fill": fill,
    "--rk-on-accent": "#ffffff",
    "--rk-accent-soft": alpha(lAccent, 0.1),
    "--rk-signal": lAccent,
    "--ch-1": reach(acc, light["--rk-surface"]!, 3, "darker"),
  });
  return { dark, light };
}

const block = (sel: string, t: Tokens): string => `${sel}{${Object.entries(t).map(([k, v]) => `${k}:${v}`).join(";")}}`;

/** CSS that overrides the built-in palette; html:root beats index.css's :root. */
export function colorsCss(c: SiteColors): string {
  const { dark, light } = deriveTokens(c);
  return block("html:root", dark) + block("html:root.light", light);
}

/** Whether the accent had to be moved to stay readable, per mode. */
export function adjustedNote(c: SiteColors): string | null {
  const { dark, light } = deriveTokens(c);
  const moved = (["dark", "light"] as const).filter((m) => (m === "dark" ? dark : light)["--rk-accent"]!.toLowerCase() !== c.accent.toLowerCase());
  return moved.length ? `Adjusted for readable text in ${moved.join(" and ")} mode.` : null;
}

const CACHE = "rk-colors";
const STYLE_ID = "rk-colors";

/** Apply saved colours (or the built-in ones for null) and remember them for the next visit's first paint. */
export function applyColors(c: SiteColors | null | undefined): void {
  const css = c && isHex(c.accent) ? colorsCss(c) : "";
  let el = document.getElementById(STYLE_ID);
  if (css) {
    if (!el) {
      el = Object.assign(document.createElement("style"), { id: STYLE_ID });
      document.head.append(el);
    }
    el.textContent = css;
  } else {
    el?.remove();
  }
  try {
    if (css) localStorage.setItem(CACHE, css);
    else localStorage.removeItem(CACHE);
  } catch {
    /* private mode: colours still apply, just not cached */
  }
}
