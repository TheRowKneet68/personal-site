import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "../utils/format";

type Variant = "solid" | "outline" | "ghost";

interface ButtonProps {
  variant?: Variant;
  size?: "sm" | "md";
  href?: string;
  to?: string;
  external?: boolean;
  withArrow?: boolean;
  className?: string;
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
}

const VARIANTS: Record<Variant, string> = {
  solid: "bg-accent text-[#14150f] hover:brightness-110 active:brightness-95",
  outline: "border border-line-strong text-ink hover:border-accent hover:text-accent-ink",
  ghost: "text-ink-dim hover:text-ink",
};

export function Button({
  variant = "outline",
  size = "md",
  href,
  to,
  external,
  withArrow,
  className,
  children,
  type = "button",
  disabled,
  ariaLabel,
  onClick,
}: ButtonProps) {
  const classes = cn(
    "group inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm font-mono text-[0.8rem] uppercase tracking-[0.12em] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    size === "sm" ? "px-3.5 py-2" : "px-5 py-3",
    VARIANTS[variant],
    disabled && "pointer-events-none opacity-50",
    className,
  );

  const inner = (
    <>
      {children}
      {withArrow && (
        <ArrowRight
          aria-hidden
          className="size-4 transition-transform duration-200 group-hover:translate-x-1"
        />
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={ariaLabel} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a
        href={href}
        className={classes}
        aria-label={ariaLabel}
        onClick={onClick}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled} aria-label={ariaLabel} onClick={onClick}>
      {inner}
    </button>
  );
}
