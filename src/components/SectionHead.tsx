import type { ReactNode } from "react";
import { EditLink } from "./EditLink";

/** Section title with its one-line purpose beside it on wide screens. */
/** `edit` = the admin section to open from the Edit link (shown only when logged in). */
export function SectionHead({ id, title, edit, children }: { id: string; title: string; edit?: string; children?: ReactNode }) {
  return (
    <div className="grid gap-4 md:grid-cols-12 md:items-end md:gap-10">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 md:col-span-6">
        <h2 id={`${id}-title`} className="font-display t-h2">
          {title}
        </h2>
        {edit ? <EditLink to={edit} /> : null}
      </div>
      {children ? <div className="max-w-[58ch] text-ink-dim md:col-span-6 md:pb-1.5">{children}</div> : null}
    </div>
  );
}
