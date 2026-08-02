import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Project } from "../types";
import { TechChip } from "./Badges";

interface CaseStudyRowProps {
  project: Project;
  index: number;
}

/** Editorial index row for the projects with full case studies. */
export function CaseStudyRow({ project, index }: CaseStudyRowProps) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="group grid grid-cols-12 items-baseline gap-x-4 gap-y-3 border-b border-line py-10 transition-colors first:border-t hover:bg-surface md:py-12"
    >
      <span className="col-span-2 font-mono text-sm text-ink-faint md:col-span-1">
        {String(index).padStart(2, "0")}
      </span>

      <div className="col-span-10 md:col-span-7">
        <h3 className="text-2xl font-bold leading-tight tracking-tight text-ink transition-colors group-hover:text-accent-ink md:text-3xl">
          {project.title}
          <ArrowRight
            className="ml-2 inline-block size-5 -translate-x-2 text-accent opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden
          />
        </h3>
        <p className="mt-2 max-w-lg text-ink-dim">{project.tagline}</p>
      </div>

      <div className="col-span-10 col-start-3 flex flex-wrap items-center gap-1.5 md:col-span-4 md:col-start-auto md:justify-end">
        {project.tech.slice(0, 4).map((t) => (
          <TechChip key={t}>{t}</TechChip>
        ))}
        <span className="ml-2 hidden font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint lg:inline">
          {project.year} · {project.category}
        </span>
      </div>
    </Link>
  );
}
