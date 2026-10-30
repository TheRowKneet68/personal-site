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
        "inline-flex cursor-pointer items-center gap-2 rounded-[3px] border border-line-strong px-3 py-1.5 text-[0.9rem] font-medium text-ink-dim transition-colors hover:border-ink hover:text-ink",
        className,
      )}
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-accent-ink" aria-hidden />
          <span className="text-accent-ink" role="status">Copied</span>
        </>
      ) : (
        <>
          <Copy className="size-3.5" aria-hidden />
          <span>{label ?? text}</span>
        </>
      )}
    </button>
  );
}
