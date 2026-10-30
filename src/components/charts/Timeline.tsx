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

/** The plot sits beside a fixed name column (stacked under the name on phones),
    so grid lines and the today marker share one coordinate box with the bars. */
const PLOT = "absolute inset-y-0 left-0 right-0 sm:left-[14rem]";

function Bar({ s, pct }: { s: ProjectSpan; pct: (m: number) => number }) {
  const left = pct(s.start);
  const width = Math.max(pct(s.end + 1) - left, 0.8);
  return (
    <span
      data-bar
      className={cn(
        "ch-grow-x absolute top-1/2 h-2 -translate-y-1/2 rounded-full",
        s.approx ? "border border-dashed border-accent bg-accent/10" : s.ongoing ? "bg-accent" : "bg-accent/50",
      )}
      style={{ left: `${left}%`, width: `${width}%` }}
    >
      {s.ongoing && !s.approx ? (
        <span className="absolute -right-1 top-1/2 size-2.5 -translate-y-1/2 rounded-full border-2 border-surface bg-accent" />
      ) : null}
    </span>
  );
}

/** Gantt: every project on one 2022-to-today axis, grouped by the year it started,
    newest first. Solid = still running, soft = finished, dotted = only the year is known. */
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

  const first = Math.floor(Math.min(...spans.map((s) => s.start)) / 12) * 12;
  const last = today + 1; // the axis ends today
  const pct = (m: number): number => ((m - first) / (last - first)) * 100;
  const years = Array.from({ length: Math.ceil((last - first) / 12) }, (_, i) => first / 12 + i);
  const running = spans.filter((s) => s.ongoing).length;

  return (
    <ChartFrame
      title="Project timeline"
      summary={
        <>
          Every project since {first / 12}, by when it started and how long it ran. {running} are still running. Hover for dates, click to open one.
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
          <span className="relative h-2 w-6 rounded-full bg-accent" aria-hidden>
            <span className="absolute -right-1 top-1/2 size-2.5 -translate-y-1/2 rounded-full border-2 border-surface bg-accent" />
          </span>
          Still running
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-accent/50" aria-hidden />
          Finished
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2 w-6 rounded-full border border-dashed border-accent bg-accent/10" aria-hidden />
          Only the year is known
        </li>
      </ul>

      <div className="relative">
        {/* year grid + today marker, behind every row */}
        <div className={PLOT} aria-hidden>
          {years.map((y, i) => (
            <div
              key={y}
              className={cn("absolute inset-y-0 border-l border-line", i % 2 === 0 && "bg-raised/50")}
              style={{ left: `${pct(y * 12)}%`, width: `${pct(Math.min((y + 1) * 12, last)) - pct(y * 12)}%` }}
            >
              <span className="absolute top-1.5 left-2 text-[0.75rem] font-semibold text-ink-faint tabular">{y}</span>
            </div>
          ))}
          <div className="absolute inset-y-0 border-l border-dashed border-accent" style={{ left: `calc(${pct(last)}% - 1px)` }}>
            <span className="absolute top-1.5 right-1.5 text-[0.75rem] font-semibold text-accent">today</span>
          </div>
        </div>

        <div className="relative h-8" aria-hidden />

        {groups.map(([year, rows]) => (
          <section key={year} aria-label={`Started in ${year}`}>
            <h4 className="relative flex items-baseline gap-2 border-t border-line-strong pt-3 pb-1.5">
              <span className="font-semibold text-ink tabular">{year}</span>
              <span className="text-[0.8rem] text-ink-faint">{plural(rows.length, "project")}</span>
            </h4>
            <ul>
              {rows.map((s) => {
                const months = s.end - s.start + 1;
                const f = fieldOfProject(s.project);
                const when = s.approx
                  ? `Sometime in ${s.project.year}`
                  : s.ongoing
                    ? `Since ${monthLabel(s.start)}`
                    : dateRange(s.project.started, s.project.finished) || s.project.year;
                return (
                  <li key={s.project.id}>
                    <Link
                      to={`/projects/${s.project.id}`}
                      aria-label={`${s.project.title}: ${when}, ${lengthText(months)}. Opens the project.`}
                      className="group relative grid items-center rounded-[3px] outline-none transition-colors hover:bg-raised focus-visible:ring-2 focus-visible:ring-accent sm:h-8 sm:grid-cols-[14rem_1fr] max-sm:py-1.5"
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
                        <Bar s={s} pct={pct} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </ChartFrame>
  );
}
