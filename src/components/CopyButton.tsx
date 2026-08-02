import { Check, Copy } from "lucide-react";
import { cn } from "../utils/format";
import { useCopyToClipboard } from "../hooks";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label, className }: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard(text);

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={`Copy ${label ?? text} to clipboard`}
      className={cn(
        "group inline-flex cursor-pointer items-center gap-2 rounded-sm border border-line px-3 py-2 font-mono text-[0.75rem] text-ink-dim transition-colors hover:border-accent hover:text-ink",
        className,
      )}
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-accent-ink" aria-hidden />
          <span className="text-accent-ink">copied</span>
        </>
      ) : (
        <>
          <Copy className="size-3.5 transition-transform group-hover:scale-110" aria-hidden />
          <span>{label ?? text}</span>
        </>
      )}
    </button>
  );
}
