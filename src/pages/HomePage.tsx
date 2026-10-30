import { useEffect } from "react";
import { useData } from "../context/DataContext";
import { useSeo } from "../hooks/useSeo";
import { Hero } from "../sections/Hero";
import { Work } from "../sections/Work";
import { Recognition } from "../sections/Recognition";
import { Numbers } from "../sections/Numbers";
import { About } from "../sections/About";
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
    title: "Ronit Baniya Gupta, embedded systems and IoT engineer",
    description:
      "Computer engineering student in Pokhara, Nepal. I design circuits, write the firmware that runs them, and build the apps that control them. Suraksha360, SwiftIgnite, GRAVAS and more.",
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
      <div className="container-rk flex min-h-[70vh] flex-col justify-center py-32">
        <p className="font-display t-h3">Can't reach the content server</p>
        <p className="mt-3 max-w-[50ch] text-ink-dim" role="status">
          Retrying automatically. You can still email me at{" "}
          <a href={`mailto:${SITE.email}`} className="link text-ink">
            {SITE.email}
          </a>
          .
        </p>
      </div>
    );
  }

  if (status === "loading" || !profile) return null;

  return (
    <>
      <Hero />
      <Work />
      <Numbers />
      <Recognition />
      <About />
      <Contact />
    </>
  );
}
