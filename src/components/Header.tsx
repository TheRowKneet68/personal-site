import { Link, useLocation } from "react-router-dom";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../utils/format";
import { NAV_LINKS, SITE } from "../lib/constants";
import { useCommandPalette } from "../context/CommandContext";
import { useData } from "../context/DataContext";
import { useScrolled } from "../hooks";
import { ThemeToggle } from "./ThemeToggle";

function NavLink({ label, href, onNavigate, className }: { label: string; href: string; onNavigate?: () => void; className?: string }) {
  const { pathname, hash } = useLocation();
  const current = pathname === "/" && hash === href;
  return (
    <Link
      to={{ pathname: "/", hash: href }}
      onClick={onNavigate}
      aria-current={current ? "true" : undefined}
      className={cn(
        "text-[0.95rem] font-medium transition-colors hover:text-ink",
        current ? "text-ink" : "text-ink-dim",
        className,
      )}
    >
      {label}
    </Link>
  );
}

export function Header() {
  const scrolled = useScrolled(16);
  const [menuOpen, setMenuOpen] = useState(false);
  const { setOpen } = useCommandPalette();
  const { profile } = useData();
  const { pathname } = useLocation();
  const name = profile?.name || SITE.name;
  const logo = profile?.logo || "/images/logo.svg";

  // Close the mobile menu on route change and on Escape.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200",
        scrolled || menuOpen ? "border-line bg-bg/92 backdrop-blur-md" : "border-transparent bg-bg/0",
      )}
    >
      <div className="container-rk flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label={`${name}, home`}>
          <img src={logo} alt="" width={32} height={32} className="size-8 shrink-0 rounded-[3px] object-cover" />
          <span className="truncate text-[1.02rem] font-semibold [font-stretch:88%]">{name}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.href} label={l.label} href={l.href} />
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Search projects and pages"
            title="Search (Ctrl K)"
            className="grid size-10 cursor-pointer place-items-center rounded-[3px] text-ink-dim transition-colors hover:bg-raised hover:text-ink"
          >
            <Search className="size-[18px]" aria-hidden />
          </button>
          <ThemeToggle />
          <button
            type="button"
            className="grid size-10 cursor-pointer place-items-center rounded-[3px] text-ink-dim transition-colors hover:bg-raised hover:text-ink md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      <nav
        id="mobile-nav"
        aria-label="Mobile"
        hidden={!menuOpen}
        className="rk-fade border-t border-line bg-bg md:hidden"
      >
        <div className="container-rk flex flex-col py-3">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.href}
              label={l.label}
              href={l.href}
              onNavigate={() => setMenuOpen(false)}
              className="border-b border-line py-3.5 text-[1.1rem] last:border-b-0"
            />
          ))}
          <a href={SITE.resume} download className="py-3.5 text-[1.1rem] font-medium text-ink-dim hover:text-ink">
            Résumé (PDF)
          </a>
        </div>
      </nav>
    </header>
  );
}
