import { useRef } from "react";
import { useElementWidth, useRevealOnce } from "../../hooks";
import type { PartUse } from "../../lib/portfolio";
import { ChartFrame, DataTable } from "./ChartFrame";
import { roundRight } from "./geometry";
import { useChartTip } from "./tip";

const ROW = 32;
const BAR = 12;
const looksLikePart = (s: string): boolean => /\d/.test(s) || /^[A-Z0-9-]{2,}$/.test(s);

/** Most-used parts and tools, one bar per part, value at the tip. Single series. */
export function PartsChart({ parts, className }: { parts: PartUse[]; className?: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(bodyRef);
  const { armed, on } = useRevealOnce(bodyRef);
  const { tip, bind, onBodyPointerDown } = useChartTip(bodyRef);

  const labelW = width < 420 ? 104 : 132;
  const max = Math.max(1, ...parts.map((p) => p.projects.length));
  const plotW = Math.max(0, width - labelW - 34);
  const top = parts[0];

  return (
    <ChartFrame
      title="Most-used parts and tools"
      summary={top ? <>Counted across every project. {top.name} shows up in {top.projects.length} of them.</> : undefined}
      tip={tip}
      bodyRef={bodyRef}
      onBodyPointerDown={onBodyPointerDown}
      armed={armed}
      on={on}
      className={className}
      table={
        <DataTable
          head={["Part or tool", "Projects"]}
          rows={parts.map((p) => [`${p.name} (${p.projects.map((x) => x.title).join(", ")})`, p.projects.length])}
        />
      }
    >
      {width > 0 ? (
        <svg width={width} height={parts.length * ROW} className="block" role="group" aria-label="Projects per part">
          {parts.map((p, i) => {
            const n = p.projects.length;
            const w = (n / max) * plotW;
            const yMid = i * ROW + ROW / 2;
            return (
              <g key={p.name}>
                <text
                  x={0}
                  y={yMid}
                  dy="0.34em"
                  className={`fill-ink text-[13px] ${looksLikePart(p.name) ? "font-mono text-[12px]" : "font-medium"}`}
                >
                  {p.name.length > 18 ? `${p.name.slice(0, 17)}…` : p.name}
                </text>
                <g className="ch-grow-x" style={{ transitionDelay: `${i * 45}ms` }}>
                  <path d={roundRight(labelW, yMid - BAR / 2, Math.max(2, w), BAR, 4)} fill="var(--ch-1)" />
                </g>
                <text x={labelW + w + 8} y={yMid} dy="0.34em" className="ch-fade fill-ink-dim text-[12px] font-semibold tabular">
                  {n}
                </text>
                <rect
                  x={0}
                  y={i * ROW}
                  width={width}
                  height={ROW}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${p.name}: used in ${n} projects, ${p.projects.map((x) => x.title).join(", ")}`}
                  className="outline-none focus-visible:stroke-accent"
                  {...bind(p.name, [
                    { label: n === 1 ? "project" : "projects", value: String(n), color: "var(--ch-1)" },
                    ...p.projects.slice(0, 4).map((x) => ({ label: x.title, value: "" })),
                  ])}
                />
              </g>
            );
          })}
        </svg>
      ) : (
        <div style={{ height: parts.length * ROW }} />
      )}
    </ChartFrame>
  );
}
