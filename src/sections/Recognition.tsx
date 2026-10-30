import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { SectionHead } from "../components/SectionHead";
import { introOf } from "../lib/constants";
import { Link } from "react-router-dom";
import { byPlacement, clean, dateKey, formatDate, isPlacement, placeLabel, placementRank, shortEvent } from "../lib/portfolio";
import { cn } from "../utils/format";
import type { Achievement } from "../types";

function Certificate({ a }: { a: Achievement }) {
  const src = a.images?.[0];
  if (!src) return null;
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="link inline-block py-2 whitespace-nowrap text-ink-dim">
      Certificate<span className="sr-only">: {a.result}, {clean(a.event)} (opens image)</span>
    </a>
  );
}

/** Normalised for matching an award's title to a project ("Team Suraksha360" -> suraksha360). */
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function Recognition() {
  const { achievements, profile, projects } = useData();
  const placements = useMemo(() => (achievements ?? []).filter(isPlacement).sort(byPlacement), [achievements]);
  const others = useMemo(
    () => (achievements ?? []).filter((a) => !isPlacement(a)).sort((a, b) => dateKey(b).localeCompare(dateKey(a))),
    [achievements],
  );
  const outlets = (profile?.featured_in ?? []).filter((o) => o.url);

  if (!achievements || (placements.length === 0 && others.length === 0 && outlets.length === 0)) return null;

  const firsts = placements.filter((a) => placementRank(a) === 1).length;
  const projectOf = (a: Achievement) => {
    const t = norm(clean(a.title));
    return t ? (projects ?? []).find((p) => t.includes(norm(p.title))) : undefined;
  };

  return (
    <section id="recognition" aria-labelledby="recognition-title" className="border-t border-line py-20 md:py-28">
      {/* old links pointed at #wins */}
      <span id="wins" className="block" aria-hidden />
      <div className="container-rk">
        <SectionHead id="recognition" title="Recognition">
          <p>{introOf(profile?.intros, "recognition")}</p>
        </SectionHead>

        {placements.length > 0 ? (
          <>
            <p className="mt-12 text-[1.05rem] text-ink-dim md:mt-16">
              <strong className="text-ink">{placements.length} awards</strong> at competitions and expos
              {firsts ? (
                <>
                  , <strong className="text-signal">{firsts} of them first place</strong>
                </>
              ) : null}
              . Best result first.
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {placements.map((a) => {
                const first = placementRank(a) === 1;
                const project = projectOf(a);
                const detail = a.detail ? clean(a.detail).replace(/^.{0,24}?\b\d{4}\s*[—–]\s+/, "") : "";
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-[6px] border p-5",
                      first ? "border-accent bg-accent-soft" : "border-line bg-surface",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={cn("font-display text-[1.55rem] leading-none", first && "text-signal")}>{placeLabel(a)}</span>
                      <span className="shrink-0 tabular text-[0.88rem] text-ink-faint">{formatDate(a.date || a.year)}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{shortEvent(a.event)}</p>
                      <p className="text-[0.92rem] text-ink-dim">{clean(a.event)}</p>
                      {detail ? <p className="mt-2 text-[0.92rem] text-ink-dim">{detail}</p> : null}
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-3 text-[0.92rem]">
                      {project ? (
                        <Link to={`/projects/${project.id}`} className="link inline-block py-2 font-medium">
                          {project.title}
                        </Link>
                      ) : (
                        <span className="text-ink-dim">{clean(a.title)}</span>
                      )}
                      <Certificate a={a} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        {others.length > 0 ? (
          <div className="mt-16 grid gap-8 md:grid-cols-12 md:gap-10">
            <div className="md:col-span-4">
              <h3 className="font-display t-h3">Certificates and roles</h3>
              <p className="mt-3 max-w-[40ch] text-ink-dim">Participation, appointments and community work, newest first.</p>
            </div>
            <ul className="md:col-span-8">
              {others.map((a) => {
                const title = clean(a.title);
                const event = clean(a.event);
                const context = [title !== clean(a.result) ? title : "", event !== title ? event : ""].filter(Boolean).join(", ");
                return (
                  <li key={a.id} className="grid grid-cols-[6.5rem_1fr_auto] gap-x-4 border-t border-line py-3.5 first:border-t-0 md:grid-cols-[8rem_1fr_auto]">
                    <span className="tabular text-[0.92rem] text-ink-faint">{formatDate(a.date || a.year)}</span>
                    <span>
                      <span className="font-semibold">{clean(a.result)}</span>
                      {context ? <span className="block text-[0.92rem] text-ink-dim">{context}</span> : null}
                    </span>
                    <span className="text-[0.92rem]">
                      <Certificate a={a} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {outlets.length > 0 ? (
          <div className="mt-16 border-t border-line pt-14">
            <div className="grid gap-4 md:grid-cols-12 md:items-end md:gap-10">
              <h3 className="font-display t-h3 md:col-span-6">In the press</h3>
              <p className="max-w-[58ch] text-ink-dim md:col-span-6">
                Nepali media coverage. The screenshots link to the original articles and posts.
              </p>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {outlets.map((o) => (
                <li key={o.name}>
                  <a href={o.url} target="_blank" rel="noopener noreferrer" className="group block">
                    {o.images?.[0] ? (
                      <img
                        src={o.images[0]}
                        alt={`Screenshot of the ${o.name} coverage`}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[3/4] w-full rounded-[3px] border border-line object-cover object-top transition-opacity group-hover:opacity-85"
                      />
                    ) : null}
                    <span className="mt-3 block font-semibold group-hover:text-accent-ink">{o.name}</span>
                    <span className="text-[0.88rem] text-ink-faint">Opens the original</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
