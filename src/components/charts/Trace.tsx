import { useRef, useState } from "react";
import { useElementWidth } from "../../hooks";
import { ALL_FIELDS, type YearRow } from "../../lib/stats";
import { Tip } from "./ChartFrame";
import { useChartTip } from "./tip";

const H = 150;
const TOP = 26;
const BOTTOM = 26;
const PAD = 16;

/** Hero trace: projects per year drawn like a scope channel. Hover, focus or tap
    a year to see its count and the split by field. */
export function Trace({ rows }: { rows: YearRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref);
  const { tip, bind, onBodyPointerDown } = useChartTip(ref);
  const [active, setActive] = useState<number | null>(null);
  const n = rows.length;
  const max = Math.max(1, ...rows.map((r) => r.total));
  const x = (i: number): number => (n > 1 ? PAD + (i * (width - PAD * 2)) / (n - 1) : width / 2);
  const y = (v: number): number => TOP + (1 - v / max) * (H - TOP - BOTTOM);
  const line = rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r.total).toFixed(1)}`).join("");
  const base = H - BOTTOM;
  const area = n ? `${line}L${x(n - 1).toFixed(1)},${base}L${x(0).toFixed(1)},${base}Z` : "";
  const lastRow = rows[n - 1];
  const summary = rows.map((r) => `${r.year}: ${r.total}`).join(", ");
  const colW = n > 1 ? (width - PAD * 2) / (n - 1) : width;

  return (
    <div
      ref={ref}
      className="relative w-full"
      onPointerDown={onBodyPointerDown}
      onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
    >
      {width > 0 && n > 1 ? (
        <svg width={width} height={H} className="block overflow-visible" role="group" aria-label={`Projects per year. ${summary}`}>
          <line x1={0} x2={width} y1={base} y2={base} stroke="var(--rk-border-strong)" strokeWidth={1} />
          {/* fillOpacity, not opacity: the fade-in animates opacity and would flash the area solid */}
          <path d={area} fill="var(--rk-accent)" fillOpacity={0.08} className="rk-late" />
          <path
            d={line}
            fill="none"
            stroke="var(--rk-accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            className="rk-draw"
          />
          {active !== null ? (
            <line x1={x(active)} x2={x(active)} y1={TOP - 8} y2={base} stroke="var(--rk-accent)" strokeWidth={1} strokeDasharray="2 3" />
          ) : null}
          {rows.map((r, i) => (
            <g key={r.year} className="rk-late">
              <circle data-point={i} cx={x(i)} cy={y(r.total)} r={active === i ? 6 : 4} fill="var(--rk-accent)" stroke="var(--rk-surface)" strokeWidth={2} />
              <text x={x(i)} y={H - 6} textAnchor="middle" className={active === i ? "fill-ink text-[11px] font-semibold tabular" : "fill-ink-faint text-[11px] tabular"}>
                {r.year}
              </text>
            </g>
          ))}
          {lastRow && active === null ? (
            <text x={x(n - 1)} y={y(lastRow.total) - 12} textAnchor="end" className="rk-late fill-ink text-[13px] font-semibold tabular">
              {lastRow.total} in {lastRow.year}
            </text>
          ) : null}
          {rows.map((r, i) => {
            const fields = ALL_FIELDS.filter((f) => (r.counts[f.key] ?? 0) > 0);
            const hit = bind(
              String(r.year),
              [
                { label: r.total === 1 ? "project" : "projects", value: String(r.total) },
                ...fields.map((f) => ({ label: f.label, value: String(r.counts[f.key]), color: f.color })),
              ],
              (el) => el.ownerSVGElement?.querySelector(`[data-point="${i}"]`) ?? null,
            );
            return (
              <rect
                key={r.year}
                x={Math.max(0, x(i) - colW / 2)}
                y={0}
                width={i === 0 || i === n - 1 ? colW / 2 + PAD : colW}
                height={H}
                fill="transparent"
                tabIndex={0}
                aria-label={`${r.year}: ${r.total} projects`}
                className="cursor-default outline-none focus-visible:stroke-accent"
                {...hit}
                onPointerEnter={(e) => {
                  setActive(i);
                  hit.onPointerEnter(e);
                }}
                onFocus={(e) => {
                  setActive(i);
                  hit.onFocus(e);
                }}
                onBlur={() => {
                  setActive(null);
                  hit.onBlur();
                }}
              />
            );
          })}
        </svg>
      ) : (
        <div style={{ height: H }} />
      )}
      {tip ? <Tip tip={tip} /> : null}
    </div>
  );
}
