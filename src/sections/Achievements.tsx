import { useData } from "../context/DataContext";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { cn } from "../utils/format";

export function Achievements() {
  const { achievements } = useData();
  if (!achievements) return null;

  return (
    <section id="wins" className="scroll-mt-24 border-t border-line py-24 md:py-32">
      <Container>
        <SectionHeading
          index="03"
          title={<>wins & <em className="accent-serif">battles</em></>}
          kicker="Expos, hackathons, and the ones where the judges said 'we have no category for this.'"
        />

        <Reveal>
          <ol className="border-t border-line">
            {achievements.map((a) => {
              const highlighted = /1st|winner|runner-up|best of/i.test(a.result) || a.result !== "Shipped";
              return (
                <li
                  key={a.id}
                  className="grid grid-cols-12 items-baseline gap-x-4 gap-y-3 border-b border-line py-8 md:py-10"
                >
                  <span className="col-span-2 font-mono text-sm text-ink-faint md:col-span-1">{a.year}</span>
                  <div className="col-span-10 md:col-span-8">
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-ink-faint">{a.event}</p>
                    <h3 className="mt-1 text-lg font-semibold text-ink">{a.title}</h3>
                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-dim">{a.detail}</p>
                  </div>
                  <span className="col-span-10 col-start-3 md:col-span-3 md:col-start-auto md:justify-self-end">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.12em]",
                        highlighted ? "border-accent/40 text-accent-ink" : "border-line-strong text-ink-faint",
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current" aria-hidden />
                      {a.result}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Reveal>
      </Container>
    </section>
  );
}
