import type { Project } from "../../types";
import { DIAGRAMS } from "../../lib/diagrams";

/** What a visitor would notice is missing on this project's page. */
export function missingInfo(p: Project): string[] {
  const out: string[] = [];
  if (!p.tagline?.trim()) out.push("tagline");
  if (!p.description?.trim()) out.push("description");
  if (!p.started?.trim()) out.push("start date");
  if (!(p.highlights ?? []).some((h) => h.trim())) out.push("highlights");
  if (!(p.images ?? []).length && !DIAGRAMS[p.id] && !p.diagram) out.push("image or diagram");
  if (!(p.tech ?? []).length) out.push("tech");
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
