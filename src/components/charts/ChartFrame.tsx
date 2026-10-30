import type { PointerEvent, ReactNode, RefObject } from "react";
import { cn } from "../../utils/format";
import type { TipState } from "./tip";

export function Legend({ items, className }: { items: { label: string; color: string }[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-1.5 text-[0.88rem] text-ink-dim", className)}>
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: it.color }} aria-hidden />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function Tip({ tip }: { tip: TipState }) {
  return (
    <div
      className="pointer-events-none absolute z-10 w-max max-w-[220px] -translate-x-1/2 -translate-y-full rounded-[3px] border border-line-strong bg-raised px-3 py-2 shadow-card"
      style={{ left: tip.x, top: tip.y - 8 }}
      aria-hidden
    >
      <p className="text-[0.8rem] text-ink-faint">{tip.title}</p>
      <ul className="mt-1 space-y-0.5">
        {tip.rows.map((r) => (
          <li key={r.label} className="flex items-baseline gap-2 text-[0.85rem] leading-snug">
            {r.color ? <span className="h-[2px] w-3 shrink-0 -translate-y-[3px]" style={{ background: r.color }} /> : null}
            {r.value ? <span className="shrink-0 whitespace-nowrap font-semibold text-ink tabular">{r.value}</span> : null}
            <span className="min-w-0 text-ink-dim">{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Chart container: title, legend, plot (with tooltip), and a table view twin. */
export function ChartFrame({
  title,
  summary,
  legend,
  table,
  tip,
  bodyRef,
  onBodyPointerDown,
  armed,
  on,
  className,
  children,
}: {
  title: string;
  summary?: ReactNode;
  legend?: { label: string; color: string }[];
  table: ReactNode;
  tip: TipState | null;
  bodyRef: RefObject<HTMLDivElement>;
  onBodyPointerDown?: (e: PointerEvent<HTMLElement>) => void;
  armed?: boolean;
  on?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <figure
      className={cn("rounded-[4px] border border-line bg-surface p-5 sm:p-6", className)}
      data-armed={armed || undefined}
      data-on={on || undefined}
    >
      <figcaption>
        <h3 className="text-[1.15rem] font-bold leading-tight">{title}</h3>
        {summary ? <p className="mt-1 text-[0.92rem] text-ink-dim">{summary}</p> : null}
      </figcaption>
      {legend && legend.length > 1 ? <Legend items={legend} className="mt-4" /> : null}
      <div ref={bodyRef} className="relative mt-5" onPointerDown={onBodyPointerDown}>
        {children}
        {tip ? <Tip tip={tip} /> : null}
      </div>
      <details className="mt-4">
        <summary className="w-fit cursor-pointer py-1.5 text-[0.88rem] font-medium text-ink-faint transition-colors hover:text-ink">
          Show the numbers
        </summary>
        <div className="mt-3 overflow-x-auto">{table}</div>
      </details>
    </figure>
  );
}

/** Plain data table for a chart's table view. */
export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-[0.88rem]">
      <thead>
        <tr className="border-b border-line text-ink-faint">
          {head.map((h, i) => (
            <th key={h} scope="col" className={cn("py-1.5 pr-4 font-medium", i > 0 && "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-line last:border-b-0">
            {r.map((c, j) => (
              <td key={j} className={cn("py-1.5 pr-4 text-ink-dim", j > 0 && "text-right tabular")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
