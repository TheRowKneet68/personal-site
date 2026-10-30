import { useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useElementWidth, useRevealOnce } from "../../hooks";
import { dateRange } from "../../lib/portfolio";
import { fieldOfProject, projectSpans } from "../../lib/stats";
import type { Project } from "../../types";
import { ChartFrame, DataTable } from "./ChartFrame";
import { useChartTip } from "./tip";

const ROW = 40; // name line + bar
const BAR = 10;
const AXIS = 30;
const RECENT = 16;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m: number): string => `${MONTHS[m % 12]} ${Math.floor(m / 12)}`;
const plural = (n: number, w: string): string => `${n} ${w}${n === 1 ? "" : "s"}`;
const lengthText = (months: number): string => {
  if (months < 12) return plural(months, "month");
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${plural(y, "year")} ${plural(m, "month")}` : plural(y, "year");
};

/** Gantt view in one colour: soft = finished, solid = still running (with a dot
    at today), hatched = only the year is known. Names sit on their own bars. */
export function Timeline({ projects, className }: { projects: Project[]; className?: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(bodyRef);
  const { armed, on } = useRevealOnce(bodyRef);
  const { tip, bind, onBodyPointerDown } = useChartTip(bodyRef);
  const navigate = useNavigate();
  const hatch = useId().replace(/:/g, "");
  const [all, setAll] = useState(false);

  const spans = useMemo(() => projectSpans(projects), [projects]);
  const today = useMemo(() => {
    const d = new Date();
    return d.getFullYear() * 12 + d.getMonth();
  }, []);
  if (spans.length === 0) return null;

  const shown = all ? spans : spans.slice(-RECENT);
  const first = Math.floor(Math.min(...shown.map((s) => s.start)) / 12) * 12;
  const last = today + 1; // the axis ends today
  const short = last - first <= 30; // under ~2.5 years: label the quarters too
  const x = (m: number): number => ((m - first) / (last - first)) * width;
  const years = Array.from({ length: Math.ceil((last - first) / 12) }, (_, i) => first / 12 + i);
  const quarters = short ? Array.from({ length: last - first }, (_, i) => first + i).filter((m) => m % 3 === 0) : [];
  const CHAR = 7.4; // generous width per character at 12.5px, so labels never overflow
  const running = spans.filter((s) => s.ongoing).length;
  const height = AXIS + shown.length * ROW;

  return (
    <ChartFrame
      title="Project timeline"
      summary={
        <>
          When each project started and how long it ran. {running} are still running. Hover for dates, click to open a project.
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[0.85rem] text-ink-dim">
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-6 rounded-full bg-accent opacity-45" aria-hidden />
            Finished
          </li>
          <li className="flex items-center gap-2">
            <span className="relative h-2.5 w-6 rounded-full bg-accent" aria-hidden>
              <span className="absolute -right-1 top-1/2 size-2.5 -translate-y-1/2 rounded-full border-2 border-surface bg-accent" />
            </span>
            Still running
          </li>
          <li className="flex items-center gap-2">
            <span
              className="h-2.5 w-6 rounded-full border border-accent/60"
              style={{ backgroundImage: "repeating-linear-gradient(135deg, var(--rk-accent) 0 2px, transparent 2px 5px)", opacity: 0.6 }}
              aria-hidden
            />
            Only the year is known
          </li>
        </ul>
        {spans.length > RECENT ? (
          <button type="button" onClick={() => setAll((v) => !v)} className="link py-1 font-medium text-ink">
            {all ? `Show the ${RECENT} most recent` : `Show all ${spans.length}`}
          </button>
        ) : null}
      </div>

      {width > 0 ? (
        <svg width={width} height={height} className="block" role="group" aria-label="Project timeline">
          <defs>
            <pattern id={hatch} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="var(--rk-accent)" fillOpacity={0.12} />
              <rect width="2" height="5" fill="var(--rk-accent)" fillOpacity={0.55} />
            </pattern>
          </defs>

          {/* year bands */}
          {years.map((y, i) => (
            <g key={y}>
              {i % 2 === 0 ? <rect x={x(y * 12)} y={0} width={Math.min(width, x((y + 1) * 12)) - x(y * 12)} height={height} fill="var(--rk-raised)" opacity={0.7} /> : null}
              <text x={x(y * 12) + 6} y={14} className="fill-ink-dim text-[12px] font-semibold tabular">
                {y}
              </text>
            </g>
          ))}
          {quarters.map((m) =>
            m % 12 === 0 || Math.abs(x(m) - x(today + 1)) < 56 ? null : (
              <text key={m} x={x(m) + 6} y={26} className="fill-ink-faint text-[10.5px]">
                {MONTHS[m % 12]}
              </text>
            ),
          )}
          <line x1={x(today + 1) - 1} x2={x(today + 1) - 1} y1={AXIS - 4} y2={height} stroke="var(--rk-accent)" strokeWidth={1} strokeDasharray="2 4" opacity={0.8} />
          <text x={x(today + 1) - 6} y={26} textAnchor="end" className="fill-accent text-[10.5px] font-semibold">
            today
          </text>

          {shown.map((s, i) => {
            const f = fieldOfProject(s.project);
            const top = AXIS + i * ROW;
            const x0 = Math.min(x(s.start), width - BAR);
            const w = Math.max(BAR, Math.min(width, x(s.end + 1)) - x0);
            const months = s.end - s.start + 1;
            const when = s.ongoing ? `Since ${monthLabel(s.start)}` : dateRange(s.project.started, s.project.finished) || s.project.year;
            // the name starts at the bar; if it would run off the right edge it ends at the bar's end instead,
            // and very long names are shortened so they never leave the chart
            const suffix = s.ongoing ? "running" : lengthText(months);
            const room = Math.floor(width / CHAR) - suffix.length - 2;
            const title = s.project.title.length > room ? `${s.project.title.slice(0, Math.max(6, room - 1))}…` : s.project.title;
            const nameW = (title.length + suffix.length + 1) * CHAR;
            // start at the bar, but slide left just enough to stay inside the chart
            const labelX = Math.max(0, Math.min(x0, width - nameW));
            const barY = top + 22;
            return (
              <g key={s.project.id}>
                <text x={labelX} y={top + 13} className="text-[12.5px]">
                  <tspan className="fill-ink font-medium">{title}</tspan>
                  <tspan className="fill-ink-faint" dx={6}>
                    {suffix}
                  </tspan>
                </text>
                <g className="ch-grow-x" style={{ transitionDelay: `${Math.min(i, 24) * 22}ms` }}>
                  <rect
                    x={x0}
                    y={barY}
                    width={w}
                    height={BAR}
                    rx={BAR / 2}
                    fill={s.approx ? `url(#${hatch})` : "var(--rk-accent)"}
                    fillOpacity={s.approx || s.ongoing ? 1 : 0.45}
                  />
                  {s.ongoing ? <circle cx={x0 + w} cy={barY + BAR / 2} r={5} fill="var(--rk-accent)" stroke="var(--rk-surface)" strokeWidth={2} /> : null}
                </g>
                <rect
                  x={0}
                  y={top}
                  width={width}
                  height={ROW}
                  fill="transparent"
                  tabIndex={0}
                  role="link"
                  aria-label={`${s.project.title}: ${when}, ${lengthText(months)}. Opens the project.`}
                  className="cursor-pointer outline-none focus-visible:stroke-accent"
                  onClick={() => navigate(`/projects/${s.project.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate(`/projects/${s.project.id}`);
                  }}
                  {...bind(
                    s.project.title,
                    [
                      { label: when, value: "" },
                      { label: `${lengthText(months)}${s.ongoing ? " so far" : ""}${s.approx ? ", only the year is known" : ""}`, value: "" },
                      { label: `${f.label}, ${s.project.status}`, value: "" },
                    ],
                    (el) => el.parentElement?.querySelector("rect:not([role])") ?? null,
                  )}
                />
              </g>
            );
          })}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
    </ChartFrame>
  );
}
