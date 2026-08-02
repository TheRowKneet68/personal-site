import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "../types";
import { StatusBadge } from "./Badges";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="group flex h-full flex-col bg-surface p-6 transition-colors duration-200 hover:bg-raised"
    >
      <div className="flex items-center justify-between font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-faint">
        <span>{project.year}</span>
        <span>{project.category}</span>
      </div>
      <h3 className="mt-4 text-lg font-bold leading-snug text-ink transition-colors group-hover:text-accent-ink">
        {project.title}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-dim">{project.tagline}</p>
      <div className="mt-5 flex items-center justify-between">
        <StatusBadge status={project.status} />
        <ArrowUpRight
          className="size-4 text-ink-faint transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-ink"
          aria-hidden
        />
      </div>
    </Link>
  );
}
