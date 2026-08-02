import { Mail, MapPin, Phone } from "lucide-react";
import { useData } from "../context/DataContext";
import { Container } from "../components/Container";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { ContactForm } from "../components/ContactForm";
import { NewsletterForm } from "../components/NewsletterForm";
import { CopyButton } from "../components/CopyButton";
import { SocialLinks } from "../components/SocialLinks";
import { SITE } from "../lib/constants";

export function Contact() {
  const { profile } = useData();

  return (
    <section id="contact" className="scroll-mt-24 border-t border-line py-24 md:py-32">
      <Container>
        <SectionHeading
          index="06"
          title={<>let's <em className="accent-serif">build</em></>}
          kicker="Got an idea that doesn't exist yet? A hackathon team short an embedded guy? My phone is always within reach of my soldering iron."
        />

        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <Reveal>
            <ul className="space-y-3">
              <li className="flex items-center justify-between gap-4 rounded-sm border border-line bg-surface p-4">
                <span className="flex items-center gap-3 text-ink-dim">
                  <Mail className="size-4 shrink-0 text-ink-faint" aria-hidden />
                  <span className="font-mono text-sm">{SITE.email}</span>
                </span>
                <CopyButton text={SITE.email} label="copy" />
              </li>
              <li>
                <a
                  href={`tel:${SITE.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-3 rounded-sm border border-line bg-surface p-4 text-ink-dim transition-colors hover:border-line-strong hover:text-ink"
                >
                  <Phone className="size-4 shrink-0 text-ink-faint" aria-hidden />
                  <span className="font-mono text-sm">{SITE.phone}</span>
                  <span className="ml-auto font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink-faint">
                    call · whatsapp
                  </span>
                </a>
              </li>
              <li className="flex items-center gap-3 rounded-sm border border-line bg-surface p-4 text-ink-dim">
                <MapPin className="size-4 shrink-0 text-ink-faint" aria-hidden />
                <span className="font-mono text-sm">{profile?.location ?? "Pokhara, Nepal"}</span>
              </li>
            </ul>

            <div className="mt-6 border-t border-line pt-6">
              <p className="mono-label mb-3">find me online</p>
              <SocialLinks />
            </div>

            <div className="mt-8 rounded-sm border border-line bg-surface p-6">
              <p className="font-semibold text-ink">build diary</p>
              <p className="mt-1 text-sm text-ink-dim">
                The occasional note on what I'm shipping, no spam, unsubscribe anytime.
              </p>
              <NewsletterForm />
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <ContactForm />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
