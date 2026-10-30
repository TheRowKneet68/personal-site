import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { SITE, socialName } from "../lib/constants";

export function Footer() {
  const { profile } = useData();
  const socials = Object.entries(profile?.socials ?? {});

  return (
    <footer className="border-t border-line">
      <div className="container-rk grid gap-8 py-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="font-display text-[2rem]">{profile?.name ?? SITE.name}</p>
          <p className="mt-2 max-w-sm text-[0.95rem] text-ink-dim">
            {profile?.slogan ? `${profile.slogan.charAt(0).toUpperCase()}${profile.slogan.slice(1)}.` : null}
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-2 text-[0.95rem] sm:grid-cols-3 md:col-span-7">
          <a href={`mailto:${SITE.email}`} className="link w-fit text-ink-dim">Email</a>
          <a href={SITE.resume} download className="link w-fit text-ink-dim">Résumé (PDF)</a>
          <Link to="/connect" className="link w-fit text-ink-dim">Contact card</Link>
          {socials.map(([key, url]) => (
            <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="link w-fit text-ink-dim">
              {socialName(key)}
            </a>
          ))}
        </nav>
      </div>

      <div className="container-rk">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-5 text-[0.85rem] text-ink-faint">
        <span>© {new Date().getFullYear()} {SITE.name}, {profile?.location ?? "Pokhara, Nepal"}</span>
        <span className="flex items-center gap-5">
          <span className="hidden sm:inline">
            Press <kbd className="part rounded-[2px] border border-line px-1">Ctrl K</kbd> or{" "}
            <kbd className="part rounded-[2px] border border-line px-1">⌘K</kbd> to search
          </span>
          <Link to="/admin" className="inline-block py-1.5 opacity-70 transition-opacity hover:opacity-100">Admin</Link>
        </span>
        </div>
      </div>
    </footer>
  );
}
