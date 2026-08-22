import { useEffect } from "react";
import { useData } from "../context/DataContext";
import { useSeo } from "../hooks/useSeo";
import { Hero } from "../sections/Hero";
import { Marquee } from "../components/Marquee";
import { About } from "../sections/About";
import { Projects } from "../sections/Projects";
import { Achievements } from "../sections/Achievements";
import { FeaturedIn } from "../sections/FeaturedIn";
import { GitHubStats } from "../sections/GitHubStats";
import { Testimonials } from "../sections/Testimonials";
import { Contact } from "../sections/Contact";
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
    title: "Ronit Baniya Gupta - TheRowKneet",
    description:
      "Computer engineer from Pokhara, Nepal building embedded systems, IoT ecosystems, computer vision and web products. If it doesn't exist, I build it.",
    jsonLd: profile ? jsonLd(profile) : undefined,
  });

  // Silent auto-retry: transient mobile/serverless hiccups heal themselves.
  useEffect(() => {
    if (status !== "error") return;
    const t = setTimeout(() => reload(), 3_000);
    return () => clearTimeout(t);
  }, [status, reload]);

  if (status === "error") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <p className="mono-label animate-pulse">// reconnecting</p>
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
      <FeaturedIn />
      <GitHubStats />
      <Testimonials />
      <Contact />
    </>
  );
}
