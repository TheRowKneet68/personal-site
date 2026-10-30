import { ArrowUp } from "lucide-react";
import { useScrolled } from "../hooks";
import { cn } from "../utils/format";

export function BackToTop() {
  const visible = useScrolled(1200);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        "fixed bottom-5 right-5 z-40 grid size-11 cursor-pointer place-items-center rounded-[3px] border border-line bg-surface text-ink-dim shadow-card transition-[opacity,transform,color] duration-200 hover:text-ink",
        visible ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="size-4" aria-hidden />
    </button>
  );
}
