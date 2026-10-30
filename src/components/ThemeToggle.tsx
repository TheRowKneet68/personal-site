import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { cn } from "../utils/format";

/** Shows the mode you'd switch to. `size` swaps the default size-10 (cn() does not merge classes). */
export function ThemeToggle({ size = "size-10" }: { size?: string }) {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={cn(
        "grid shrink-0 cursor-pointer place-items-center rounded-[3px] text-ink-dim transition-colors hover:bg-raised hover:text-ink",
        size,
      )}
    >
      {theme === "dark" ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
    </button>
  );
}
