import { useData } from "../context/DataContext";
import { SectionHead } from "../components/SectionHead";
import { introOf } from "../lib/constants";
import { clean, stripEmoji } from "../lib/portfolio";

const LONG_NOTE = 280;

export function About() {
  const { profile, experience } = useData();
  if (!profile) return null;

  const about = (profile.about ?? []).map(clean).filter(Boolean);
  const journey = (experience ?? []).filter((e) => e.type !== "achievement");
  // Counted claims ("15+ awards") are left to the Recognition table, which shows the real list.
  const credentials = (profile.badges ?? []).map(clean).filter((b) => b && !/\d+\+/.test(b));
  const portrait = (profile.portrait || "/images/me.jpg").trim();

  return (
    <section id="about" aria-labelledby="about-title" className="border-t border-line py-20 md:py-28">
      <div className="container-rk">
        <SectionHead id="about" title="About" edit="about">
          {introOf(profile.intros, "about") ? <p>{introOf(profile.intros, "about")}</p> : null}
        </SectionHead>

        <div className="mt-12 grid gap-12 md:mt-16 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5 lg:col-span-4">
            <img
              src={portrait}
              alt={`Portrait of ${profile.name}`}
              width={640}
              height={800}
              loading="lazy"
              decoding="async"
              className="aspect-[4/5] w-full rounded-[3px] object-cover"
            />
            {credentials.length > 0 ? (
              <div className="mt-8">
                <h3 className="label">Credentials</h3>
                <ul className="mt-2">
                  {credentials.map((c) => (
                    <li key={c} className="border-t border-line py-2.5 text-[0.95rem]">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="md:col-span-7 lg:col-[6/13]">
            {about.map((p, i) => (
              <p key={i} className={i === 0 ? "t-lede max-w-[40ch] font-medium" : "mt-5 max-w-[62ch] text-ink-dim"}>
                {p}
              </p>
            ))}

            {(profile.principles ?? []).length > 0 ? (
              <div className="mt-14">
                <h3 className="font-display text-[1.75rem]">How I work</h3>
                <dl className="mt-5 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                  {profile.principles.map((p) => (
                    <div key={p.title} className="border-t-2 border-ink pt-3">
                      <dt className="font-semibold">{clean(p.title)}</dt>
                      <dd className="mt-1.5 text-[0.95rem] text-ink-dim">{clean(p.note)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {(profile.fun_facts ?? []).length > 0 ? (
              <div className="mt-14">
                <h3 className="font-display text-[1.75rem]">Away from the bench</h3>
                <ul className="mt-4 max-w-[62ch] space-y-3 text-ink-dim">
                  {profile.fun_facts.map((f, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-[0.6em] h-px w-4 shrink-0 bg-line-strong" aria-hidden />
                      <span>{clean(f)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {journey.length > 0 ? (
          <div className="mt-20 border-t border-line pt-14">
            <div className="grid gap-4 md:grid-cols-12 md:items-end md:gap-10">
              <h3 className="font-display t-h3 md:col-span-6">The road so far</h3>
              <p className="max-w-[58ch] text-ink-dim md:col-span-6">From a first Arduino during my diploma to the projects on this page.</p>
            </div>
            <ol className="mt-8">
              {journey.map((e, i) => {
                const note = stripEmoji(e.note ?? "");
                return (
                  <li key={`${e.year}-${i}`} className="grid gap-x-10 gap-y-1 border-t border-line py-5 md:grid-cols-12">
                    <p className="tabular font-semibold text-ink-faint md:col-span-2">{e.year}</p>
                    <div className="md:col-span-10 lg:col-span-8">
                      <p className="font-semibold">{clean(e.title)}</p>
                      {note.length > LONG_NOTE ? (
                        <details className="group mt-1">
                          <summary className="cursor-pointer text-[0.95rem] text-ink-dim marker:text-ink-faint hover:text-ink">
                            {note.split("\n")[0]}
                            <span className="text-ink-faint group-open:hidden">, and more</span>
                          </summary>
                          <p className="mt-2 whitespace-pre-line text-[0.95rem] text-ink-dim">{note.split("\n").slice(1).join("\n")}</p>
                        </details>
                      ) : (
                        <p className="mt-1 max-w-[70ch] whitespace-pre-line text-[0.95rem] text-ink-dim">{note}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}
