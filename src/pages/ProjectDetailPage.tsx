import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EditLink } from "../components/EditLink";
import { useData } from "../context/DataContext";
import { useSeo } from "../hooks/useSeo";
import { Button } from "../components/Button";
import { StatusBadge, TechList } from "../components/Badges";
import { ProjectVisual } from "../components/ProjectVisual";
import { SITE } from "../lib/constants";
import { diagramFor } from "../lib/diagrams";
import {
  byPlacement,
  clean,
  dateRange,
  formatDate,
  githubLabel,
  hasCaseStudy,
  hasVisual,
  isPlacement,
  placeLabel,
  pressFor,
  recognitionFor,
  techOf,
} from "../lib/portfolio";
import type { Achievement, Project } from "../types";


/** One case-study chapter: label column + body column. */
function Chapter({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line py-12 md:grid-cols-12 md:gap-10 md:py-14">
      <h2 className="font-display text-[1.75rem] md:col-span-4 md:sticky md:top-24 md:self-start lg:col-span-3">{title}</h2>
      <div className="max-w-[66ch] md:col-span-8 lg:col-span-8">{children}</div>
    </section>
  );
}

const paragraphs = (items: string[] | undefined, lead = false) =>
  (items ?? []).map(clean).filter(Boolean).map((p, i) => (
    <p key={i} className={i === 0 && lead ? "t-lede mb-5 text-ink" : "mb-4 text-ink-dim last:mb-0"}>
      {p}
    </p>
  ));

function CaseStudy({ project }: { project: Project }) {
  const cs = project.caseStudy;
  if (!cs) return null;
  return (
    <>
      {cs.problem?.length ? <Chapter title="The problem">{paragraphs(cs.problem, true)}</Chapter> : null}
      {cs.solution?.length ? <Chapter title="The build">{paragraphs(cs.solution)}</Chapter> : null}
      {cs.architecture?.length ? (
        <Chapter title="How it's wired">
          <ul className="space-y-3">
            {cs.architecture.map(clean).filter(Boolean).map((a, i) => (
              <li key={i} className="flex gap-3 text-ink-dim">
                <span className="mt-[0.62em] h-px w-4 shrink-0 bg-accent" aria-hidden />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Chapter>
      ) : null}
      {cs.challenges?.length ? (
        <Chapter title="What went wrong">
          <ol className="space-y-8">
            {cs.challenges.map((c, i) => (
              <li key={i} className="grid gap-x-6 gap-y-2 sm:grid-cols-[6.5rem_1fr]">
                <p className="label pt-0.5">Problem</p>
                <p className="font-semibold text-ink">{clean(c.problem)}</p>
                <p className="label pt-0.5">Fix</p>
                <p className="text-ink-dim">{clean(c.fix)}</p>
              </li>
            ))}
          </ol>
        </Chapter>
      ) : null}
      {cs.impact?.length ? <Chapter title="What it did">{paragraphs(cs.impact)}</Chapter> : null}
      {cs.lessons?.length ? <Chapter title="What I'd tell my past self">{paragraphs(cs.lessons)}</Chapter> : null}
    </>
  );
}

function RecognitionList({ items }: { items: Achievement[] }) {
  return (
    <ul>
      {items.map((a) => (
        <li key={a.id} className="grid grid-cols-[1fr_auto] gap-x-4 border-t border-line py-3.5 first:border-t-0 first:pt-0">
          <span>
            <span className="font-semibold">{isPlacement(a) ? placeLabel(a) : clean(a.result)}</span>
            <span className="block text-[0.92rem] text-ink-dim">
              {clean(a.event)}, <span className="tabular">{formatDate(a.date || a.year)}</span>
            </span>
          </span>
          {a.images?.[0] ? (
            <a href={a.images[0]} target="_blank" rel="noopener noreferrer" className="link text-[0.92rem] text-ink-dim">
              Certificate<span className="sr-only"> for {clean(a.event)}</span>
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams();
  const { status, projects, achievements, profile } = useData();
  const project = projects?.find((p) => p.id === id) ?? null;
  const loading = status === "loading" && !projects;

  useSeo(
    project
      ? {
          title: `${project.title}: ${clean(project.tagline)} | Ronit Baniya Gupta`,
          description: clean(project.description),
          path: `/projects/${project.id}`,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: project.title,
            description: clean(project.description),
            dateCreated: project.year,
            creator: { "@type": "Person", name: SITE.name, url: SITE.url },
          },
        }
      : loading
        ? { title: "Ronit Baniya Gupta", description: "Projects by Ronit Baniya Gupta.", path: `/projects/${id ?? ""}` }
        : { title: "Project not found | Ronit Baniya Gupta", description: "This project doesn't exist." },
  );

  if (loading) return null;

  if (!project) {
    return (
      <div className="container-rk flex min-h-[70vh] flex-col justify-center py-32">
        <p className="label">Error 404</p>
        <h1 className="font-display t-h1 mt-3">Project not found</h1>
        <p className="mt-4 max-w-[46ch] text-ink-dim">It may have been renamed or removed. Every project is listed on the home page.</p>
        <Button to="/#work" variant="solid" className="mt-8 w-fit">
          See all work
        </Button>
      </div>
    );
  }

  const outlets = profile?.featured_in ?? [];
  const recognition = recognitionFor(project, achievements ?? []);
  const placements = recognition.filter(isPlacement).sort(byPlacement);
  const otherRecognition = recognition.filter((a) => !isPlacement(a));
  const press = pressFor(project, outlets);
  const tech = techOf(project);
  const caseStudy = hasCaseStudy(project);
  const when = dateRange(project.started, project.finished);
  const team = (project.team ?? []).map(clean).filter(Boolean);
  const visual = hasVisual(project, outlets);
  // The visual above the fold uses the diagram or the first image; list the rest below.
  const usesFirstImage = !diagramFor(project);
  const gallery = (project.images ?? []).slice(usesFirstImage ? 1 : 0);
  const github = project.links?.github?.trim();
  const demo = project.links?.demo?.trim();

  const all = projects ?? [];
  const idx = all.findIndex((p) => p.id === project.id);
  const prev = idx > 0 ? all[idx - 1] : undefined;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : undefined;

  return (
    <article>
      <header className="pt-24 md:pt-32">
        <div className="container-rk">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/#work" className="inline-flex items-center gap-2 text-[0.95rem] font-medium text-ink-dim transition-colors hover:text-ink">
              <ArrowLeft className="size-4" aria-hidden /> All work
            </Link>
            <EditLink to={`project=${project.id}`} label="Edit this project" />
          </div>

          <h1 className="font-display t-h1 mt-8 max-w-[14ch]">{project.title}</h1>
          <p className="t-lede mt-4 max-w-[46ch] font-medium">{clean(project.tagline)}</p>

          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-line py-6 md:grid-cols-4">
            <div>
              <dt className="label">{when ? "Built" : "Year"}</dt>
              <dd className="mt-1 font-medium tabular">{when || project.year}</dd>
            </div>
            <div>
              <dt className="label">Category</dt>
              <dd className="mt-1 font-medium">{clean(project.category)}</dd>
            </div>
            <div>
              <dt className="label">Status</dt>
              <dd className="mt-1.5">
                <StatusBadge status={project.status} className="text-[0.98rem] text-ink" />
              </dd>
            </div>
            {recognition.length > 0 ? (
              <div>
                <dt className="label">Recognition</dt>
                <dd className="mt-1 font-medium">
                  <a href="#recognition" className="link">
                    {placements.length > 0
                      ? `${placements.length} competition ${placements.length === 1 ? "placement" : "placements"}`
                      : `${otherRecognition.length} ${otherRecognition.length === 1 ? "certificate" : "certificates"}`}
                  </a>
                </dd>
              </div>
            ) : null}
            {project.context?.trim() ? (
              <div className="col-span-2">
                <dt className="label">Context</dt>
                <dd className="mt-1 font-medium">{clean(project.context)}</dd>
              </div>
            ) : null}
            {team.length > 0 ? (
              <div className="col-span-2 md:col-span-1">
                <dt className="label">Built with</dt>
                <dd className="mt-1 font-medium">{team.join(", ")}</dd>
              </div>
            ) : null}
            {project.supervisor?.trim() ? (
              <div className="col-span-2 md:col-span-1">
                <dt className="label">Supervisor</dt>
                <dd className="mt-1 font-medium">{clean(project.supervisor)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </header>

      <div className="container-rk">
        <div className="grid gap-10 py-12 md:py-14 lg:grid-cols-12 lg:gap-10">
          <div className={visual ? "lg:col-span-4" : "lg:col-span-12"}>
            <p className={caseStudy ? "max-w-[62ch] text-ink-dim" : "max-w-[62ch] text-ink"}>{clean(project.description)}</p>

            {tech.length > 0 ? (
              <div className="mt-8">
                <h2 className="label">Parts and tools</h2>
                <TechList items={tech} className="mt-2 text-[0.95rem]" />
              </div>
            ) : null}

            {github || demo ? (
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                {demo ? (
                  <Button href={demo} external variant="solid">
                    Open the live demo
                  </Button>
                ) : null}
                {github ? (
                  <a href={github} target="_blank" rel="noopener noreferrer" className="link font-semibold">
                    {githubLabel(github)}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          {visual ? (
            <div className="lg:col-span-8">
              <ProjectVisual project={project} outlets={outlets} />
            </div>
          ) : null}
        </div>

        {caseStudy ? (
          <CaseStudy project={project} />
        ) : (project.highlights ?? []).length > 0 && (diagramFor(project) || project.images?.length || press.length) ? (
          <Chapter title="Highlights">
            <ul className="space-y-3">
              {(project.highlights ?? []).map(clean).filter(Boolean).map((h) => (
                <li key={h} className="flex gap-3 text-ink-dim">
                  <span className="mt-[0.62em] h-px w-4 shrink-0 bg-accent" aria-hidden />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </Chapter>
        ) : null}

        {recognition.length > 0 ? (
          <div id="recognition">
            <Chapter title="Recognition">
              <RecognitionList items={[...placements, ...otherRecognition]} />
            </Chapter>
          </div>
        ) : null}

        {press.length > 0 && diagramFor(project) ? (
          <Chapter title="In the press">
            <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {press.map((o) => (
                <li key={o.name}>
                  <a href={o.url} target="_blank" rel="noopener noreferrer" className="link font-medium">
                    {o.name}
                  </a>
                </li>
              ))}
            </ul>
          </Chapter>
        ) : null}

        {gallery.length > 0 ? (
          <Chapter title="Images">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((src, i) => (
                <li key={src}>
                  <a href={src} target="_blank" rel="noopener noreferrer" className="block" title="Open full size">
                    <img
                      src={src}
                      alt={`${project.title}, image ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/5] w-full rounded-[3px] border border-line bg-surface object-contain p-1.5 transition-opacity hover:opacity-85"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </Chapter>
        ) : null}
      </div>

      {prev || next ? (
        <nav aria-label="More projects" className="mt-6 border-t border-line">
          <div className="container-rk grid gap-px sm:grid-cols-2">
            {prev ? (
              <Link to={`/projects/${prev.id}`} className="group py-8 sm:pr-8">
                <span className="label">Previous project</span>
                <span className="font-display mt-1 block text-[1.75rem] group-hover:text-accent-ink">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link to={`/projects/${next.id}`} className="group py-8 sm:border-l sm:border-line sm:pl-8 sm:text-right">
                <span className="label">Next project</span>
                <span className="font-display mt-1 block text-[1.75rem] group-hover:text-accent-ink">{next.title}</span>
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </article>
  );
}
