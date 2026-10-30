import { statusMeta } from "../lib/constants";
import { cn } from "../utils/format";

const sentence = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Project status as text with a small tone marker (filled = done/notable,
    hollow = still moving, grey = plain record). */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta(status);
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap text-[0.875rem] text-ink-dim", className)}>
      <span
        className={cn(
          "size-2 shrink-0 rounded-[1px]",
          meta.tone === "accent" && "bg-accent",
          meta.tone === "moving" && "border-[1.5px] border-accent",
          meta.tone === "muted" && "bg-ink-faint",
        )}
        aria-hidden
      />
      {sentence(meta.label)}
    </span>
  );
}

/** Tech used, as a quiet inline list. */
export function TechList({ items, className }: { items: string[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-x-2 gap-y-1 text-[0.875rem] text-ink-dim", className)}>
      {items.map((t, i) => (
        <li key={t} className="whitespace-nowrap">
          {t}
          {i < items.length - 1 ? <span className="text-line-strong" aria-hidden>,</span> : null}
        </li>
      ))}
    </ul>
  );
}
