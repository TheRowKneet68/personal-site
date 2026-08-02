import { RefreshCw } from "lucide-react";
import { useData } from "../context/DataContext";
import { useSeo } from "../hooks/useSeo";
import { Hero } from "../sections/Hero";
import { Marquee } from "../components/Marquee";
import { About } from "../sections/About";
import { Projects } from "../sections/Projects";
import { Achievements } from "../sections/Achievements";
import { GitHubStats } from "../sections/GitHubStats";
import { Testimonials } from "../sections/Testimonials";
import { Contact } from "../sections/Contact";
import { Button } from "../components/Button";
import { SITE } from "../lib/constants";
import type { Profile } from "../types";

function jsonLd(profile: Profile) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    alternateName: profile.handle,
    jobTitle: profile.role,
    url: SITE.url,
    email: `mailto:${profile.email}`,
    address: { "@type": "PostalAddress", addressLocality: profile.location, addressCountry: "Nepal" },
    sameAs: Object.values(profile.socials ?? {}),
  };
}

export function HomePage() {
  const { status, profile, reload } = useData();

  useSeo({
    title: "Ronit Baniya Gupta — TheRowKneet · Hardware & Software Engineer",
    description:
      "Computer engineer from Pokhara, Nepal building embedded systems, IoT ecosystems, computer vision and web products. If it doesn't exist, I build it.",
    jsonLd: profile ? jsonLd(profile) : undefined,
  });

  if (status === "error") {
    return (
      <div className="container-rk flex min-h-[70vh] flex-col items-center justify-center py-32 text-center">
        <p className="mono-label">// connection lost</p>
        <h1 className="text-display mt-4 font-bold">
          the API didn't <em className="accent-serif">answer</em>
        </h1>
        <p className="mt-4 max-w-md text-ink-dim">
          Content couldn't be loaded. If you're viewing a static preview, start the API
          server (<code className="font-mono text-accent-ink">npm run dev</code>) or check the logs.
        </p>
        <Button onClick={reload} className="mt-8" withArrow>
          <RefreshCw className="size-4" aria-hidden /> try again
        </Button>
      </div>
    );
  }

  if (status === "loading" || !profile) return null;

  return (
    <>
      <Hero />
      <Marquee />
      <About />
      <Projects />
      <Achievements />
      <GitHubStats />
      <Testimonials />
      <Contact />
    </>
  );
}
