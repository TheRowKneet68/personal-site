import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import type { Achievement } from "../types";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { cn } from "../utils/format";

/** Wins sorted by placement: 1st, 1st Runner-Up, 2nd Runner-Up, People's Choice, Consolation, then the rest. */
function placementRank(a: Achievement): number {
  if (a.rank !== undefined && a.rank !== "" && a.rank !== null) return Number(a.rank) || Number.MAX_SAFE_INTEGER;
  const s = a.result.toLowerCase().replace(/[-–—]/g, " ");
  if (/\b1st\b/.test(s)) return 1;
  if (s.includes("winner")) return 1;
  if (s.includes("first runner")) return 2;
  if (s.includes("second runner")) return 3;
  if (s.includes("people's choice")) return 4;
  if (s.includes("consolation")) return 5;
  const m = /(\d+)(?:st|nd|rd|th)/.exec(s);
  if (m) return Number(m[1]);
  return Number.MAX_SAFE_INTEGER;
}

const AUTO_HIGHLIGHT = /\b1st\b|winner|first runner|second runner|people's choice|consolation/i;

type SortId = "rank" | "newest" | "oldest" | "title";

const SORTS: Record<SortId, { label: string; cmp: (a: Achievement, b: Achievement) => number }> = {
  rank: { label: "rank", cmp: (a, b) => placementRank(a) - placementRank(b) || a.year.localeCompare(b.year) },
  newest: { label: "newest", cmp: (a, b) => b.year.localeCompare(a.year) },
  oldest: { label: "oldest", cmp: (a, b) => a.year.localeCompare(b.year) },
  title: { label: "title A-Z", cmp: (a, b) => a.title.localeCompare(b.title) },
};

export function Achievements() {
  const { achievements } = useData();
  const [sort, setSort] = useState<SortId>("rank");
  const sorted = useMemo(() => [...(achievements ?? [])].sort(SORTS[sort].cmp), [achievements, sort]);
  if (!achievements) return null;

  return (
    <section id="wins" className="scroll-mt-24 border-t border-line py-24 md:py-32">
      <Container>
        <SectionHeading
          index="03"
          title={<>wins & <em className="accent-serif">battles</em></>}
          kicker="Expos, hackathons, and the ones where the judges said 'we have no category for this.'"
        />

        <Reveal>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint">
              // {sorted.length} {sorted.length === 1 ? "entry" : "entries"} — sorted by {SORTS[sort].label}
            </span>
            <label className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-faint">
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

          <ol className="border-t border-line">
            {sorted.map((a) => {
              const highlighted = a.highlight ?? AUTO_HIGHLIGHT.test(a.result);
              return (
                <li
                  key={a.id}
                  className="grid grid-cols-12 items-baseline gap-x-4 gap-y-3 border-b border-line py-8 md:py-10"
                >
                  <span className="col-span-2 font-mono text-sm text-ink-faint md:col-span-1">{a.year}</span>
                  <div className="col-span-10 md:col-span-8">
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-ink-faint">{a.event}</p>
                    <h3 className="mt-1 text-lg font-semibold text-ink">{a.title}</h3>
                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-dim">{a.detail}</p>
                    {a.images && a.images.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {a.images.map((src, i) => (
                          <a
                            key={i}
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                            title="View certificate"
                          >
                            <img
                              src={src}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="h-24 w-auto max-w-full rounded-sm border border-line object-cover transition-opacity hover:opacity-80"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <span className="col-span-10 col-start-3 md:col-span-3 md:col-start-auto md:justify-self-end">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.12em]",
                        highlighted ? "border-accent bg-accent/10 text-accent-ink" : "border-line-strong text-ink-faint",
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current" aria-hidden />
                      {a.result}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Reveal>
      </Container>
    </section>
  );
}
