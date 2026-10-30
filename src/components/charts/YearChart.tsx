import { useRef } from "react";
import { useElementWidth, useRevealOnce } from "../../hooks";
import { niceScale, type Field, type YearRow } from "../../lib/stats";
import { ChartFrame, DataTable } from "./ChartFrame";
import { useChartTip } from "./tip";
import { roundTop } from "./geometry";

const PLOT_H = 220;
const TOP = 22;
const AXIS = 30;
const LEFT = 30;
const GAP = 2;

/** Projects per year, stacked by field. */
export function YearChart({ rows, fields, className }: { rows: YearRow[]; fields: Field[]; className?: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(bodyRef);
  const { armed, on } = useRevealOnce(bodyRef);
  const { tip, bind, onBodyPointerDown } = useChartTip(bodyRef);

  const used = fields.filter((f) => rows.some((r) => (r.counts[f.key] ?? 0) > 0));
  const { max, step } = niceScale(Math.max(1, ...rows.map((r) => r.total)), 4);
  const plotW = Math.max(0, width - LEFT);
  const band = rows.length ? plotW / rows.length : 0;
  const barW = Math.min(24, band * 0.55);
  const y = (v: number): number => TOP + (1 - v / max) * PLOT_H;
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
  const busiest = rows.reduce((a, b) => (b.total > a.total ? b : a), rows[0] ?? { year: 0, total: 0, counts: {} });

  return (
    <ChartFrame
      title="Projects per year, by field"
      summary={
        busiest.total > 0 ? (
          <>
            {busiest.year} was the busiest year, with {busiest.total} projects.
          </>
        ) : undefined
      }
      legend={used.map((f) => ({ label: f.label, color: f.color }))}
      tip={tip}
      bodyRef={bodyRef}
      onBodyPointerDown={onBodyPointerDown}
      armed={armed}
      on={on}
      className={className}
      table={
        <DataTable
          head={["Year", ...used.map((f) => f.label), "Total"]}
          rows={rows.map((r) => [String(r.year), ...used.map((f) => r.counts[f.key] ?? 0), r.total])}
        />
      }
    >
      {width > 0 ? (
        <svg width={width} height={TOP + PLOT_H + AXIS} className="block overflow-visible" role="group" aria-label="Projects per year">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={LEFT} x2={width} y1={y(t)} y2={y(t)} stroke="var(--ch-grid)" strokeWidth={1} />
              <text x={LEFT - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-faint text-[11px] tabular">
                {t}
              </text>
            </g>
          ))}

          {rows.map((r, i) => {
            const cx = LEFT + band * (i + 0.5);
            const x = cx - barW / 2;
            const segs = used.filter((f) => (r.counts[f.key] ?? 0) > 0);
            let acc = 0;
            const top = segs[segs.length - 1];
            const label = `${r.year}: ${r.total} ${r.total === 1 ? "project" : "projects"}. ${segs
              .map((f) => `${f.label} ${r.counts[f.key]}`)
              .join(", ")}`;
            return (
              <g key={r.year}>
                <g className="ch-grow" style={{ transitionDelay: `${i * 80}ms` }}>
                  {segs.map((f) => {
                    const v = r.counts[f.key] ?? 0;
                    const y0 = y(acc + v);
                    const h = (v / max) * PLOT_H;
                    acc += v;
                    const isTop = f === top;
                    const hh = Math.max(0, isTop ? h : h - GAP);
                    const yy = isTop ? y0 : y0 + GAP;
                    return isTop ? (
                      <path key={f.key} d={roundTop(x, yy, barW, hh, 4)} fill={f.color} />
                    ) : (
                      <rect key={f.key} x={x} y={yy} width={barW} height={hh} fill={f.color} />
                    );
                  })}
                </g>
                {r.total > 0 ? (
                  <text x={cx} y={y(r.total) - 8} textAnchor="middle" className="ch-fade fill-ink text-[12px] font-semibold tabular">
                    {r.total}
                  </text>
                ) : null}
                <text x={cx} y={TOP + PLOT_H + 20} textAnchor="middle" className="fill-ink-faint text-[12px] tabular">
                  {r.year}
                </text>
                <rect
                  x={cx - band / 2}
                  y={TOP - 10}
                  width={band}
                  height={PLOT_H + 10}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={label}
                  className="cursor-default outline-none focus-visible:stroke-accent"
                  {...bind(
                    String(r.year),
                    [
                      { label: "projects in total", value: String(r.total) },
                      ...segs.map((f) => ({ label: f.label, value: String(r.counts[f.key]), color: f.color })),
                    ],
                  )}
                />
              </g>
            );
          })}
          <line x1={LEFT} x2={width} y1={y(0)} y2={y(0)} stroke="var(--rk-border-strong)" strokeWidth={1} />
        </svg>
      ) : (
        <div style={{ height: TOP + PLOT_H + AXIS }} />
      )}
    </ChartFrame>
  );
}
