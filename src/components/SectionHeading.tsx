import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

interface SectionHeadingProps {
  index: string;
  title: ReactNode;
  kicker?: string;
}

export function SectionHeading({ index, title, kicker }: SectionHeadingProps) {
  return (
    <Reveal className="mb-14 md:mb-20">
      <div className="flex items-center gap-4">
        <span className="mono-label shrink-0">{index}</span>
        <span className="h-px flex-1 bg-line" aria-hidden />
      </div>
      <h2 className="text-section mt-5 font-bold">{title}</h2>
      {kicker && <p className="mt-3 max-w-xl text-ink-dim">{kicker}</p>}
    </Reveal>
  );
}
