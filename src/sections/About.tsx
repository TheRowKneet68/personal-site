import { useData } from "../context/DataContext";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";

export function About() {
  const { profile, experience } = useData();
  if (!profile) return null;

  const about = profile.about ?? [
    "Computer engineer from Pokhara, Nepal. I work with microcontrollers the way other people work with keyboards, and I'm building a company one stubborn project at a time.",
  ];

  return (
    <section id="about" className="scroll-mt-24 border-t border-line py-24 md:py-32">
      <Container>
        <SectionHeading index="01" title={<>about <em className="accent-serif">me</em></>} />

        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <figure className="relative">
              <img
                src="/images/me.jpg"
                alt="Portrait of Ronit Baniya Gupta at his workbench"
                width={640}
                height={800}
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full border border-line object-cover grayscale contrast-[1.05] transition-[filter] duration-500 hover:grayscale-0"
              />
              <figcaption className="mt-3 flex items-center justify-between font-mono text-[0.65rem] uppercase tracking-[0.12em] text-ink-faint">
                <span>therowkneet@location ~/pokhara</span>
                <span className="hidden sm:inline">est. 2004</span>
              </figcaption>
            </figure>

            <ul className="mt-6 flex flex-wrap gap-2">
              {(profile.badges ?? []).map((b) => (
                <li
                  key={b}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[0.68rem] text-ink-dim"
                >
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>

          <div>
            <Reveal>
              {about.map((p, i) => (
                <p key={i} className="mb-5 text-lg leading-relaxed text-ink-dim">
                  {p}
                </p>
              ))}
            </Reveal>

            <Reveal delay={0.08}>
              <h3 className="mono-label mt-10 mb-4">how I work</h3>
              <ul className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-2">
                {(profile.principles ?? []).map((p) => (
                  <li key={p.title} className="bg-bg p-5">
                    <p className="font-semibold text-ink">{p.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">{p.note}</p>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.12}>
              <h3 className="mono-label mt-10 mb-4">what I'm into</h3>
              <ul className="flex flex-wrap gap-2">
                {(profile.focus ?? []).map((f) => (
                  <li
                    key={f}
                    className="rounded-sm border border-line px-3 py-1.5 font-mono text-[0.72rem] text-ink-dim"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.16}>
              <h3 className="mono-label mt-10 mb-6">the journey so far</h3>
              <ol className="relative space-y-8 border-l border-line pl-6">
                {(experience ?? []).map((e) => (
                  <li key={`${e.year}-${e.title}`} className="relative">
                    <span
                      className="absolute -left-[29px] top-1.5 size-2 rounded-full border border-line-strong bg-bg"
                      aria-hidden
                    />
                    <p className="font-mono text-[0.7rem] tracking-[0.14em] text-accent-ink">{e.year}</p>
                    <h4 className="mt-1 font-semibold text-ink">{e.title}</h4>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink-dim">{e.note}</p>
                  </li>
                ))}
              </ol>
            </Reveal>

            <Reveal delay={0.2}>
              <h3 className="mono-label mt-12 mb-4">things you won't find on my resume</h3>
              <ul className="space-y-3">
                {(profile.fun_facts ?? []).map((f, i) => (
                  <li key={i} className="flex gap-3 text-[0.95rem] leading-relaxed text-ink-dim">
                    <span className="font-mono text-xs text-accent-ink" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
