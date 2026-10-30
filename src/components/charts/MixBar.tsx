import { useId, useRef } from "react";
import { useElementWidth, useRevealOnce } from "../../hooks";
import type { Field } from "../../lib/stats";
import { ChartFrame, DataTable } from "./ChartFrame";
import { useChartTip } from "./tip";

const BAR_H = 24;
const GAP = 2;

/** All-time share of projects per field: one 100% bar, labels under the segments. */
export function MixBar({ totals, className }: { totals: { field: Field; count: number }[]; className?: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(bodyRef);
  const { armed, on } = useRevealOnce(bodyRef);
  const { tip, bind, onBodyPointerDown } = useChartTip(bodyRef);
  const clipId = useId();
  const sum = totals.reduce((s, t) => s + t.count, 0);
  const lead = [...totals].sort((a, b) => b.count - a.count)[0];

  let x = 0;
  const segs = totals.map((t) => {
    const w = sum ? (t.count / sum) * width : 0;
    const seg = { ...t, x, w, pct: sum ? Math.round((t.count / sum) * 100) : 0 };
    x += w;
    return seg;
  });

  return (
    <ChartFrame
      title="Where the work lives"
      summary={lead && sum ? <>{lead.field.label} accounts for {Math.round((lead.count / sum) * 100)}% of all {sum} projects.</> : undefined}
      tip={tip}
      bodyRef={bodyRef}
      onBodyPointerDown={onBodyPointerDown}
      armed={armed}
      on={on}
      className={className}
      table={
        <DataTable head={["Field", "Projects", "Share"]} rows={segs.map((s) => [s.field.label, s.count, `${s.pct}%`])} />
      }
    >
      {width > 0 ? (
        <svg width={width} height={BAR_H} className="block" role="group" aria-label="Projects by field">
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={width} height={BAR_H} rx={4} />
            </clipPath>
          </defs>
          <g className="ch-wipe" clipPath={`url(#${clipId})`}>
            {segs.map((s, i) => (
              <rect
                key={s.field.key}
                x={s.x + (i > 0 ? GAP / 2 : 0)}
                y={0}
                width={Math.max(0, s.w - (i > 0 ? GAP / 2 : 0) - (i < segs.length - 1 ? GAP / 2 : 0))}
                height={BAR_H}
                fill={s.field.color}
                tabIndex={0}
                aria-label={`${s.field.label}: ${s.count} projects, ${s.pct}%`}
                className="outline-none focus-visible:stroke-ink"
                {...bind(s.field.label, [{ label: "projects", value: String(s.count), color: s.field.color }, { label: "of all work", value: `${s.pct}%` }])}
              />
            ))}
          </g>
        </svg>
      ) : (
        <div style={{ height: BAR_H }} />
      )}
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
        {segs.map((s) => (
          <li key={s.field.key} className="flex items-baseline gap-2 text-[0.88rem]">
            <span className="size-2.5 shrink-0 translate-y-[1px] rounded-[2px]" style={{ background: s.field.color }} aria-hidden />
            <span className="truncate text-ink-dim">{s.field.label}</span>
            <span className="ml-auto whitespace-nowrap font-semibold text-ink tabular">{s.count}</span>
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}
