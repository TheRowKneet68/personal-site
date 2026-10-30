import { useRef } from "react";
import { useElementWidth } from "../../hooks";
import type { YearRow } from "../../lib/stats";

const H = 150;
const TOP = 26;
const BOTTOM = 26;
const PAD = 16;

/** Hero trace: projects per year drawn like a scope channel. Real data, one line. */
export function Trace({ rows }: { rows: YearRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref);
  const n = rows.length;
  const max = Math.max(1, ...rows.map((r) => r.total));
  const x = (i: number): number => (n > 1 ? PAD + (i * (width - PAD * 2)) / (n - 1) : width / 2);
  const y = (v: number): number => TOP + (1 - v / max) * (H - TOP - BOTTOM);
  const line = rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r.total).toFixed(1)}`).join("");
  const base = H - BOTTOM;
  const area = n ? `${line}L${x(n - 1).toFixed(1)},${base}L${x(0).toFixed(1)},${base}Z` : "";
  const lastRow = rows[n - 1];
  const summary = rows.map((r) => `${r.year}: ${r.total}`).join(", ");

  return (
    <div ref={ref} className="w-full">
      {width > 0 && n > 1 ? (
        <svg width={width} height={H} className="block overflow-visible" role="img" aria-label={`Projects per year. ${summary}`}>
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
          {rows.map((r, i) => (
            <g key={r.year} className="rk-late">
              <circle cx={x(i)} cy={y(r.total)} r={4} fill="var(--rk-accent)" stroke="var(--rk-surface)" strokeWidth={2} />
              <text x={x(i)} y={H - 6} textAnchor="middle" className="fill-ink-faint text-[11px] tabular">
                {r.year}
              </text>
            </g>
          ))}
          {lastRow ? (
            <text x={x(n - 1)} y={y(lastRow.total) - 12} textAnchor="end" className="rk-late fill-ink text-[13px] font-semibold tabular">
              {lastRow.total} in {lastRow.year}
            </text>
          ) : null}
        </svg>
      ) : (
        <div style={{ height: H }} />
      )}
    </div>
  );
}
