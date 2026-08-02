import { Quote } from "lucide-react";
import { useData } from "../context/DataContext";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";

/** Placeholder-capable: renders nothing until testimonials exist in the data. */
export function Testimonials() {
  const { profile } = useData();
  const testimonials = profile?.testimonials ?? [];
  if (testimonials.length === 0) return null;

  return (
    <section className="border-t border-line py-24 md:py-32">
      <Container>
        <SectionHeading
          index="06"
          title={<>words from <em className="accent-serif">people</em></>}
          kicker="What teammates, clients and judges said. Full quotes coming as I collect them properly."
        />

        <div className="grid gap-6 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <figure className="flex h-full flex-col border border-line bg-surface p-8">
                <Quote className="size-6 text-accent" aria-hidden />
                <blockquote className="mt-5 flex-1 text-lg leading-relaxed text-ink">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-6 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-faint">
                  — {t.source}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
