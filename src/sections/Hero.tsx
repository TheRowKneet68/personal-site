import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { Button } from "../components/Button";
import { Trace } from "../components/charts/Trace";
import { DEFAULT_HERO } from "../lib/constants";
import { useCountUp } from "../hooks";
import { parseStat, projectsByYear } from "../lib/stats";
import { cn } from "../utils/format";

/** "39+" counts up once; "3rd DAN" and "∞" are shown as they are. */
function StatValue({ value }: { value: string }) {
  const { num, suffix } = parseStat(value);
  const n = useCountUp(num ?? 0, num !== null);
  if (num === null) return <>{value}</>;
  return (
    <>
      <span aria-hidden>
        {n}
        <span className="text-accent">{suffix}</span>
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}

export function Hero() {
  const { profile, profileStats, projects } = useData();
  const rows = useMemo(() => projectsByYear(projects ?? []), [projects]);
  if (!profile) return null;

  const stats = profileStats ?? profile.stats ?? [];
  const portrait = (profile.portrait1 || profile.portrait || "/images/me.jpg").trim();
  const hero = {
    line1: profile.hero?.line1?.trim() || DEFAULT_HERO.line1,
    accent: profile.hero?.accent?.trim() || DEFAULT_HERO.accent,
    line2: profile.hero?.line2?.trim() || DEFAULT_HERO.line2,
    lede: profile.hero?.lede?.trim() || DEFAULT_HERO.lede,
  };

  return (
    <section className="relative pt-28 md:pt-36" aria-labelledby="hero-title">
      <div className="container-rk">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-8">
            <p className="rk-rise label" style={{ ["--d" as string]: 0 }}>
              {profile.role}, based in {profile.location}
            </p>
            <h1 id="hero-title" className="rk-rise font-display t-hero mt-6" style={{ ["--d" as string]: 1 }}>
              {hero.line1}
              <br />
              <em className="accent-serif">{hero.accent}</em>{" "}
              <span className="whitespace-nowrap">
                {hero.line2}
                <span className="rk-cursor" aria-hidden />
              </span>
            </h1>
            <p className="rk-rise t-lede mt-7 max-w-[36rem] text-ink-dim" style={{ ["--d" as string]: 2 }}>
              I'm <span className="font-semibold text-ink">{profile.name}</span> - {profile.slogan}. {hero.lede}
            </p>
            <div className="rk-rise mt-9 flex flex-wrap items-center gap-3" style={{ ["--d" as string]: 3 }}>
              <Button href="#work" variant="solid">
                see the work
              </Button>
              <Button href="#contact" variant="outline">
                get in touch
              </Button>
            </div>
          </div>

          <figure className="rk-rise mx-auto w-full max-w-[22rem] sm:max-w-[26rem] lg:col-span-4 lg:max-w-none" style={{ ["--d" as string]: 2 }}>
            <img
              src={portrait}
              alt={`${profile.name} speaking at a podium`}
              width={640}
              height={800}
              {...{ fetchpriority: "high" } /* React 18 only knows the lowercase attribute */}
              className="aspect-[4/5] w-full rounded-[4px] border border-line object-cover object-top"
            />
          </figure>
        </div>

        <div className="rk-rise graticule mt-14 overflow-hidden rounded-[4px] border border-line md:mt-20 lg:grid lg:grid-cols-12" style={{ ["--d" as string]: 4 }}>
          <dl className="grid grid-cols-2 lg:col-span-6">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "flex flex-col-reverse justify-end border-line p-5 sm:p-6",
                  i % 2 === 0 && "border-r",
                  i < stats.length - 2 && "border-b",
                )}
              >
                <dt className="label mt-2">{s.label}</dt>
                <dd className="font-display text-[clamp(2.1rem,4.4vw,3.1rem)] leading-none">
                  <StatValue value={s.value} />
                </dd>
              </div>
            ))}
          </dl>
          {rows.length > 1 ? (
            <div className="border-t border-line p-5 sm:p-6 lg:col-span-6 lg:border-t-0 lg:border-l">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="label">Projects per year</p>
                <a href="#numbers" className="link inline-flex min-h-8 items-center text-[0.88rem] text-ink-dim">
                  All the numbers
                </a>
              </div>
              <div className="mt-3">
                <Trace rows={rows} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
