import { useMemo, useRef } from "react";
import { useElementWidth, useRevealOnce } from "../../hooks";
import { clean, dateKey, formatDate, isPlacement, placeLabel, placementRank } from "../../lib/portfolio";
import type { Achievement } from "../../types";
import { ChartFrame, DataTable } from "./ChartFrame";
import { useChartTip } from "./tip";

const LANES = [
  { key: "first", name: "1st place", color: "var(--ch-1)", r: 7 },
  { key: "placed", name: "Other placements", color: "var(--ch-2)", r: 6 },
  { key: "record", name: "Certificates and roles", color: "var(--ch-other)", r: 5 },
] as const;

const LANE_H = 54;
const AXIS = 30;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const laneOf = (a: Achievement): number => (placementRank(a) === 1 ? 0 : isPlacement(a) ? 1 : 2);

/** Every achievement on one time axis, first places emphasised. */
export function AwardTimeline({ achievements, className }: { achievements: Achievement[]; className?: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(bodyRef);
  const { armed, on } = useRevealOnce(bodyRef);
  const { tip, bind, onBodyPointerDown } = useChartTip(bodyRef);

  const points = useMemo(
    () =>
      achievements
        .map((a) => ({ a, t: Date.parse(dateKey(a)), lane: laneOf(a) }))
        .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey(p.a)) && Number.isFinite(p.t))
        .sort((x, y) => x.t - y.t),
    [achievements],
  );

  if (points.length === 0) return null;

  const first = new Date(points[0]!.t);
  const last = new Date(points[points.length - 1]!.t);
  const start = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1);
  const end = Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 1);

  const narrow = width < 560;
  const left = narrow ? 0 : 168;
  const laneTop = (i: number): number => i * LANE_H + (narrow ? 18 : 0);
  const plotH = LANES.length * LANE_H + (narrow ? 18 : 0);
  const pad = 14;
  const x = (t: number): number => left + pad + ((t - start) / (end - start)) * Math.max(0, width - left - pad * 2);

  // months to tick: quarter starts on wide screens, half-years on narrow
  const ticks: { t: number; label: string }[] = [];
  for (let d = new Date(start); d.getTime() <= end; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const m = d.getUTCMonth();
    if (m % (narrow ? 6 : 3) === 0)
      ticks.push({ t: d.getTime(), label: m === 0 || ticks.length === 0 ? `${MONTHS[m]} ${d.getUTCFullYear()}` : MONTHS[m]! });
  }

  // same day, same lane: spread vertically so dots never sit on top of each other
  const slot = new Map<string, number>();
  const groups = new Map<string, number>();
  for (const p of points) groups.set(`${p.lane}|${p.t}`, (groups.get(`${p.lane}|${p.t}`) ?? 0) + 1);

  const firsts = points.filter((p) => p.lane === 0).length;
  const placed = points.filter((p) => p.lane < 2).length;

  return (
    <ChartFrame
      title="Competition timeline"
      summary={
        <>
          {placed} placements, {firsts} of them first place, plus {points.length - placed} certificates and roles.
        </>
      }
      legend={LANES.map((l) => ({ label: l.name, color: l.color }))}
      tip={tip}
      bodyRef={bodyRef}
      onBodyPointerDown={onBodyPointerDown}
      armed={armed}
      on={on}
      className={className}
      table={
        <DataTable
          head={["Date", "Result", "Event", "Project"]}
          rows={points.map((p) => [formatDate(p.a.date || p.a.year), isPlacement(p.a) ? placeLabel(p.a) : clean(p.a.result), clean(p.a.event), clean(p.a.title)])}
        />
      }
    >
      {width > 0 ? (
        <svg width={width} height={plotH + AXIS} className="block" role="group" aria-label="Achievements over time">
          {LANES.map((l, i) => (
            <g key={l.key}>
              <line x1={left} x2={width} y1={laneTop(i) + LANE_H / 2} y2={laneTop(i) + LANE_H / 2} stroke="var(--ch-grid)" strokeWidth={1} />
              <text
                x={narrow ? 0 : 0}
                y={narrow ? laneTop(i) - 4 : laneTop(i) + LANE_H / 2}
                dy={narrow ? 0 : "0.34em"}
                className="fill-ink-dim text-[12.5px] font-medium"
              >
                {l.name}
              </text>
            </g>
          ))}

          {ticks.map((tk) => (
            <g key={tk.t}>
              <line x1={x(tk.t)} x2={x(tk.t)} y1={0} y2={plotH} stroke="var(--ch-grid)" strokeWidth={1} />
              <text x={x(tk.t)} y={plotH + 19} textAnchor="middle" className="fill-ink-faint text-[11px] tabular">
                {tk.label}
              </text>
            </g>
          ))}

          {points.map((p, i) => {
            const key = `${p.lane}|${p.t}`;
            const n = groups.get(key) ?? 1;
            const k = slot.get(key) ?? 0;
            slot.set(key, k + 1);
            const lane = LANES[p.lane]!;
            const cx = x(p.t);
            const cy = laneTop(p.lane) + LANE_H / 2 + (k - (n - 1) / 2) * 13;
            const result = isPlacement(p.a) ? placeLabel(p.a) : clean(p.a.result);
            const event = clean(p.a.event);
            return (
              <g key={p.a.id} className="ch-pop" style={{ transitionDelay: `${i * 40}ms` }}>
                <circle cx={cx} cy={cy} r={lane.r} fill={lane.color} stroke="var(--rk-surface)" strokeWidth={2} />
                <circle
                  cx={cx}
                  cy={cy}
                  r={12}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${result}, ${event}, ${formatDate(p.a.date || p.a.year)}`}
                  className="outline-none focus-visible:stroke-accent"
                  {...bind(formatDate(p.a.date || p.a.year), [
                    { label: event, value: result, color: lane.color },
                    { label: clean(p.a.title), value: "" },
                  ])}
                />
              </g>
            );
          })}
        </svg>
      ) : (
        <div style={{ height: plotH + AXIS }} />
      )}
    </ChartFrame>
  );
}
