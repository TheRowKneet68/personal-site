import { useEffect, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, QrCode as QrIcon, ShieldOff } from "lucide-react";
import { useData } from "../context/DataContext";
import { useSeo } from "../hooks/useSeo";
import { track } from "../lib/analytics";
import { CONNECT_URL } from "../lib/constants";
import { isValidHttpUrl, platformIcon, platformName } from "../lib/platforms";
import type { Profile, SocialLink } from "../types";
import { buildVCard, downloadVCard } from "../lib/vcard";
import { Button } from "../components/Button";
import { CopyButton } from "../components/CopyButton";
import { QrCode } from "../components/QrCode";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

/** The links shown on the card: enabled, opted into /connect and safe to open.
    `social_links` is always present (the server derives it from legacy
    `socials`), but an inline fallback keeps this page uncrashable regardless. */
function cardLinks(profile: Profile): SocialLink[] {
  const links =
    profile.social_links?.length
      ? profile.social_links
      : Object.entries(profile.socials ?? {}).map(([platform, url], i) => ({
          id: `social-${platform}`,
          platform,
          name: platformName(platform),
          url,
          description: "",
          enabled: true,
          showOnConnect: true,
          sortOrder: i,
          iconOverride: null,
        }));
  return links
    .filter((l) => l.enabled && l.showOnConnect && isValidHttpUrl(l.url))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function ConnectPage() {
  const { profile } = useData();
  const reduce = useReducedMotion();
  const rise = reduce ? 0 : 14;

  const links = useMemo(() => (profile ? cardLinks(profile) : []), [profile]);

  useSeo({
    title: "Ronit Baniya Gupta | Connect",
    description:
      "Connect with Ronit Baniya Gupta — TheRowKneet. Find his social profiles, projects, contact information and website.",
    canonical: CONNECT_URL,
    jsonLd: profile
      ? {
          "@context": "https://schema.org",
          "@type": "Person",
          name: profile.name,
          alternateName: profile.handle,
          jobTitle: profile.role,
          url: CONNECT_URL,
          sameAs: links.map((l) => l.url),
        }
      : undefined,
  });

  useEffect(() => {
    track("connect_page_view");
  }, []);

  if (!profile) return null;

  const avatar = profile.portrait1 || profile.portrait || profile.logo || "/images/logo.svg";

  const saveContact = () => {
    track("save_contact_click");
    downloadVCard("ronit-baniya-gupta.vcf", buildVCard(links));
  };

  return (
    <section className="container-rk flex justify-center py-14 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8"
      >
        {/* identity */}
        <div className="flex flex-col items-center text-center">
          <motion.img
            initial={{ opacity: 0, scale: reduce ? 1 : 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
            src={avatar}
            alt={profile.name}
            width={96}
            height={96}
            className="size-24 rounded-full border border-line object-cover shadow-card"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.16 }}
            className="mono-label mt-5"
          >
            @{profile.handle}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: reduce ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: EASE }}
            className="text-display mt-1 text-center"
          >
            {profile.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-3 text-sm text-ink-dim"
          >
            {profile.role || "Computer Engineer • Builder • Founder"}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.34 }}
            className="mt-3 text-sm leading-relaxed text-ink-faint"
          >
            {profile.slogan}
          </motion.p>
        </div>

        <div className="hairline my-7" />

        {/* links */}
        <p className="mono-label mb-3 text-center">connect</p>
        {links.length === 0 ? (
          <p className="flex items-center justify-center gap-2 rounded-md border border-line bg-bg px-4 py-6 text-center text-sm text-ink-faint">
            <ShieldOff className="size-4 shrink-0" aria-hidden />
            No platforms to show yet — check back soon.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {links.map((link, i) => {
              const Icon = platformIcon(link.iconOverride ?? link.platform);
              return (
                <li key={link.id}>
                  <motion.a
                    initial={{ opacity: 0, y: reduce ? 0 : rise }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + i * 0.05, ease: EASE }}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.name || link.platform}
                    onClick={() => track("social_link_click", { platform: link.platform, name: link.name })}
                    className="group flex min-h-14 items-center gap-3.5 rounded-md border border-line bg-bg px-4 py-3 transition-colors hover:border-accent hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-md border border-line bg-surface text-ink-dim transition-colors group-hover:text-accent-ink">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{link.name}</span>
                      {link.description ? (
                        <span className="block truncate text-xs text-ink-faint">{link.description}</span>
                      ) : null}
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden
                    />
                  </motion.a>
                </li>
              );
            })}
          </ul>
        )}

        {/* actions */}
        <div className="mt-7 space-y-2.5">
          <Button variant="solid" className="w-full" onClick={saveContact}>
            Save Contact
          </Button>
          <Button
            variant="ghost"
            className="w-full border border-line-strong hover:border-accent"
            to="/"
            onClick={() => track("website_click")}
          >
            Visit Website
          </Button>
        </div>

        {/* share / QR */}
        <details className="group mt-6">
          <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-md py-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
            <QrIcon className="size-3.5" aria-hidden />
            share this card
            <span aria-hidden>▾</span>
          </summary>
          <div className="mt-4 flex flex-col items-center gap-4 rounded-md border border-line bg-bg p-5">
            <span className="text-ink" aria-label={`QR code for ${CONNECT_URL}`}>
              <QrCode value={CONNECT_URL} size={168} />
            </span>
            <p className="text-center text-xs text-ink-faint">
              Scanning {CONNECT_URL} opens this card — it updates when I change platforms, so the printed card
              never goes stale.
            </p>
            <CopyButton text={CONNECT_URL} label="copy link" className="w-full justify-center" />
          </div>
        </details>
      </motion.div>
    </section>
  );
}