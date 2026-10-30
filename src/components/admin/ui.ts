/* Shared admin styles. Kept as strings so every editor (and sections.tsx) agrees. */
export const ui = {
  input:
    "h-10 w-full rounded-[4px] border border-field bg-bg px-3 text-[0.95rem] text-ink placeholder:text-ink-faint transition-colors focus:border-accent focus:outline-none",
  area: "w-full rounded-[4px] border border-field bg-bg px-3 py-2.5 text-[0.95rem] leading-relaxed text-ink placeholder:text-ink-faint transition-colors focus:border-accent focus:outline-none",
  label: "mb-1.5 block text-[0.88rem] font-medium text-ink-dim",
  hint: "mt-1.5 block text-[0.82rem] leading-snug text-ink-faint",
  primary:
    "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[4px] bg-accent-fill px-4 text-[0.9rem] font-semibold text-on-accent transition-[filter] hover:brightness-105 disabled:cursor-default disabled:bg-raised disabled:text-ink-faint disabled:hover:brightness-100",
  secondary:
    "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[4px] border border-line-strong px-3.5 text-[0.9rem] font-medium text-ink transition-colors hover:border-ink-faint disabled:cursor-default disabled:opacity-40",
  small:
    "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[4px] border border-line-strong px-2.5 text-[0.85rem] font-medium text-ink-dim transition-colors hover:border-ink-faint hover:text-ink disabled:cursor-default disabled:opacity-30",
  danger:
    "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[4px] border border-line-strong px-2.5 text-[0.85rem] font-medium text-warn transition-colors hover:border-warn disabled:opacity-30",
  icon: "grid size-8 shrink-0 cursor-pointer place-items-center rounded-[4px] text-ink-faint transition-colors hover:bg-raised hover:text-ink disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent",
  add: "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[4px] border border-dashed border-line-strong px-3.5 text-[0.9rem] font-medium text-ink-dim transition-colors hover:border-accent hover:text-ink",
  card: "rounded-[6px] border border-line bg-surface",
};

export function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}
