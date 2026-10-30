import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useRevealOnce } from "../../hooks";
import { dateRange } from "../../lib/portfolio";
import { fieldOfProject, projectSpans, type ProjectSpan } from "../../lib/stats";
import { cn } from "../../utils/format";
import type { Project } from "../../types";
import { ChartFrame, DataTable } from "./ChartFrame";
import { useChartTip } from "./tip";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m: number): string => `${MONTHS[m % 12]} ${Math.floor(m / 12)}`;
const plural = (n: number, w: string): string => `${n} ${w}${n === 1 ? "" : "s"}`;
const lengthText = (months: number): string => {
  if (months < 12) return plural(months, "month");
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${plural(y, "year")} ${plural(m, "month")}` : plural(y, "year");
};

/** The plot sits beside a fixed name column (stacked under the name on phones). */
const PLOT = "pointer-events-none absolute inset-y-0 left-0 right-0 sm:left-[14rem]";

/** One bar on its year's own Jan-to-Dec axis. A project that carries on past the
    year runs to the right edge and fades out there instead of ending in a cap. */
const FADE = "linear-gradient(to right, #000 calc(100% - 72px), transparent)";

function Bar({ s, from, to }: { s: ProjectSpan; from: number; to: number }) {
  const pct = (m: number): number => ((Math.min(Math.max(m, from), to) - from) / (to - from)) * 100;
  const clipped = s.end + 1 > to;
  const left = pct(s.start);
  const width = Math.max(pct(s.end + 1) - left, 1.5);
  return (
    <span
      data-bar
      className={cn(
        "ch-grow-x absolute top-1/2 h-3 -translate-y-1/2",
        clipped ? "rounded-l-full" : "rounded-full",
        s.approx ? "border border-dashed border-accent bg-accent/15" : s.ongoing ? "bg-accent" : "bg-accent/55",
      )}
      style={{ left: `${left}%`, width: `${width}%`, ...(clipped ? { maskImage: FADE, WebkitMaskImage: FADE } : {}) }}
    >
      {!clipped && s.ongoing && !s.approx ? (
        <span className="absolute -right-1.5 top-1/2 size-3.5 -translate-y-1/2 rounded-full border-2 border-surface bg-accent" />
      ) : null}
    </span>
  );
}

/** Gantt grouped by the year each project started, newest first. Each year is
    zoomed to its own Jan-to-Dec axis so its bars use the full width. */
export function Timeline({ projects, className }: { projects: Project[]; className?: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const { armed, on } = useRevealOnce(bodyRef);
  const { tip, bind, onBodyPointerDown } = useChartTip(bodyRef);

  const spans = useMemo(() => projectSpans(projects), [projects]);
  const today = useMemo(() => {
    const d = new Date();
    return d.getFullYear() * 12 + d.getMonth();
  }, []);
  const groups = useMemo(() => {
    const by = new Map<number, ProjectSpan[]>();
    for (const s of [...spans].sort((a, b) => b.start - a.start || b.end - a.end)) {
      const y = Math.floor(s.start / 12);
      by.set(y, [...(by.get(y) ?? []), s]);
    }
    return [...by.entries()];
  }, [spans]);
  if (spans.length === 0) return null;

  const firstYear = Math.floor(Math.min(...spans.map((s) => s.start)) / 12);
  const running = spans.filter((s) => s.ongoing).length;

  return (
    <ChartFrame
      title="Project timeline"
      summary={
        <>
          Every project since {firstYear}, grouped by the year it started. {running} are still running. Hover for dates, click to open one.
        </>
      }
      tip={tip}
      bodyRef={bodyRef}
      onBodyPointerDown={onBodyPointerDown}
      armed={armed}
      on={on}
      className={className}
      table={
        <DataTable
          head={["Project", "Started", "Finished", "Length"]}
          rows={spans.map((s) => [
            s.project.title,
            s.project.started || s.project.year,
            s.ongoing ? "still running" : s.project.finished || s.project.year,
            lengthText(s.end - s.start + 1),
          ])}
        />
      }
    >
      <ul className="mb-5 flex flex-wrap gap-x-6 gap-y-1.5 text-[0.85rem] text-ink-dim">
        <li className="flex items-center gap-2">
          <span className="relative h-3 w-6 rounded-full bg-accent" aria-hidden>
            <span className="absolute -right-1 top-1/2 size-2.5 -translate-y-1/2 rounded-full border-2 border-surface bg-accent" />
          </span>
          Still running
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-6 rounded-full bg-accent/55" aria-hidden />
          Finished
        </li>
        <li className="flex items-center gap-2">
          <span
            className="h-3 w-8 rounded-l-full bg-accent/55"
            style={{ maskImage: "linear-gradient(to right, #000 30%, transparent)", WebkitMaskImage: "linear-gradient(to right, #000 30%, transparent)" }}
            aria-hidden
          />
          Carries on into a later year
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-6 rounded-full border border-dashed border-accent bg-accent/15" aria-hidden />
          Only the year is known
        </li>
      </ul>

      {groups.map(([year, rows]) => {
        const from = year * 12;
        const current = from <= today && today < from + 12;
        const to = current ? today + 1 : from + 12; // this year's axis ends today
        const pos = (m: number): number => ((m - from) / (to - from)) * 100;
        const quarters = [0, 3, 6, 9].map((q) => from + q).filter((m) => m < to);
        return (
          <section key={year} aria-label={`Started in ${year}`} className="relative">
            {/* this year's month grid, behind its rows */}
            <div className={PLOT} aria-hidden>
              {quarters.map((m, i) => (
                <div
                  key={m}
                  className={cn("absolute inset-y-0 border-l border-line", i % 2 === 1 && "bg-raised/50")}
                  style={{ left: `${pos(m)}%`, width: `${pos(Math.min(m + 3, to)) - pos(m)}%` }}
                >
                  <span className="absolute top-4 left-2 text-[0.72rem] text-ink-faint max-sm:hidden">{MONTHS[m % 12]}</span>
                </div>
              ))}
              {current ? (
                <div className="absolute inset-y-0 right-0 border-r border-dashed border-accent">
                  <span className="absolute top-4 right-1.5 text-[0.72rem] font-semibold text-accent max-sm:hidden">today</span>
                </div>
              ) : null}
            </div>

            <h4 className="relative flex items-baseline gap-2 border-t border-line-strong pt-3 pb-2">
              <span className="font-semibold text-ink tabular">{year}</span>
              <span className="text-[0.8rem] text-ink-faint">{plural(rows.length, "project")}</span>
            </h4>
            <ul className="pb-3">
              {rows.map((s) => {
                const months = s.end - s.start + 1;
                const f = fieldOfProject(s.project);
                const when = s.approx
                  ? Math.floor(s.end / 12) > year
                    ? `${year} to ${Math.floor(s.end / 12)}, months unknown`
                    : `Sometime in ${year}`
                  : s.ongoing
                    ? `Since ${monthLabel(s.start)}`
                    : dateRange(s.project.started, s.project.finished) || s.project.year;
                return (
                  <li key={s.project.id}>
                    <Link
                      to={`/projects/${s.project.id}`}
                      aria-label={`${s.project.title}: ${when}, ${lengthText(months)}. Opens the project.`}
                      className="group relative grid items-center rounded-[3px] outline-none transition-colors hover:bg-raised focus-visible:ring-2 focus-visible:ring-accent sm:h-9 sm:grid-cols-[14rem_1fr] max-sm:py-1.5"
                      {...bind(
                        s.project.title,
                        [
                          { label: when, value: "" },
                          { label: `${lengthText(months)}${s.ongoing ? " so far" : ""}`, value: "" },
                          { label: `${f.label}, ${s.project.status}`, value: "" },
                        ],
                        (el) => el.querySelector("[data-bar]"),
                      )}
                    >
                      <span className="truncate pr-4 text-[0.9rem] text-ink-dim transition-colors group-hover:text-accent-ink group-focus-visible:text-accent-ink">
                        {s.project.title}
                      </span>
                      <span className="relative h-4 max-sm:mt-1">
                        <Bar s={s} from={from} to={to} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </ChartFrame>
  );
}
