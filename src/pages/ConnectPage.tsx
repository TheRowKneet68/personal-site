import { useEffect, useMemo } from "react";
import { ArrowRight, QrCode as QrIcon, ShieldOff } from "lucide-react";
import { useData } from "../context/DataContext";
import { useSeo } from "../hooks/useSeo";
import { track } from "../lib/analytics";
import { CONNECT_URL } from "../lib/constants";
import { isValidHttpUrl, platformIcon, platformName } from "../lib/platforms";
import type { Profile, SocialLink } from "../types";
import { buildVCard, downloadVCard } from "../lib/vcard";
import { runBoard } from "../components/LoadingScreen";
import { Button } from "../components/Button";
import { CopyButton } from "../components/CopyButton";

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

  const links = useMemo(() => (profile ? cardLinks(profile) : []), [profile]);

  useSeo({
    title: "Ronit Baniya Gupta | Connect",
    description:
      "Connect with Ronit Baniya Gupta - RowKneetLabs. Find his social profiles, projects, contact information and website.",
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

  const canShare = typeof navigator.share === "function";

  const saveContact = async () => {
    track("save_contact_click");
    const card = await runBoard("contact card", "packing contact card", "saved to downloads", () => buildVCard(links));
    downloadVCard("ronit-baniya-gupta.vcf", card);
  };

  return (
    <section className="container-rk flex justify-center py-14 sm:py-20">
      <div
        className="rk-rise w-full max-w-md rounded-[6px] border border-line bg-surface p-6 shadow-card sm:p-8"
      >
        {/* identity */}
        <div className="flex flex-col items-center text-center">
          <img
            src={avatar}
            alt={profile.name}
            width={96}
            height={96}
            className="size-24 rounded-[4px] border border-line object-cover"
          />
          <p
            className="label mt-5"
          >
            @{profile.handle}
          </p>
          <h1
            className="font-display t-h3 mt-1 text-center"
          >
            {profile.name}
          </h1>
          <p
            className="mt-3 text-sm text-ink-dim"
          >
            {profile.role || "Computer Engineer • Builder • Founder"}
          </p>
          <p
            className="mt-3 text-sm leading-relaxed text-ink-faint"
          >
            {profile.slogan}
          </p>
        </div>

        <div className="hairline my-7" />

        {/* links */}
        <p className="label mb-3 text-center">Find me on</p>
        {links.length === 0 ? (
          <p className="flex items-center justify-center gap-2 rounded-md border border-line bg-bg px-4 py-6 text-center text-sm text-ink-faint">
            <ShieldOff className="size-4 shrink-0" aria-hidden />
            No platforms to show yet - check back soon.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {links.map((link) => {
              const Icon = platformIcon(link.iconOverride ?? link.platform);
              return (
                <li key={link.id}>
                  <a
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
                  </a>
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
          <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-md py-2 text-[0.9rem] font-medium text-ink-dim transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
            <QrIcon className="size-3.5" aria-hidden />
            Share this card
            <span aria-hidden>▾</span>
          </summary>
          <div className="mt-4 flex flex-col items-center gap-4 rounded-md border border-line bg-bg p-5">
            <div className="card-scan relative w-full max-w-[340px]">
              <img
                src="/images/visiting-card.png"
                alt="Ronit Baniya Gupta visiting card"
                className="card-scan-img w-full rounded-md border border-line bg-surface shadow-card"
              />
              <span className="card-scan-line" aria-hidden />
              <svg className="card-scan-frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                <rect x="0" y="0" width="100" height="100" rx="2" pathLength={1} />
              </svg>
            </div>
            <a
              href="/documents/ronit-visiting-card.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block py-2 text-center text-[0.85rem] text-ink-dim transition-colors hover:text-ink"
            >
              Open the printable PDF
            </a>
            {canShare ? (
              <Button
                variant="solid"
                className="w-full"
                onClick={() => {
                  track("share_card_click");
                  void navigator.share({ title: profile.name, text: `${profile.name}, ${profile.role}`, url: CONNECT_URL }).catch(() => undefined);
                }}
              >
                Share
              </Button>
            ) : null}
            <CopyButton text={CONNECT_URL} label="copy share link" className="w-full justify-center" />
          </div>
        </details>
      </div>
    </section>
  );
}