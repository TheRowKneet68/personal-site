import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { SectionHead } from "../components/SectionHead";
import { StatusBadge } from "../components/Badges";
import { ProjectVisual } from "../components/ProjectVisual";
import { useMediaQuery } from "../hooks";
import { diagramFor } from "../lib/diagrams";
import { byPlacement, clean, formatDate, hasCaseStudy, hasVisual, isPlacement, placeLabel, placementRank, recognitionFor, shortEvent } from "../lib/portfolio";
import { cn } from "../utils/format";
import { introOf } from "../lib/constants";
import type { Achievement, FeaturedIn, Project } from "../types";


const byOrder = (a: Project, b: Project): number =>
  (a.order ?? 9999) - (b.order ?? 9999) || (a.weight ?? 9999) - (b.weight ?? 9999) || b.year.localeCompare(a.year);

function ProjectSheet({
  project,
  achievements,
  outlets,
  lead,
}: {
  project: Project;
  achievements: Achievement[];
  outlets: FeaturedIn[];
  lead: boolean;
}) {
  const placements = recognitionFor(project, achievements).filter(isPlacement).sort(byPlacement);
  const href = `/projects/${project.id}`;
  const visual = hasVisual(project, outlets);
  const best = placements[0];
  const phone = useMediaQuery("(max-width: 767px)");

  return (
    <article className="grid gap-8 border-t border-line py-12 md:py-16 lg:grid-cols-12 lg:gap-10" aria-labelledby={`p-${project.id}`}>
      <div className={visual ? "lg:col-span-5" : "lg:col-span-8"}>
        <p className="label tabular">
          {project.year}, {clean(project.category)}
        </p>
        <h3 id={`p-${project.id}`} className={cn("font-display mt-3", lead ? "t-h2" : "t-h3")}>
          <Link to={href} className="transition-colors hover:text-accent-ink">
            {project.title}
          </Link>
        </h3>
        <p className="mt-3 text-[1.1rem] font-medium text-ink">{clean(project.tagline)}</p>
        <p className="mt-3 line-clamp-5 max-w-[56ch] text-ink-dim">{clean(project.description)}</p>

        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          <div>
            <dt className="label">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={project.status} />
            </dd>
          </div>
          {best && !lead ? (
            <div>
              <dt className="label">Recognition</dt>
              <dd className="mt-1 text-[0.875rem] text-ink-dim">
                {placeLabel(best)}, {shortEvent(best.event)}
                {placements.length > 1 ? ` and ${placements.length - 1} more` : ""}
              </dd>
            </div>
          ) : null}
        </dl>

        {lead && placements.length > 0 ? (
          <table className="mt-7 w-full text-left text-[0.92rem]">
            <caption className="label mb-2 text-left">Competition results</caption>
            <tbody>
              {placements.map((a) => (
                <tr key={a.id} className="border-t border-line">
                  <th scope="row" className={cn("py-2 pr-4 font-semibold whitespace-nowrap", placementRank(a) === 1 && "text-signal")}>
                    {placeLabel(a)}
                  </th>
                  <td className="py-2 pr-4 text-ink-dim">
                    {shortEvent(a.event)}
                    <span className="block text-[0.82rem] text-ink-faint tabular sm:hidden">{formatDate(a.date || a.year).replace(/^\S+\s/, "")}</span>
                  </td>
                  <td className="py-2 text-right whitespace-nowrap text-ink-faint tabular max-sm:hidden">{formatDate(a.date || a.year).replace(/^\S+\s/, "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <Link to={href} tabIndex={-1} aria-hidden className="link mt-7 inline-block font-semibold text-ink">
          {hasCaseStudy(project) ? "Read the case study" : "Open the project page"}
        </Link>
      </div>

      {visual ? (
        <div className="lg:col-span-7">
          {phone && diagramFor(project) ? (
            // phones: a stacked diagram is ~900px tall, so it opens on tap instead
            <details className="group rounded-[3px] border border-line bg-surface">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                How it works
                <span className="flex items-center gap-2 text-[0.85rem] font-normal text-ink-dim">
                  system diagram
                  <svg viewBox="0 0 12 12" className="size-3 transition-transform group-open:rotate-180" aria-hidden>
                    <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </span>
              </summary>
              <div className="border-t border-line p-3">
                <ProjectVisual project={project} outlets={outlets} compact />
              </div>
            </details>
          ) : (
            <ProjectVisual project={project} outlets={outlets} compact={!lead} />
          )}
        </div>
      ) : null}
    </article>
  );
}

const PREVIEW_ROWS = 12;

function ProjectIndex({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState(false);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects) counts.set(clean(p.category), (counts.get(clean(p.category)) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [projects]);

  const rows = useMemo(
    () =>
      projects
        .filter((p) => filter === "All" || clean(p.category) === filter)
        .sort((a, b) => b.year.localeCompare(a.year) || byOrder(a, b)),
    [projects, filter],
  );
  const visible = expanded || filter !== "All" ? rows : rows.slice(0, PREVIEW_ROWS);

  if (projects.length === 0) return null;

  return (
    <div className="mt-8 border-t border-line pt-14 md:pt-20" id="index">
      <div className="grid gap-4 md:grid-cols-12 md:items-end md:gap-10">
        <h3 className="font-display t-h3 md:col-span-6">Everything else</h3>
        <p className="max-w-[58ch] text-ink-dim md:col-span-6">
          {projects.length} more builds: experiments, tools, coursework and client sites. Each row opens its page.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter projects by category">
        {[["All", projects.length] as const, ...categories].map(([c, n]) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            aria-pressed={filter === c}
            className={cn(
              "cursor-pointer rounded-[3px] border px-3 py-1.5 text-[0.9rem] transition-colors",
              filter === c ? "border-ink bg-ink text-bg" : "border-line text-ink-dim hover:border-line-strong hover:text-ink",
            )}
          >
            {c} <span className={cn("tabular", filter === c ? "opacity-70" : "text-ink-faint")}>{n}</span>
          </button>
        ))}
      </div>

      <table className="mt-6 w-full text-left">
        <thead className="max-md:sr-only">
          <tr className="label border-b border-line">
            <th scope="col" className="w-20 py-3 font-medium">Year</th>
            <th scope="col" className="py-3 font-medium">Project</th>
            <th scope="col" className="py-3 font-medium">Category</th>
            <th scope="col" className="py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="max-md:block">
          {visible.map((p) => {
            return (
              <tr
                key={p.id}
                className="group relative border-b border-line transition-colors hover:bg-surface max-md:grid max-md:grid-cols-[3.5rem_1fr] max-md:gap-x-3 max-md:py-4"
              >
                <td className="py-4 align-top tabular text-ink-faint max-md:row-span-3 max-md:py-0">
                  {p.year}
                </td>
                <td className="py-4 pr-6 align-top max-md:py-0">
                  <Link
                    to={`/projects/${p.id}`}
                    className="font-semibold text-ink after:absolute after:inset-0 group-hover:text-accent-ink"
                  >
                    {p.title}
                  </Link>
                  <p className="mt-0.5 text-[0.92rem] text-ink-dim">{clean(p.tagline)}</p>
                </td>
                <td className="py-4 pr-6 align-top text-[0.92rem] text-ink-dim max-md:pt-1.5 max-md:pb-0">{clean(p.category)}</td>
                <td className="py-4 align-top max-md:pt-1">
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!expanded && filter === "All" && rows.length > PREVIEW_ROWS ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-6 cursor-pointer rounded-[3px] border border-line-strong px-4 py-2.5 font-semibold text-ink transition-colors hover:border-ink"
        >
          Show all {rows.length} projects
        </button>
      ) : null}
    </div>
  );
}

export function Work() {
  const { projects, achievements, profile } = useData();
  const featured = useMemo(() => (projects ?? []).filter((p) => p.featured).sort(byOrder), [projects]);
  const rest = useMemo(() => (projects ?? []).filter((p) => !p.featured), [projects]);
  if (!projects) return null;

  return (
    <section id="work" aria-labelledby="work-title" className="border-t border-line py-20 md:py-28">
      <div className="container-rk">
        <SectionHead id="work" title="Selected work">
          <p>{introOf(profile?.intros, "work")}</p>
        </SectionHead>

        <div className="mt-12 md:mt-16">
          {featured.map((p, i) => (
            <ProjectSheet
              key={p.id}
              project={p}
              achievements={achievements ?? []}
              outlets={profile?.featured_in ?? []}
              lead={i === 0}
            />
          ))}
        </div>

        <ProjectIndex projects={rest} />
      </div>
    </section>
  );
}
