import type { ReactNode } from "react";
import { cn } from "../utils/format";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: "accent" | "warn" | "muted" }> = {
    "award-winning": { label: "award-winning", tone: "accent" },
    shipped: { label: "shipped", tone: "muted" },
    "market-launched": { label: "on the market", tone: "accent" },
    "major project": { label: "major project", tone: "accent" },
    "in development": { label: "in development", tone: "warn" },
    "in progress": { label: "in progress", tone: "warn" },
    concept: { label: "concept", tone: "warn" },
    experimental: { label: "experimental", tone: "warn" },
    prototype: { label: "prototype", tone: "warn" },
    built: { label: "built", tone: "muted" },
    tool: { label: "tool", tone: "muted" },
    fun: { label: "fun build", tone: "muted" },
    freelance: { label: "freelance", tone: "accent" },
    academic: { label: "academic", tone: "warn" },
    completed: { label: "completed", tone: "muted" },
  };
  const meta = map[status] ?? { label: status, tone: "muted" as const };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.14em]",
        meta.tone === "accent" && "border-accent/40 text-accent-ink",
        meta.tone === "warn" && "border-warn/40 text-warn",
        meta.tone === "muted" && "border-line-strong text-ink-faint",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {meta.label}
    </span>
  );
}

export function TechChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-sm border border-line bg-surface px-2 py-0.5 font-mono text-[0.7rem] text-ink-dim">
      {children}
    </span>
  );
}
