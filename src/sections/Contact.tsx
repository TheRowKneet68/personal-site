import { Link } from "react-router-dom";
import { EditLink } from "../components/EditLink";
import { useData } from "../context/DataContext";
import { ContactForm } from "../components/ContactForm";
import { CopyButton } from "../components/CopyButton";
import { SITE, introOf, socialName } from "../lib/constants";

export function Contact() {
  const { profile } = useData();
  const socials = Object.entries(profile?.socials ?? {});

  return (
    <section id="contact" aria-labelledby="contact-title" className="border-t border-line py-20 md:py-28">
      <div className="container-rk grid gap-14 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-6">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <h2 id="contact-title" className="font-display t-h1">
              Let's build it
            </h2>
            <EditLink to="basics" />
          </div>
          <p className="mt-5 max-w-[46ch] text-ink-dim">
            {introOf(profile?.intros, "contact")}
          </p>

          <div className="mt-9">
            <p className="label">Email</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
              <a href={`mailto:${SITE.email}`} className="link text-[clamp(1.2rem,2.4vw,1.6rem)] font-semibold">
                {SITE.email}
              </a>
              <CopyButton text={SITE.email} label="Copy" />
            </div>
          </div>

          <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="label">Phone and WhatsApp</dt>
              <dd className="mt-1">
                <a href={`tel:${SITE.phone.replace(/[\s-]/g, "")}`} className="link tabular font-medium">
                  {SITE.phone}
                </a>
                <span className="text-ink-faint"> or </span>
                <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener noreferrer" className="link font-medium">
                  WhatsApp
                </a>
              </dd>
            </div>
            <div>
              <dt className="label">Based in</dt>
              <dd className="mt-1 font-medium">{profile?.location ?? "Pokhara, Nepal"}</dd>
            </div>
            {socials.length > 0 ? (
              <div>
                <dt className="label">Elsewhere</dt>
                <dd className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-medium">
                  {socials.map(([key, url]) => (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="link">
                      {socialName(key)}
                    </a>
                  ))}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="label">Take it with you</dt>
              <dd className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-medium">
                <a href={SITE.resume} download className="link">
                  Résumé (PDF)
                </a>
                <Link to="/connect" className="link">
                  Contact card and QR
                </Link>
              </dd>
            </div>
          </dl>
        </div>

        <div className="md:col-span-6">
          <div className="rounded-[4px] border border-line bg-surface p-5 sm:p-8">
            <h3 className="font-display text-[1.75rem]">Send a message</h3>
            <p className="mt-1 mb-6 text-[0.95rem] text-ink-dim">I usually reply within a day or two.</p>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
