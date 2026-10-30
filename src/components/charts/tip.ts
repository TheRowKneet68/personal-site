import { useCallback, useState, type FocusEvent, type PointerEvent, type RefObject } from "react";

export interface TipRow {
  color?: string;
  label: string;
  value: string;
}

export interface TipState {
  x: number;
  y: number;
  /** set when the tooltip opens below the mark: its top edge */
  below?: number;
  title: string;
  rows: TipRow[];
}

/** One tooltip per chart, anchored above the hovered/focused mark. Touch: a tap
    shows it, a tap on empty plot area hides it. */
export function useChartTip(bodyRef: RefObject<HTMLElement | null>) {
  const [tip, setTip] = useState<TipState | null>(null);

  const show = useCallback(
    (target: Element, title: string, rows: TipRow[]) => {
      const body = bodyRef.current;
      if (!body) return;
      const b = body.getBoundingClientRect();
      const r = target.getBoundingClientRect();
      const half = Math.min(110, b.width / 2);
      const x = Math.min(Math.max(r.left + r.width / 2 - b.left, half), b.width - half);
      // flip below the mark when there isn't room above it inside the chart
      const top = r.top - b.top;
      setTip({ x, y: Math.max(top, 0), below: top < 96 ? r.bottom - b.top : undefined, title, rows });
    },
    [bodyRef],
  );

  const hide = useCallback(() => setTip(null), []);

  /** `anchor` points the tooltip at a different element than the hit area (e.g. a data point). */
  const bind = (title: string, rows: TipRow[], anchor?: (hit: Element) => Element | null) => ({
    "data-hit": true,
    onPointerEnter: (e: PointerEvent<Element>) => show(anchor?.(e.currentTarget) ?? e.currentTarget, title, rows),
    onPointerLeave: (e: PointerEvent<Element>) => {
      if (e.pointerType === "mouse") hide();
    },
    onFocus: (e: FocusEvent<Element>) => show(anchor?.(e.currentTarget) ?? e.currentTarget, title, rows),
    onBlur: hide,
  });

  /** Put on the plot wrapper: tapping empty space dismisses a touch tooltip. */
  const onBodyPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (!(e.target as Element).closest("[data-hit]")) hide();
  };

  return { tip, bind, onBodyPointerDown };
}
