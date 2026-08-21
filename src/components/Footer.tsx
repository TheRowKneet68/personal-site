import { MapPin, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { SITE } from "../lib/constants";
import { SocialLinks } from "./SocialLinks";
import { CopyButton } from "./CopyButton";

export function Footer() {
  const { profile, storage } = useData();

  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-rk grid gap-10 py-16 md:grid-cols-3">
        <div>
          <p className="font-mono text-[0.8rem] font-bold uppercase tracking-[0.14em]">
            {profile?.name ?? "Ronit Baniya"} <span className="text-ink-faint">/</span> {profile?.handle ?? SITE.handle}
          </p>
          <p className="mt-3 max-w-xs text-sm text-ink-dim">
            Computer engineer from Pokhara, Nepal. Embedded systems, IoT, vision and web —
            built one stubborn project at a time.
          </p>
          <SocialLinks className="mt-5" />
        </div>

        <nav aria-label="Footer">
          <p className="mono-label mb-4">explore</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="text-ink-dim transition-colors hover:text-ink">home</Link></li>
            <li><Link to={{ pathname: "/", hash: "#about" }} className="text-ink-dim transition-colors hover:text-ink">about</Link></li>
            <li><Link to={{ pathname: "/", hash: "#work" }} className="text-ink-dim transition-colors hover:text-ink">work</Link></li>
            <li><Link to={{ pathname: "/", hash: "#wins" }} className="text-ink-dim transition-colors hover:text-ink">wins</Link></li>
            <li><Link to={{ pathname: "/", hash: "#contact" }} className="text-ink-dim transition-colors hover:text-ink">contact</Link></li>
            <li>
              <a href={SITE.resume} download className="text-ink-dim transition-colors hover:text-ink">
                resume (pdf) ↓
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <p className="mono-label mb-4">reach me</p>
          <ul className="space-y-3 text-sm">
            <li>
              <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 break-all text-ink-dim transition-colors hover:text-ink">
                <Mail className="size-4 shrink-0" aria-hidden /> {SITE.email}
              </a>
            </li>
            <li>
              <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-ink-dim transition-colors hover:text-ink">
                <Phone className="size-4 shrink-0" aria-hidden /> {SITE.phone}
              </a>
            </li>
            <li className="inline-flex items-center gap-2 text-ink-dim">
              <MapPin className="size-4 shrink-0" aria-hidden /> <span className="break-all">{profile?.location ?? "Pokhara, Nepal"}</span>
            </li>
            <li>
              <CopyButton text={SITE.email} label="copy email" />
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-rk flex flex-col items-start justify-between gap-2 py-6 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-ink-faint md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} Ronit Baniya Gupta — if it doesn't exist, I build it.</span>
          <span className="flex items-center gap-4">
            <span>react · express · supabase</span>
            <span className="hidden sm:inline" title="backend storage">{storage}</span>
            <Link to="/admin" className="opacity-60 transition-opacity hover:opacity-100">/admin</Link>
            <Link to="/terminal" className="opacity-60 transition-opacity hover:opacity-100">/terminal</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
