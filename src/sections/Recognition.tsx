import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { SectionHead } from "../components/SectionHead";
import { introOf } from "../lib/constants";
import { AwardTimeline } from "../components/charts/AwardTimeline";
import { byPlacement, clean, dateKey, formatDate, isPlacement, placeLabel, placementRank } from "../lib/portfolio";
import { cn } from "../utils/format";
import type { Achievement } from "../types";

function Certificate({ a }: { a: Achievement }) {
  const src = a.images?.[0];
  if (!src) return null;
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="link whitespace-nowrap text-ink-dim">
      Certificate<span className="sr-only">: {a.result}, {clean(a.event)} (opens image)</span>
    </a>
  );
}

export function Recognition() {
  const { achievements, profile } = useData();
  const placements = useMemo(() => (achievements ?? []).filter(isPlacement).sort(byPlacement), [achievements]);
  const others = useMemo(
    () => (achievements ?? []).filter((a) => !isPlacement(a)).sort((a, b) => dateKey(b).localeCompare(dateKey(a))),
    [achievements],
  );
  const outlets = (profile?.featured_in ?? []).filter((o) => o.url);

  if (!achievements || (placements.length === 0 && others.length === 0 && outlets.length === 0)) return null;

  return (
    <section id="recognition" aria-labelledby="recognition-title" className="border-t border-line py-20 md:py-28">
      {/* old links pointed at #wins */}
      <span id="wins" className="block" aria-hidden />
      <div className="container-rk">
        <SectionHead id="recognition" title="Recognition">
          <p>{introOf(profile?.intros, "recognition")}</p>
        </SectionHead>

        <AwardTimeline achievements={achievements} className="mt-12 md:mt-16" />

        {placements.length > 0 ? (
          <table className="mt-12 w-full text-left">
            <caption className="sr-only">Competition placements, best result first</caption>
            <thead className="max-md:sr-only">
              <tr className="label border-b border-line">
                <th scope="col" className="w-48 py-3 font-medium">Result</th>
                <th scope="col" className="py-3 font-medium">Competition</th>
                <th scope="col" className="py-3 font-medium">Project</th>
                <th scope="col" className="w-36 py-3 font-medium">Date</th>
                <th scope="col" className="w-28 py-3 font-medium"><span className="sr-only">Certificate</span></th>
              </tr>
            </thead>
            <tbody className="max-md:block">
              {placements.map((a) => {
                const first = placementRank(a) === 1;
                return (
                  <tr key={a.id} className="border-b border-line max-md:grid max-md:grid-cols-[1fr_auto] max-md:gap-x-4 max-md:py-5">
                    <th
                      scope="row"
                      className={cn(
                        "py-5 pr-4 align-top font-display max-md:col-span-2 max-md:py-0",
                        first ? "text-[1.7rem] text-signal" : "text-[1.35rem]",
                      )}
                    >
                      {placeLabel(a)}
                    </th>
                    <td className="py-5 pr-6 align-top max-md:col-span-2 max-md:pt-2 max-md:pb-0">
                      <span className="font-semibold">{clean(a.event)}</span>
                      {a.detail ? (
                        <span className="mt-1 block max-w-[52ch] text-[0.92rem] text-ink-dim">
                          {clean(a.detail).replace(/^.{0,24}?\b\d{4}\s*[—–]\s+/, "")}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-5 pr-6 align-top text-ink-dim max-md:pt-2 max-md:pb-0">{clean(a.title)}</td>
                    <td className="py-5 pr-4 align-top tabular text-ink-dim max-md:pt-2 max-md:pb-0 max-md:text-right">{formatDate(a.date || a.year)}</td>
                    <td className="py-5 align-top max-md:col-start-1 max-md:row-start-4 max-md:pt-2 max-md:pb-0 md:text-right">
                      <Certificate a={a} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}

        {others.length > 0 ? (
          <div className="mt-16 grid gap-8 md:grid-cols-12 md:gap-10">
            <div className="md:col-span-4">
              <h3 className="font-display t-h3">Also on record</h3>
              <p className="mt-3 max-w-[40ch] text-ink-dim">Participation, appointments and community work.</p>
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
