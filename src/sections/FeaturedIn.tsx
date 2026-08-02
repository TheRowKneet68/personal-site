import { ArrowUpRight } from "lucide-react";
import { useData } from "../context/DataContext";
import type { FeaturedIn } from "../types";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";

type Preview = { kind: "video"; src: string } | { kind: "image"; src: string };

/** Explicit image > Instagram reel embed > auto screenshot of the article. */
function previewOf(o: FeaturedIn): Preview | null {
  if (o.image) return { kind: "image", src: o.image };
  const reel = /instagram\.com\/reel\/([A-Za-z0-9_-]+)/.exec(o.url ?? "");
  if (reel) return { kind: "video", src: `https://www.instagram.com/reel/${reel[1]}/embed/` };
  if (o.url) return { kind: "image", src: `https://s0.wp.com/mshots/v1/${encodeURIComponent(o.url)}?w=640` };
  return null;
}

export function FeaturedIn() {
  const { profile } = useData();
  const outlets = profile?.featured_in ?? [];
  if (outlets.length === 0) return null;

  return (
    <section id="featured" className="scroll-mt-24 border-t border-line py-24 md:py-32">
      <Container>
        <SectionHeading
          index="04"
          title={<>featured <em className="accent-serif">in</em></>}
          kicker="RUDRA-I's launch and the projects behind it, covered by Nepali tech and media platforms."
        />

        <Reveal>
          <ul className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
            {outlets.map((o) => {
              const preview = previewOf(o);
              return (
                <li key={o.name} className="bg-bg">
                  <a
                    href={o.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-full flex-col justify-between gap-6 p-6 transition-colors hover:bg-surface"
                  >
                    {preview ? (
                      preview.kind === "video" ? (
                        <div className="aspect-[4/3] w-full overflow-hidden rounded-sm border border-line bg-bg">
                          <iframe
                            src={preview.src}
                            className="h-full w-full"
                            title={`${o.name} video`}
                            loading="lazy"
                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <img
                          src={preview.src}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="aspect-[4/3] w-full rounded-sm border border-line object-cover"
                        />
                      )
                    ) : null}
                    <span className="font-serif text-xl text-ink transition-colors group-hover:text-accent-ink">
                      {o.name}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint group-hover:text-accent-ink">
                      read the story <ArrowUpRight className="size-3.5" aria-hidden />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
