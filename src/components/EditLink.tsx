import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { ADMIN_TOKEN_KEY } from "../lib/constants";

const loggedIn = (): boolean => {
  try {
    return Boolean(localStorage.getItem(ADMIN_TOKEN_KEY));
  } catch {
    return false;
  }
};

/** Only in a browser logged in to /admin: jumps straight to this item's editor. */
export function EditLink({ to, label = "Edit" }: { to: string; label?: string }) {
  if (!loggedIn()) return null;
  return (
    <Link
      to={`/admin#${to}`}
      className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-[3px] border border-line-strong px-2.5 text-[0.82rem] font-medium text-ink-dim transition-colors hover:border-accent hover:text-ink"
    >
      <Pencil className="size-3.5" aria-hidden />
      {label}
    </Link>
  );
}
