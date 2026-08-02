import { useData } from "../context/DataContext";

/** Decorative skills ticker — CSS-driven, pauses on hover, aria-hidden. */
export function Marquee() {
  const { skills } = useData();
  if (!skills) return null;

  const items = [
    ...(skills.focus ?? []),
    ...Object.values(skills.categories ?? {}).flat().slice(0, 40),
  ];
  if (items.length === 0) return null;

  const row = (key: string) => (
    <span key={key} className="marquee-row flex shrink-0 items-center gap-10 pr-10" aria-hidden>
      {items.map((item) => (
        <span key={`${key}-${item}`} className="marquee-item flex items-center gap-10 font-mono text-sm text-ink-faint">
          <span>{item}</span>
          <span className="text-accent">◆</span>
        </span>
      ))}
    </span>
  );

  return (
    <div className="overflow-hidden border-y border-line bg-surface py-4">
      <div className="marquee-track" aria-hidden>
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}
