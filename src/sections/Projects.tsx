import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { CaseStudyRow } from "../components/CaseStudyRow";
import { ProjectCard } from "../components/ProjectCard";
import { cn } from "../utils/format";
import type { Project } from "../types";

type SortId = "featured" | "newest" | "oldest" | "title";

const SORTS: Record<SortId, { label: string; cmp: (a: Project, b: Project) => number }> = {
  featured: {
    label: "featured first",
    cmp: (a, b) =>
      Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
      (a.weight ?? 9999) - (b.weight ?? 9999) ||
      b.year.localeCompare(a.year),
  },
  newest: { label: "newest", cmp: (a, b) => b.year.localeCompare(a.year) },
  oldest: { label: "oldest", cmp: (a, b) => a.year.localeCompare(b.year) },
  title: { label: "title A-Z", cmp: (a, b) => a.title.localeCompare(b.title) },
};

export function Projects() {
  const { projects } = useData();
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<SortId>("featured");

  const caseStudies = useMemo(
    () =>
      (projects ?? [])
        .filter((p) => p.caseStudy)
        .sort(
          (a, b) => (a.weight ?? 9999) - (b.weight ?? 9999) || b.year.localeCompare(a.year),
        ),
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

  const sorted = useMemo(() => [...filtered].sort(SORTS[sort].cmp), [filtered, sort]);

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

          <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filter and sort projects">
            <span className="flex flex-wrap gap-2">
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
            </span>
            <label className="ml-auto flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-faint">
              sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortId)}
                className="cursor-pointer rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-dim focus:border-accent focus:outline-none"
              >
                {(Object.keys(SORTS) as SortId[]).map((id) => (
                  <option key={id} value={id}>
                    {SORTS[id].label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ul className="mt-6 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((p) => (
              <li key={p.id} className="bg-surface">
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint">
            // {sorted.length} project{sorted.length === 1 ? "" : "s"} in this view — sorted by {SORTS[sort].label}
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
