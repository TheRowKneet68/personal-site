import { useCallback, useState, type FocusEvent, type PointerEvent, type RefObject } from "react";

export interface TipRow {
  color?: string;
  label: string;
  value: string;
}

export interface TipState {
  x: number;
  y: number;
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
      setTip({ x, y: Math.max(r.top - b.top, 0), title, rows });
    },
    [bodyRef],
  );

  const hide = useCallback(() => setTip(null), []);

  const bind = (title: string, rows: TipRow[]) => ({
    "data-hit": true,
    onPointerEnter: (e: PointerEvent<Element>) => show(e.currentTarget, title, rows),
    onPointerLeave: (e: PointerEvent<Element>) => {
      if (e.pointerType === "mouse") hide();
    },
    onFocus: (e: FocusEvent<Element>) => show(e.currentTarget, title, rows),
    onBlur: hide,
  });

  /** Put on the plot wrapper: tapping empty space dismisses a touch tooltip. */
  const onBodyPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (!(e.target as Element).closest("[data-hit]")) hide();
  };

  return { tip, bind, onBodyPointerDown };
}
