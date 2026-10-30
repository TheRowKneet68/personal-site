import type { Project } from "../../types";
import { DIAGRAMS } from "../../lib/diagrams";

/** Gaps a visitor would actually notice. Nice-to-haves (dates, highlights,
    parts) are left out so the list stays short enough to act on. */
export function missingInfo(p: Project): string[] {
  const out: string[] = [];
  if (!p.tagline?.trim()) out.push("summary");
  if (!p.description?.trim()) out.push("story");
  if (!(p.images ?? []).length && !DIAGRAMS[p.id] && !p.diagram) out.push("photo or diagram");
  if (p.featured && !(p.caseStudy?.problem?.length || p.caseStudy?.solution?.length)) out.push("case study");
  return out;
}

export const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

export function projectErrors(projects: Project[]): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const p of projects) {
    const label = p.title?.trim() || "An untitled project";
    if (!p.id?.trim()) errs.push(`${label} needs an ID.`);
    else if (!ID_RE.test(p.id)) errs.push(`${label}: the ID can only use lowercase letters, numbers and dashes.`);
    else if (seen.has(p.id)) errs.push(`Two projects share the ID "${p.id}".`);
    seen.add(p.id);
    if (!p.title?.trim()) errs.push(`Project "${p.id}" needs a title.`);
  }
  return errs;
}
