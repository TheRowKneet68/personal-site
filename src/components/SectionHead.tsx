import type { ReactNode } from "react";

/** Section title with its one-line purpose beside it on wide screens. */
export function SectionHead({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div className="grid gap-4 md:grid-cols-12 md:items-end md:gap-10">
      <h2 id={`${id}-title`} className="font-display t-h2 md:col-span-6">
        {title}
      </h2>
      {children ? <div className="max-w-[58ch] text-ink-dim md:col-span-6 md:pb-1.5">{children}</div> : null}
    </div>
  );
}
