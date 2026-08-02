import { ArrowUpRight, Star } from "lucide-react";
import { useData } from "../context/DataContext";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { TechChip } from "../components/Badges";
import { SITE } from "../lib/constants";
import { formatNumber } from "../utils/format";

export function GitHubStats() {
  const { github } = useData();
  if (!github) return null;

  const cells: Array<{ value: string; label: string }> = [
    { value: formatNumber(github.publicRepos), label: "public repos" },
    { value: formatNumber(github.followers), label: "followers" },
    { value: formatNumber(github.totalStars), label: "stars earned" },
  ];

  return (
    <section className="border-t border-line py-24 md:py-32">
      <Container>
        <SectionHeading
          index="04"
          title={<>github <em className="accent-serif">stats</em></>}
          kicker="Pulled live from the account — no screenshot, no inflation."
        />

        <Reveal>
          <div className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-4">
            {cells.map((c) => (
              <div key={c.label} className="bg-surface p-6 md:p-8">
                <p className="flex items-center gap-2 text-3xl font-bold tracking-tight text-accent-ink md:text-4xl">
                  {c.value}
                  {c.label === "stars earned" && <Star className="size-5 fill-accent stroke-none" aria-hidden />}
                </p>
                <p className="mt-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint">
                  {c.label}
                </p>
              </div>
            ))}
            <div className="bg-surface p-6 md:p-8">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint">top languages</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {github.topLanguages.length === 0 ? (
                  <span className="text-sm text-ink-dim">private work mostly</span>
                ) : (
                  github.topLanguages.map((l) => <TechChip key={l}>{l}</TechChip>)
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint">
              @{github.username} — most of the real code is private
            </span>
            <a
              href={SITE.github}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline inline-flex items-center gap-1.5 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ink-dim hover:text-ink"
            >
              view profile <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
