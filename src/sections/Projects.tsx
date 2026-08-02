import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { CaseStudyRow } from "../components/CaseStudyRow";
import { ProjectCard } from "../components/ProjectCard";
import { cn } from "../utils/format";

export function Projects() {
  const { projects } = useData();
  const [filter, setFilter] = useState("all");

  const caseStudies = useMemo(
    () =>
      (projects ?? [])
        .filter((p) => p.caseStudy)
        .sort((a, b) => b.year.localeCompare(a.year)),
    [projects],
  );

  const categories = useMemo(
    () => ["all", ...new Set((projects ?? []).map((p) => p.category).filter(Boolean))],
    [projects],
  );

  const filtered = useMemo(() => {
    const list = projects ?? [];
    if (filter === "all") return list;
    return list.filter((p) => p.category === filter);
  }, [projects, filter]);

  if (!projects) return null;

  return (
    <section id="work" className="scroll-mt-24 border-t border-line py-24 md:py-32">
      <Container>
        <SectionHeading
          index="02"
          title={<>selected <em className="accent-serif">work</em></>}
          kicker="Four projects I can talk about properly — problem, build, and what it taught me. Everything else lives in the index below."
        />

        <Reveal>
          {caseStudies.map((p, i) => (
            <CaseStudyRow key={p.id} project={p} index={i + 1} />
          ))}
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-20 flex flex-wrap items-end justify-between gap-4 md:mt-28">
            <h3 className="mono-label">
              everything else — {projects.length} projects
            </h3>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint">
              click any card for the full story
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter projects by category">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                aria-pressed={filter === c}
                className={cn(
                  "cursor-pointer rounded-full border px-3.5 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.1em] transition-colors",
                  filter === c
                    ? "border-accent bg-accent-soft text-accent-ink"
                    : "border-line text-ink-dim hover:border-line-strong hover:text-ink",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <ul className="mt-6 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <li key={p.id} className="bg-surface">
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint">
            // {filtered.length} project{filtered.length === 1 ? "" : "s"} in this view — sorted by how much they taught me, not by alphabet
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
