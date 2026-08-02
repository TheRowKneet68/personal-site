import { ArrowLeft, ArrowRight, ExternalLink, Github } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useSeo } from "../hooks/useSeo";
import { Container } from "../components/Container";
import { Button } from "../components/Button";
import { StatusBadge, TechChip } from "../components/Badges";
import { Reveal } from "../components/Reveal";
import type { Project } from "../types";

function CaseStudyBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 py-14 md:grid-cols-12 md:gap-10">
      <div className="md:col-span-4">
        <p className="mono-label">{label}</p>
      </div>
      <div className="max-w-2xl md:col-span-8">{children}</div>
    </div>
  );
}

function CaseStudyContent({ project }: { project: Project }) {
  const cs = project.caseStudy;
  if (!cs) return null;

  return (
    <div className="border-t border-line">
      <Container className="divide-y divide-line">
        {cs.problem.length > 0 && (
          <CaseStudyBlock label="the problem">
            {cs.problem.map((p, i) => (
              <p key={i} className="mb-4 text-lg leading-relaxed text-ink-dim last:mb-0">
                {p}
              </p>
            ))}
          </CaseStudyBlock>
        )}

        {cs.solution.length > 0 && (
          <CaseStudyBlock label="the build">
            {cs.solution.map((p, i) => (
              <p key={i} className="mb-4 text-lg leading-relaxed text-ink-dim last:mb-0">
                {p}
              </p>
            ))}
          </CaseStudyBlock>
        )}

        {cs.architecture && cs.architecture.length > 0 && (
          <CaseStudyBlock label="architecture">
            <ul className="space-y-3">
              {cs.architecture.map((a, i) => (
                <li key={i} className="flex gap-4">
                  <span className="font-mono text-xs text-accent-ink">{String(i + 1).padStart(2, "0")}</span>
                  <span className="leading-relaxed text-ink-dim">{a}</span>
                </li>
              ))}
            </ul>
          </CaseStudyBlock>
        )}

        {cs.stack && cs.stack.length > 0 && (
          <CaseStudyBlock label="tech stack">
            <div className="flex flex-wrap gap-2">
              {cs.stack.map((t) => (
                <TechChip key={t}>{t}</TechChip>
              ))}
            </div>
          </CaseStudyBlock>
        )}

        {cs.challenges && cs.challenges.length > 0 && (
          <CaseStudyBlock label="the hard parts">
            <ul className="space-y-6">
              {cs.challenges.map((c, i) => (
                <li key={i} className="border-l-2 border-line pl-5">
                  <p className="font-semibold text-ink">{c.problem}</p>
                  <p className="mt-1.5 leading-relaxed text-ink-dim">
                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-accent-ink">fix → </span>
                    {c.fix}
                  </p>
                </li>
              ))}
            </ul>
          </CaseStudyBlock>
        )}

        {cs.impact && cs.impact.length > 0 && (
          <CaseStudyBlock label="what it did">
            <ul className="space-y-3">
              {cs.impact.map((im, i) => (
                <li key={i} className="flex gap-4">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span className="leading-relaxed text-ink-dim">{im}</span>
                </li>
              ))}
            </ul>
          </CaseStudyBlock>
        )}

        {cs.lessons && cs.lessons.length > 0 && (
          <CaseStudyBlock label="what I'd tell my past self">
            {cs.lessons.map((l, i) => (
              <p key={i} className="mb-4 text-lg leading-relaxed text-ink-dim last:mb-0">
                {l}
              </p>
            ))}
          </CaseStudyBlock>
        )}
      </Container>
    </div>
  );
}

function SimpleContent({ project }: { project: Project }) {
  return (
    <div className="border-t border-line">
      <Container className="py-14">
        <div className="max-w-2xl">
          <p className="mono-label mb-4">about this one</p>
          <p className="text-lg leading-relaxed text-ink-dim">{project.description}</p>
          {project.highlights && project.highlights.length > 0 && (
            <ul className="mt-8 space-y-3">
              {project.highlights.map((h, i) => (
                <li key={i} className="flex gap-4">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span className="leading-relaxed text-ink-dim">{h}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </div>
  );
}

function PrevNext({ prev, next }: { prev?: Project; next?: Project }) {
  const link = (p: Project, arrow: "prev" | "next") => (
    <Link
      to={`/projects/${p.id}`}
      className={`group flex flex-1 items-center gap-3 rounded-sm border border-line bg-surface p-5 transition-colors hover:border-line-strong ${
        arrow === "next" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {arrow === "prev" ? (
        <ArrowLeft className="size-4 shrink-0 text-ink-faint transition-transform group-hover:-translate-x-1" aria-hidden />
      ) : (
        <ArrowRight className="size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-1" aria-hidden />
      )}
      <span className="min-w-0">
        <span className="block font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-faint">
          {arrow === "prev" ? "previous" : "next"}
        </span>
        <span className="block truncate text-sm font-semibold text-ink group-hover:text-accent-ink">{p.title}</span>
      </span>
    </Link>
  );

  return (
    <div className="border-t border-line">
      <Container className="flex gap-4 py-14">
        {prev && link(prev, "prev")}
        {next && link(next, "next")}
      </Container>
    </div>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams();
  const { projects } = useData();
  const project = projects?.find((p) => p.id === id) ?? null;

  useSeo(
    project
      ? {
          title: `${project.title} — ${project.tagline} | Ronit Baniya Gupta`,
          description: project.description,
          path: `/projects/${project.id}`,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: project.title,
            description: project.description,
            dateCreated: project.year,
            creator: { "@type": "Person", name: "Ronit Baniya Gupta", url: "https://therowkneet.vercel.app/" },
          },
        }
      : { title: "Project not found | Ronit Baniya Gupta", description: "This project doesn't exist." },
  );

  if (!project) {
    return (
      <Container className="flex min-h-[70vh] flex-col items-center justify-center py-32 text-center">
        <p className="mono-label">404</p>
        <h1 className="text-display mt-4 font-bold">
          project <em className="accent-serif">not found</em>
        </h1>
        <Button to="/" className="mt-8" withArrow>
          back home
        </Button>
      </Container>
    );
  }

  const all = projects ?? [];
  const idx = all.findIndex((p) => p.id === id);
  const prev = all[idx - 1];
  const next = all[idx + 1];

  return (
    <article>
      <header className="border-b border-line pt-32 pb-16 md:pt-40 md:pb-20">
        <Container>
          <Link to="/#work" className="mono-label inline-flex items-center gap-2 transition-colors hover:text-ink">
            <ArrowLeft className="size-3.5" aria-hidden /> all work
          </Link>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <StatusBadge status={project.status} />
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-faint">
              {project.year} · {project.category}
            </span>
          </div>

          <h1 className="text-display mt-6 max-w-3xl font-bold">{project.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-dim">{project.tagline}</p>

          {(project.links?.github || project.links?.demo) && (
            <div className="mt-9 flex flex-wrap gap-3">
              {project.links?.demo && (
                <Button href={project.links.demo} external variant="solid" withArrow>
                  <ExternalLink className="size-4" aria-hidden /> live demo
                </Button>
              )}
              {project.links?.github && (
                <Button href={project.links.github} external variant="outline">
                  <Github className="size-4" aria-hidden /> source
                </Button>
              )}
            </div>
          )}

          <div className="mt-9 flex flex-wrap gap-2">
            {project.tech.map((t) => (
              <TechChip key={t}>{t}</TechChip>
            ))}
          </div>
        </Container>
      </header>

      <Reveal>
        {project.caseStudy ? <CaseStudyContent project={project} /> : <SimpleContent project={project} />}
      </Reveal>

      <PrevNext prev={prev} next={next} />
    </article>
  );
}
