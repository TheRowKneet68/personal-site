/* Chart data derived from the CMS. Counts only - nothing typed in by hand. */
import type { Project } from "../types";
import { clean } from "./portfolio";

export interface Field {
  key: string;
  label: string;
  /** CSS var of the validated chart slot (index.css --ch-*). */
  color: string;
}

// Slot order is the validated adjacency order (cyan, yellow, magenta, blue, green).
// ponytail: keyword rules over free-text categories; first match wins, unknown
// categories fold into "Other". Add a rule when a new kind of category appears.
export const FIELDS: (Field & { test: RegExp })[] = [
  { key: "embedded", label: "Embedded & IoT", color: "var(--ch-1)", test: /iot|hardware|electron|embedded|automotive/i },
  { key: "software", label: "Software & web", color: "var(--ch-2)", test: /web|software|tool|app/i },
  { key: "robotics", label: "Robotics & vision", color: "var(--ch-3)", test: /robot|vision/i },
  { key: "ai", label: "AI & health", color: "var(--ch-4)", test: /\bai\b|health|ml/i },
  { key: "security", label: "Security", color: "var(--ch-5)", test: /security/i },
];
export const OTHER: Field = { key: "other", label: "Other", color: "var(--ch-other)" };
export const ALL_FIELDS: Field[] = [...FIELDS, OTHER];

export function fieldOf(category: string): Field {
  const c = clean(category);
  return FIELDS.find((f) => f.test.test(c)) ?? OTHER;
}

/** The field set in /admin, else a guess from the free-text category. */
export function fieldOfProject(p: Pick<Project, "field" | "category">): Field {
  return ALL_FIELDS.find((f) => f.key === p.field) ?? fieldOf(p.category);
}

export interface YearRow {
  year: number;
  total: number;
  counts: Record<string, number>;
}

/** Projects per year, split by field, every year in range present (gaps = 0). */
export function projectsByYear(projects: Project[]): YearRow[] {
  const map = new Map<number, YearRow>();
  for (const p of projects) {
    const year = Number(/\d{4}/.exec(p.year)?.[0]);
    if (!year) continue;
    const row = map.get(year) ?? { year, total: 0, counts: {} };
    const f = fieldOfProject(p).key;
    row.counts[f] = (row.counts[f] ?? 0) + 1;
    row.total += 1;
    map.set(year, row);
  }
  if (map.size === 0) return [];
  const years = [...map.keys()];
  const rows: YearRow[] = [];
  for (let y = Math.min(...years); y <= Math.max(...years); y++) rows.push(map.get(y) ?? { year: y, total: 0, counts: {} });
  return rows;
}

/** All-time count per field, in slot order, empty fields dropped. */
export function fieldTotals(projects: Project[]): { field: Field; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of projects) {
    const k = fieldOfProject(p).key;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return ALL_FIELDS.map((field) => ({ field, count: counts.get(field.key) ?? 0 })).filter((x) => x.count > 0);
}

/** "39+" -> {num: 39, suffix: "+"}; "3rd DAN" / "∞" -> no count, shown as-is. */
export function parseStat(value: string): { num: number | null; suffix: string } {
  const m = /^(\d+)(\+?)$/.exec(value.trim());
  return m ? { num: Number(m[1]), suffix: m[2] ?? "" } : { num: null, suffix: value };
}

/** "Clean" axis maximum and tick step for a count axis. */
export function niceScale(max: number, ticks = 4): { max: number; step: number } {
  if (max <= 0) return { max: 1, step: 1 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return { max: Math.ceil(max / step) * step, step };
}
