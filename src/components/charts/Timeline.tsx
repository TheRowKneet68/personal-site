import { useLayoutEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useElementWidth, useMediaQuery, useRevealOnce } from "../../hooks";
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

/** One bar on its group's axis, which always reaches the latest end in the group. */

function Bar({ s, from, to }: { s: ProjectSpan; from: number; to: number }) {
  const pct = (m: number): number => ((Math.min(Math.max(m, from), to) - from) / (to - from)) * 100;
  const left = pct(s.start);
  const width = Math.max(pct(s.end + 1) - left, 1.5);
  return (
    <span
      data-bar
      className={cn(
        "ch-grow-x absolute top-1/2 h-3 -translate-y-1/2",
        "rounded-full",
        s.approx ? "border border-dashed border-accent bg-accent/15" : s.ongoing ? "bg-accent" : "bg-accent/55",
      )}
      style={{ left: `${left}%`, width: `${width}%` }}
    >
      {s.ongoing && !s.approx ? (
        <span className="absolute -right-1.5 top-1/2 size-3.5 -translate-y-1/2 rounded-full border-2 border-surface bg-accent" />
      ) : null}
    </span>
  );
}

/** What a row says about its dates, in words. */
function whenText(s: ProjectSpan, year: number): string {
  if (s.approx) return Math.floor(s.end / 12) > year ? `${year} to ${Math.floor(s.end / 12)}, months unknown` : `Sometime in ${year}`;
  if (s.ongoing) return `Since ${monthLabel(s.start)}`;
  return dateRange(s.project.started, s.project.finished) || s.project.year;
}

type Bind = ReturnType<typeof useChartTip>["bind"];
const MONTH_PX = 44; // every month gets a readable label on phones
const NAME_W = 132;

/** Phones: the year's chart scrolls sideways under pinned project names, with
    every month labelled. Older years start folded. */
function PhoneGroup({ year, rows, from, to, toToday, open, hint, bind }: {
  year: number;
  rows: ProjectSpan[];
  from: number;
  to: number;
  toToday: boolean;
  open: boolean;
  hint: boolean;
  bind: Bind;
}) {
  const width = (to - from) * MONTH_PX;
  const months = Array.from({ length: to - from }, (_, i) => from + i);
  const scroller = useRef<HTMLDivElement>(null);
  // this year's projects cluster near today, so its chart opens at the right end
  const current = Math.floor(to / 12) === year && toToday;
  const settle = (): void => {
    const el = scroller.current;
    if (el && current) el.scrollLeft = el.scrollWidth;
  };
  useLayoutEffect(settle, [current]);
  return (
    <details open={open} onToggle={settle} className="group/y border-t border-line-strong">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-ink tabular">{year}</span>
        <span className="text-[0.8rem] text-ink-faint">{plural(rows.length, "project")}</span>
        {hint ? <span className="ml-auto hidden whitespace-nowrap text-[0.75rem] text-ink-faint group-open/y:inline">{current ? "← swipe" : "swipe →"}</span> : null}
        <span className={cn("text-ink-faint transition-transform group-open/y:rotate-180", !hint && "ml-auto")} aria-hidden>▾</span>
      </summary>
      <div ref={scroller} className="overflow-x-auto overscroll-x-contain pb-3">
        <div className="relative" style={{ width: NAME_W + width + 12 }}>
          {/* month grid behind the rows */}
          <div className="pointer-events-none absolute inset-y-0" style={{ left: NAME_W, width }} aria-hidden>
            {months.map((m) => (
              <div
                key={m}
                className={cn("absolute inset-y-0 border-l", m % 12 === 0 ? "border-line-strong" : "border-line", Math.floor(m / 12) % 2 === 1 && "bg-raised/50")}
                style={{ left: (m - from) * MONTH_PX, width: MONTH_PX }}
              />
            ))}
            {toToday ? <div className="absolute inset-y-0 right-0 border-r border-dashed border-accent" /> : null}
          </div>

          <div className="relative flex h-7 items-end" aria-hidden>
            <span className="sticky left-0 z-10 h-full shrink-0 bg-surface" style={{ width: NAME_W }} />
            {months.map((m) => (
              // the current month's slot carries the "today" label instead
              toToday && m === to - 1 ? null : <span
                key={m}
                className={cn("absolute bottom-1 text-[0.72rem] tabular", m % 12 === 0 && m !== from ? "font-semibold text-ink-dim" : "text-ink-faint")}
                style={{ left: NAME_W + (m - from) * MONTH_PX + 5 }}
              >
                {m % 12 === 0 && m !== from ? m / 12 : MONTHS[m % 12]}
              </span>
            ))}
            {toToday ? <span className="absolute right-4 bottom-1 text-[0.72rem] font-semibold text-accent">today</span> : null}
          </div>

          <ul>
            {rows.map((s) => {
              const months = s.end - s.start + 1;
              const when = whenText(s, year);
              return (
                <li key={s.project.id}>
                  <Link
                    to={`/projects/${s.project.id}`}
                    aria-label={`${s.project.title}: ${when}, ${lengthText(months)}. Opens the project.`}
                    className="relative flex h-10 items-center outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    {...bind(s.project.title, [{ label: when, value: "" }, { label: `${lengthText(months)}${s.ongoing ? " so far" : ""}`, value: "" }], (el) =>
                      el.querySelector("[data-bar]"),
                    )}
                  >
                    {/* pinned name; the shadow says the chart slides under it */}
                    <span
                      className="sticky left-0 z-10 flex h-full shrink-0 items-center bg-surface pr-2 shadow-[6px_0_8px_-6px_var(--rk-shadow)]"
                      style={{ width: NAME_W }}
                    >
                      <span className="line-clamp-2 text-[0.8rem] leading-tight text-ink-dim">{s.project.title}</span>
                    </span>
                    <span className="relative h-3" style={{ width }}>
                      <Bar s={s} from={from} to={to} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </details>
  );
}

/** Gantt grouped by the year each project started, newest first. Each year is
    zoomed to its own Jan-to-Dec axis so its bars use the full width. */
export function Timeline({ projects, className }: { projects: Project[]; className?: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const { armed, on } = useRevealOnce(bodyRef);
  const { tip, bind, onBodyPointerDown } = useChartTip(bodyRef);
  const plotRef = useRef<HTMLDivElement>(null);
  const plotW = useElementWidth(plotRef);
  const phone = useMediaQuery("(max-width: 639px)");

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
          <span className="h-3 w-6 rounded-full border border-dashed border-accent bg-accent/15" aria-hidden />
          Only the year is known
        </li>
      </ul>

      <div ref={plotRef} className="h-0 sm:ml-[14rem]" aria-hidden />
      {groups.map(([year, rows], gi) => {
        const from = year * 12;
        // the axis starts in January of the group's year and runs to the latest end in
        // the group (at least a full year), so every bar shows where it really ends
        const latest = Math.max(...rows.map((r) => r.end + 1));
        const to = Math.min(today + 1, Math.max(from + 12, latest));
        const toToday = to === today + 1;
        const pos = (m: number): number => ((m - from) / (to - from)) * 100;
        const perMonth = plotW / (to - from);
        const step = perMonth >= 34 ? 1 : perMonth >= 17 ? 2 : perMonth >= 11 ? 3 : 6;
        const ticks = Array.from({ length: to - from }, (_, i) => from + i).filter((m) => m % step === 0);
        const years = Array.from({ length: Math.ceil((to - from) / 12) }, (_, i) => year + i);
        if (phone)
          return <PhoneGroup key={year} year={year} rows={rows} from={from} to={to} toToday={toToday} open={gi === 0} hint={gi === 0} bind={bind} />;
        return (
          <section key={year} aria-label={`Started in ${year}`} className="relative">
            {/* this group's month grid, behind its rows */}
            <div className={PLOT} aria-hidden>
              {years.map((y, i) =>
                i % 2 === 1 ? (
                  <div
                    key={y}
                    className="absolute inset-y-0 bg-raised/50"
                    style={{ left: `${pos(y * 12)}%`, width: `${pos(Math.min((y + 1) * 12, to)) - pos(y * 12)}%` }}
                  />
                ) : null,
              )}
              {ticks.map((m) => {
                const x = (pos(m) / 100) * plotW;
                // keep labels clear of the "today" marker at the right edge
                const label = !(toToday && x > plotW - 24);
                return (
                  <div key={m} className={cn("absolute inset-y-0 border-l", m % 12 === 0 ? "border-line-strong" : "border-line")} style={{ left: `${pos(m)}%` }}>
                    {label ? (
                      <span className={cn("absolute top-5 left-1.5 text-[0.72rem] tabular max-sm:hidden", m % 12 === 0 && m !== from ? "font-semibold text-ink-dim" : "text-ink-faint")}>
                        {m % 12 === 0 && m !== from ? m / 12 : MONTHS[m % 12]}
                      </span>
                    ) : null}
                  </div>
                );
              })}
              {toToday ? (
                <div className="absolute inset-y-0 right-0 border-r border-dashed border-accent">
                  <span className="absolute top-0.5 right-1.5 text-[0.72rem] font-semibold text-accent max-sm:hidden">today</span>
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
                const when = whenText(s, year);
                return (
                  <li key={s.project.id}>
                    <Link
                      to={`/projects/${s.project.id}`}
                      aria-label={`${s.project.title}: ${when}, ${lengthText(months)}. Opens the project.`}
                      className="group relative grid items-center rounded-[3px] outline-none transition-colors hover:bg-raised focus-visible:ring-2 focus-visible:ring-accent sm:h-9 sm:grid-cols-[14rem_1fr] max-sm:py-1"
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
                      <span className="truncate pr-4 text-[0.85rem] sm:text-[0.9rem] text-ink-dim transition-colors group-hover:text-accent-ink group-focus-visible:text-accent-ink">
                        {s.project.title}
                      </span>
                      <span className="relative h-3.5 max-sm:mt-0.5">
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
