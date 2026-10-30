import { Fragment, useMemo } from "react";
import { useData } from "../context/DataContext";
import { SectionHead } from "../components/SectionHead";
import { YearChart } from "../components/charts/YearChart";
import { MixBar } from "../components/charts/MixBar";
import { PartsChart } from "../components/charts/PartsChart";
import { SITE, introOf } from "../lib/constants";
import { partsIndex } from "../lib/portfolio";
import { ALL_FIELDS, fieldTotals, projectsByYear } from "../lib/stats";
import { cn } from "../utils/format";

const CATEGORY_LABEL: Record<string, string> = {
  hardware: "Boards and microcontrollers",
  sensors: "Sensors",
  displays: "Displays",
  comms: "Wireless and comms",
  power: "Power",
  software: "Software and platforms",
  languages: "Languages",
};

const looksLikePart = (s: string): boolean => /\d/.test(s) || /^[A-Z0-9-]{2,}$/.test(s);

export function Numbers() {
  const { projects, skills, github, profile } = useData();
  const rows = useMemo(() => projectsByYear(projects ?? []), [projects]);
  const totals = useMemo(() => fieldTotals(projects ?? []), [projects]);
  const parts = useMemo(() => partsIndex(projects ?? [], 2).slice(0, 12), [projects]);
  const categories = Object.entries(skills?.categories ?? {}).filter(([, items]) => items.length > 0);
  if (!projects || projects.length === 0) return null;

  return (
    <section id="numbers" aria-labelledby="numbers-title" className="border-t border-line py-20 md:py-28">
      <div className="container-rk">
        <SectionHead id="numbers" title="By the numbers">
          <p>{introOf(profile?.intros, "numbers")}</p>
        </SectionHead>

        <div className="mt-12 grid gap-5 md:mt-16 lg:grid-cols-12">
          <YearChart rows={rows} fields={ALL_FIELDS} className="lg:col-span-7" />
          <div className="grid content-start gap-5 lg:col-span-5">
            <MixBar totals={totals} />
            {github ? (
              <div className="rounded-[4px] border border-line bg-surface p-5 sm:p-6">
                <h3 className="text-[1.15rem] font-bold leading-tight">On GitHub</h3>
                <p className="mt-1 text-[0.92rem] text-ink-dim">Most of the real code is private. The public side:</p>
                <dl className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <dt className="label">Public repositories</dt>
                    <dd className="font-display mt-1 text-[2rem] leading-none">{github.publicRepos}</dd>
                  </div>
                  <div>
                    <dt className="label">Top languages</dt>
                    <dd className="mt-1.5 text-[0.95rem] leading-snug">
                      {github.topLanguages.length ? github.topLanguages.join(", ") : "Mostly private work"}
                    </dd>
                  </div>
                </dl>
                <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="link mt-3 inline-block py-1.5 text-[0.92rem] font-semibold">
                  @{github.username}
                </a>
              </div>
            ) : null}
          </div>

          {parts.length > 0 ? <PartsChart parts={parts} className="lg:col-span-7" /> : null}

          {categories.length > 0 ? (
            <div className="rounded-[4px] border border-line bg-surface p-5 sm:p-6 lg:col-span-5">
              <h3 className="text-[1.15rem] font-bold leading-tight">The full parts drawer</h3>
              <p className="mt-1 text-[0.92rem] text-ink-dim">The wider list of parts, platforms and languages I've worked with.</p>
              <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {categories.map(([key, items]) => (
                  <div key={key} className="border-t border-line pt-3">
                    <dt className="label">{CATEGORY_LABEL[key] ?? key.charAt(0).toUpperCase() + key.slice(1)}</dt>
                    <dd className="mt-1.5 text-[0.92rem] leading-relaxed text-ink">
                      {items.map((item, i) => (
                        <Fragment key={item}>
                          {i > 0 ? <span className="text-ink-faint">, </span> : null}
                          <span className={cn(looksLikePart(item) && "part")}>{item}</span>
                        </Fragment>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
