import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useElementWidth, useRevealOnce } from "../../hooks";
import { dateRange } from "../../lib/portfolio";
import { fieldOfProject, projectSpans } from "../../lib/stats";
import type { Project } from "../../types";
import { ChartFrame, DataTable } from "./ChartFrame";
import { useChartTip } from "./tip";

const ROW = 22;
const BAR = 12;
const AXIS = 26;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (m: number): string => `${MONTHS[m % 12]} ${Math.floor(m / 12)}`;

/** Gantt view: when each project started and how long it ran. Bars dated only
    by year are dashed; running projects reach the "today" line. */
export function Timeline({ projects, className }: { projects: Project[]; className?: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(bodyRef);
  const { armed, on } = useRevealOnce(bodyRef);
  const { tip, bind, onBodyPointerDown } = useChartTip(bodyRef);
  const navigate = useNavigate();

  const spans = useMemo(() => projectSpans(projects), [projects]);
  const today = useMemo(() => {
    const d = new Date();
    return d.getFullYear() * 12 + d.getMonth();
  }, []);
  if (spans.length === 0) return null;

  const first = Math.floor(spans[0]!.start / 12) * 12;
  const last = Math.max(today, ...spans.map((s) => s.end)) + 1;
  const labelW = width < 560 ? 116 : 200;
  const plotW = Math.max(0, width - labelW - 6);
  const x = (m: number): number => labelW + ((m - first) / (last - first)) * plotW;
  const years = Array.from({ length: Math.ceil((last - first) / 12) }, (_, i) => first / 12 + i);
  const maxChars = Math.floor(labelW / 7.2);
  const longest = spans.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a), spans[0]!);
  const running = spans.filter((s) => s.ongoing).length;
  const fieldsUsed = [...new Map(spans.map((s) => fieldOfProject(s.project)).map((f) => [f.key, f])).values()];

  return (
    <ChartFrame
      title="Project timeline"
      summary={
        <>
          When each project started and how long it ran. {running} are still running; the longest so far is {longest.project.title}. Dashed bars
          only have a known year. Click a bar to open the project.
        </>
      }
      legend={fieldsUsed.map((f) => ({ label: f.label, color: f.color }))}
      tip={tip}
      bodyRef={bodyRef}
      onBodyPointerDown={onBodyPointerDown}
      armed={armed}
      on={on}
      className={className}
      table={
        <DataTable
          head={["Project", "Started", "Finished", "Months"]}
          rows={spans.map((s) => [
            s.project.title,
            s.project.started || s.project.year,
            s.ongoing ? "still running" : s.project.finished || s.project.year,
            s.end - s.start + 1,
          ])}
        />
      }
    >
      {width > 0 ? (
        <svg width={width} height={AXIS + spans.length * ROW} className="block" role="group" aria-label="Project timeline">
          {years.map((y) => (
            <g key={y}>
              <line x1={x(y * 12)} x2={x(y * 12)} y1={AXIS - 6} y2={AXIS + spans.length * ROW} stroke="var(--ch-grid)" strokeWidth={1} />
              <text x={x(y * 12) + 4} y={12} className="fill-ink-faint text-[11px] tabular">
                {y}
              </text>
            </g>
          ))}
          <line x1={x(today + 0.5)} x2={x(today + 0.5)} y1={AXIS - 6} y2={AXIS + spans.length * ROW} stroke="var(--rk-accent)" strokeWidth={1.5} strokeDasharray="3 3" />
          <text x={x(today + 0.5) - 4} y={12} textAnchor="end" className="fill-accent text-[11px] font-semibold">
            today
          </text>
          {spans.map((s, i) => {
            const f = fieldOfProject(s.project);
            const yMid = AXIS + i * ROW + ROW / 2;
            const x0 = x(s.start);
            const w = Math.max(4, x(s.end + 1) - x0);
            const months = s.end - s.start + 1;
            const when = s.ongoing
              ? `Since ${label(s.start)}`
              : dateRange(s.project.started, s.project.finished) || s.project.year;
            const name = s.project.title.length > maxChars ? `${s.project.title.slice(0, maxChars - 1)}…` : s.project.title;
            return (
              <g key={s.project.id}>
                <text x={0} y={yMid} dy="0.34em" className="fill-ink text-[12px] font-medium">
                  {name}
                </text>
                <g className="ch-grow-x" style={{ transitionDelay: `${Math.min(i, 40) * 18}ms` }}>
                  <rect
                    x={x0}
                    y={yMid - BAR / 2}
                    width={w}
                    height={BAR}
                    rx={3}
                    fill={f.color}
                    fillOpacity={s.approx ? 0.28 : 1}
                    stroke={s.approx ? f.color : "none"}
                    strokeDasharray={s.approx ? "3 2" : undefined}
                  />
                </g>
                <rect
                  x={0}
                  y={yMid - ROW / 2}
                  width={width}
                  height={ROW}
                  fill="transparent"
                  tabIndex={0}
                  role="link"
                  aria-label={`${s.project.title}: ${when}, ${months} months. Opens the project.`}
                  className="cursor-pointer outline-none focus-visible:stroke-accent"
                  onClick={() => navigate(`/projects/${s.project.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate(`/projects/${s.project.id}`);
                  }}
                  {...bind(s.project.title, [
                    { label: when, value: "", color: f.color },
                    { label: `${months} month${months === 1 ? "" : "s"}${s.ongoing ? " so far" : ""}${s.approx ? ", only the year is known" : ""}`, value: "" },
                    { label: `${f.label}, ${s.project.status}`, value: "" },
                  ])}
                />
              </g>
            );
          })}
        </svg>
      ) : (
        <div style={{ height: AXIS + spans.length * ROW }} />
      )}
    </ChartFrame>
  );
}
