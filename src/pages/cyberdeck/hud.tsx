import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Cyber-Deck HUD primitives — shared by all deck modules.            */
/*  Pure Tailwind + the --cd-* token namespace; no runtime deps.       */
/*                                                                     */
/*  Design rules that keep this looking like a machined cockpit and    */
/*  not a hacker theme:                                                */
/*   · cd-white for values, cd-dim for labels, cd-cyan ONLY when a     */
/*     thing is interactive or energised.                              */
/*   · ONE accent detail per panel (notched tab + single bracket),     */
/*     never four screaming corners.                                   */
/*   · Chamfered plate edges (.cd-chamfer) carry the sci-fi read.      */
/* ------------------------------------------------------------------ */

/** Chamfered glass panel with a notched label tab and one corner accent. */
export function HudPanel({
  label,
  right,
  children,
  className = "",
}: {
  label: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`cd-chamfer relative border border-cd-line bg-gradient-to-b from-cd-hull/90 to-cd-glass p-5 pt-8 backdrop-blur-md ${className}`}
    >
      {/* notched label tab — sits ON the top edge, breaking the border */}
      <span className="absolute -top-px left-4 flex h-5 items-center gap-2 bg-cd-cyan/10 px-2 font-cd-mono text-[9px] tracking-[0.28em] text-cd-dim">
        <span className="h-1 w-1 bg-cd-cyan shadow-[0_0_6px_rgba(56,225,255,0.9)]" />
        {label}
      </span>
      {/* single corner accent — top-right only */}
      <span className="absolute -top-px -right-px h-3.5 w-3.5 border-t-2 border-r-2 border-cd-cyan/50" />
      <header className={`flex items-start justify-between gap-2 ${right ? "mt-1" : ""}`}>{right}</header>
      {children}
    </section>
  );
}

/** Relay state LED: lit-green pulse (on), dim (off), amber (unknown). */
export function StatusDot({ value }: { value: 0 | 1 | null | undefined }) {
  if (value === 1)
    return (
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cd-green opacity-50" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cd-green shadow-[0_0_8px_rgba(61,255,171,0.9)]" />
      </span>
    );
  if (value === 0) return <span className="inline-flex h-1.5 w-1.5 rounded-full bg-cd-line" />;
  return <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-cd-amber/80" />;
}

/**
 * Breaker-style tactical switch. Square industrial track, sliding core,
 * green energised glow vs dead idle. role="switch" for a11y.
 */
export function TacticalToggle({
  on,
  busy,
  disabled,
  onToggle,
}: {
  on: boolean;
  busy?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled || busy}
      onClick={onToggle}
      className={`relative h-9 w-[68px] shrink-0 border transition-all duration-200 ${
        on ? "border-cd-green/60 bg-cd-green/10 shadow-[0_0_18px_rgba(61,255,171,0.3)]" : "border-cd-line bg-black/40"
      } ${busy ? "animate-pulse" : ""} hover:border-cd-cyan/40 disabled:opacity-40`}
    >
      {/* track ticks */}
      <span className="absolute inset-y-1.5 left-2 w-px bg-cd-line" />
      <span className="absolute inset-y-1.5 right-2 w-px bg-cd-line" />
      <span
        className={`absolute bottom-1 top-1 left-1 w-7 transition-all duration-200 ${
          on ? "translate-x-[32px] bg-cd-green shadow-[0_0_12px_rgba(61,255,171,0.9)]" : "bg-cd-cyan/25"
        }`}
      />
      <span
        className={`pointer-events-none absolute inset-0 flex items-center justify-center font-cd-mono text-[8px] tracking-[0.3em] transition-colors ${
          on ? "text-cd-green/90" : "text-cd-dim/50"
        }`}
      >
        {on ? "ON" : "OFF"}
      </span>
    </button>
  );
}

/** Small mono chip (hub/pin labels). */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="border border-cd-line px-1.5 py-0.5 font-cd-mono text-[9px] tracking-[0.18em] text-cd-dim">
      {children}
    </span>
  );
}

/** Deck-style text input used in config mode. */
export const deckInputCls =
  "border border-cd-line bg-black/40 px-2 py-1.5 font-cd-mono text-xs text-cd-white placeholder:text-cd-dim/40 focus:border-cd-cyan focus:shadow-[0_0_12px_rgba(56,225,255,0.15)] focus:outline-none";
