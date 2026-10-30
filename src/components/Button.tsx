import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../utils/format";

type Variant = "solid" | "outline" | "ghost";

interface ButtonProps {
  variant?: Variant;
  size?: "sm" | "md";
  href?: string;
  to?: string;
  external?: boolean;
  download?: boolean;
  className?: string;
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
}

const VARIANTS: Record<Variant, string> = {
  solid: "bg-accent-fill text-on-accent hover:brightness-105 active:translate-y-px",
  outline: "border border-line-strong text-ink hover:border-ink active:translate-y-px",
  ghost: "text-ink-dim hover:text-ink",
};

export function Button({
  variant = "outline",
  size = "md",
  href,
  to,
  external,
  download,
  className,
  children,
  type = "button",
  disabled,
  ariaLabel,
  onClick,
}: ButtonProps) {
  const classes = cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[3px] font-semibold transition-[filter,border-color,color,transform] duration-150",
    size === "sm" ? "px-3.5 py-2 text-[0.9rem]" : "px-5 py-3 text-[0.98rem]",
    VARIANTS[variant],
    disabled && "pointer-events-none opacity-50",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={ariaLabel} onClick={onClick}>
        {children}
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
        download={download || undefined}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </button>
  );
}
