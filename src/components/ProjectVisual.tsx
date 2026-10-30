import { diagramFor } from "../lib/diagrams";
import { clean, pressFor } from "../lib/portfolio";
import type { FeaturedIn, Project } from "../types";
import { SystemDiagram } from "./SystemDiagram";

/** The most honest picture we have of a project, in order:
    its system diagram, its own image, press photos of it, or its highlights. */
export function ProjectVisual({
  project,
  outlets,
  compact = false,
}: {
  project: Project;
  outlets: FeaturedIn[];
  compact?: boolean;
}) {
  const diagram = diagramFor(project);
  if (diagram) return <SystemDiagram diagram={diagram} title={project.title} compact={compact} />;

  const image = project.images?.[0];
  if (image) {
    return (
      <figure>
        <div className="grid place-items-center rounded-[3px] border border-line bg-surface p-3">
          <img
            src={image}
            alt={`${project.title}: ${clean(project.tagline)}`}
            loading="lazy"
            decoding="async"
            className="max-h-[30rem] w-auto rounded-[2px] object-contain"
          />
        </div>
      </figure>
    );
  }

  const press = pressFor(project, outlets).filter((o) => o.images?.[0]).slice(0, 3);
  if (press.length) {
    return (
      <figure>
        <ul className="grid grid-cols-3 gap-2 sm:gap-3">
          {press.map((o) => (
            <li key={o.name}>
              <a href={o.url} target="_blank" rel="noopener noreferrer" className="group block">
                <img
                  src={o.images?.[0]}
                  alt={`${o.name} coverage of ${project.title}`}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[3/4] w-full rounded-[3px] border border-line object-cover object-top transition-opacity group-hover:opacity-85"
                />
                <span className="mt-2 block text-[0.85rem] text-ink-dim group-hover:text-ink">{o.name}</span>
              </a>
            </li>
          ))}
        </ul>
        <figcaption className="mt-3 text-[0.92rem] text-ink-dim">
          Press coverage of {project.title}. Screenshots link to the original posts.
        </figcaption>
      </figure>
    );
  }

  const highlights = (project.highlights ?? []).map(clean).filter(Boolean);
  if (highlights.length) {
    return (
      <div className="perfboard rounded-[3px] border border-line p-5 sm:p-7">
        <p className="label">What it does</p>
        <ul className="mt-3 space-y-2.5">
          {highlights.map((h) => (
            <li key={h} className="flex gap-3 border-b border-line pb-2.5 last:border-b-0 last:pb-0">
              <span className="mt-[0.55em] size-1.5 shrink-0 bg-accent" aria-hidden />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
}
