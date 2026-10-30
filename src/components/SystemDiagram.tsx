import { useEffect, useRef, useState, type RefObject } from "react";
import { useRevealOnce } from "../hooks";
import type { Diagram } from "../lib/diagrams";
import { cn } from "../utils/format";

// Rough px a lane needs side by side: nodes at their min width plus wires,
// labelled wires as wide as their mono label.
const NODE_MIN = 104;
const laneWidth = (lane: Diagram["lanes"][number]): number =>
  lane.nodes.length * NODE_MIN +
  lane.links.slice(0, lane.nodes.length - 1).reduce((sum, via) => sum + Math.max(56, via ? via.length * 7.2 + 22 : 0), 0);

/** Stack the whole figure vertically when its longest lane can't fit across.
    Starts from an estimate, then learns from real overflow (long words can make
    a node wider than the estimate) so a lane never spills off a phone screen. */
function useStack(ref: RefObject<HTMLElement | null>, diagram: Diagram): boolean {
  const [stack, setStack] = useState(false);
  const need = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    need.current = Math.max(...diagram.lanes.map(laneWidth)) + 64; // + board padding
    setStack(el.getBoundingClientRect().width < need.current); // don't wait for the first observer frame
    const ro = new ResizeObserver(([entry]) => setStack((entry?.contentRect.width ?? need.current) < need.current));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, diagram]);
  useEffect(() => {
    const el = ref.current;
    if (stack || !el) return;
    const spills = [...el.querySelectorAll(".sd-chain")].some((c) => c.scrollWidth > c.clientWidth + 1);
    if (spills) {
      need.current = Math.max(need.current, el.getBoundingClientRect().width + 1);
      setStack(true);
    }
  });
  return stack;
}

export function SystemDiagram({
  diagram,
  title,
  compact = false,
  animate = true,
  className,
}: {
  diagram: Diagram;
  title: string;
  compact?: boolean;
  /** false: draw immediately (admin previews). */
  animate?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const { armed, on } = useRevealOnce(ref);
  const drawClass = animate ? cn(armed && "is-armed", on && "is-on") : undefined;
  const stack = useStack(ref, diagram);
  let wireIndex = 0;

  return (
    <figure
      ref={ref}
      className={cn("sd-figure", drawClass, className)}
      data-stack={stack || undefined}
      aria-label={`${title} system diagram`}
    >
      <div className={cn("perfboard rounded-[3px] border border-line", compact ? "p-4 sm:p-5" : "p-5 sm:p-7")}>
        <ol className={cn("grid", compact ? "gap-5" : "gap-7")}>
          {diagram.lanes.map((lane) => (
            <li key={lane.name} className="sd-lane">
              <p className="label mb-2">{lane.name}</p>
              <div className="sd-chain">
                {lane.nodes.map((node, i) => {
                  const via = i < lane.links.length ? lane.links[i] : undefined;
                  const idx = wireIndex++;
                  return (
                    <div key={`${node.name}-${i}`} className="contents">
                      <div className="sd-node">
                        <p className={cn("font-semibold leading-tight text-ink", node.part ? "part text-[0.9rem]" : "text-[0.95rem]")}>
                          {node.name}
                        </p>
                        {node.role ? <p className="mt-0.5 text-[0.8rem] leading-snug text-ink-dim">{node.role}</p> : null}
                      </div>
                      {i < lane.nodes.length - 1 ? (
                        <div className="sd-wire" style={{ ["--sd-i" as string]: idx }} aria-hidden={!via}>
                          {via ? <span className="sd-via">{via}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="mt-3 max-w-[62ch] text-[0.92rem] leading-relaxed text-ink-dim">
        {diagram.caption}{" "}
        <span className="text-ink-faint">Simplified diagram, drawn from the project notes.</span>
      </figcaption>
    </figure>
  );
}
