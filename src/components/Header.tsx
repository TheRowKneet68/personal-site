import { Link, useLocation } from "react-router-dom";
import { Command, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { cn } from "../utils/format";
import { NAV_LINKS } from "../lib/constants";
import { useCommandPalette } from "../context/CommandContext";
import { useData } from "../context/DataContext";
import { useScrolled } from "../hooks";
import { ThemeToggle } from "./ThemeToggle";

function NavLink({ label, href, onNavigate }: { label: string; href: string; onNavigate?: () => void }) {
  const { pathname, hash } = useLocation();
  return (
    <Link
      to={{ pathname: "/", hash: href }}
      onClick={onNavigate}
      className="link-underline font-mono text-[0.8rem] uppercase tracking-[0.14em] text-ink-dim hover:text-ink"
      aria-current={pathname === "/" && hash === href ? "true" : undefined}
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
  const name = profile?.name || "Ronit Baniya";
  const logo = profile?.logo || "/images/logo.svg";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled || menuOpen ? "border-b border-line bg-bg/85 backdrop-blur-md" : "bg-transparent",
      )}
    >
      <div className="container-rk flex h-16 items-center justify-between gap-3 sm:gap-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="TheRowKneet — home">
          <img src={logo} alt="" width={32} height={32} className="size-8 shrink-0 rounded-full object-cover" />
          <span className="truncate font-mono text-[0.72rem] font-bold uppercase tracking-[0.12em] sm:text-[0.85rem] sm:tracking-[0.14em]">
            {name}
            <span className="ml-0.5 inline-block h-4 w-[7px] animate-pulse bg-accent align-middle" aria-hidden />
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.href} label={l.label} href={l.href} />
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open command palette"
            className="hidden items-center gap-2 rounded-sm border border-line px-2.5 py-1.5 font-mono text-[0.7rem] text-ink-faint transition-colors hover:border-line-strong hover:text-ink sm:flex"
          >
            <Command className="size-3.5" aria-hidden />
            <span className="hidden md:inline">menu</span>
            <kbd className="rounded-sm border border-line bg-raised px-1.5 py-0.5 text-[0.6rem]">⌘K</kbd>
          </button>
          <ThemeToggle />
          <button
            type="button"
            className="grid size-9 cursor-pointer place-items-center rounded-sm border border-line text-ink-dim transition-colors hover:text-ink lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-line bg-bg/95 backdrop-blur-md lg:hidden"
            aria-label="Mobile"
          >
            <div className="container-rk flex flex-col gap-1 py-4">
              {NAV_LINKS.map((l) => (
                <NavLink key={l.href} label={l.label} href={l.href} onNavigate={() => setMenuOpen(false)} />
              ))}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setOpen(true);
                }}
                className="cursor-pointer py-2 text-left font-mono text-[0.8rem] uppercase tracking-[0.14em] text-ink-dim"
              >
                ⌘K — command menu
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
