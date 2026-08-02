import { AnimatePresence, motion } from "framer-motion";
import { FileDown, Mail, Moon, Sun, CornerDownLeft, ExternalLink, FolderOpen, Hash } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCommandPalette } from "../context/CommandContext";
import { useData } from "../context/DataContext";
import { useTheme } from "../context/ThemeContext";
import { SITE } from "../lib/constants";
import { useCopyToClipboard } from "../hooks";
import { cn } from "../utils/format";
import type { Project } from "../types";

interface PaletteCommand {
  id: string;
  label: string;
  hint: string;
  keywords: string;
  icon: typeof FolderOpen;
  perform: () => void;
}

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const { theme, toggle } = useTheme();
  const { profile, projects } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const { copy } = useCopyToClipboard(SITE.email);

  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = (): void => {
    setOpen(false);
    setQuery("");
    setIndex(0);
  };

  const goSection = (hash: string): void => {
    if (location.pathname !== "/") {
      navigate("/" + hash);
    } else {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    }
    close();
  };

  const goProject = (p: Project): void => {
    navigate(`/projects/${p.id}`);
    close();
  };

  const commands = useMemo<PaletteCommand[]>(() => {
    const list: PaletteCommand[] = [
      { id: "sec-about", label: "Go to About", hint: "section", keywords: "about who bio", icon: Hash, perform: () => goSection("#about") },
      { id: "sec-work", label: "Go to Work", hint: "section", keywords: "projects build case study", icon: Hash, perform: () => goSection("#work") },
      { id: "sec-wins", label: "Go to Wins", hint: "section", keywords: "awards achievements hackathon", icon: Hash, perform: () => goSection("#wins") },
      { id: "sec-contact", label: "Go to Contact", hint: "section", keywords: "email message reach", icon: Hash, perform: () => goSection("#contact") },
      ...(projects ?? []).map((p): PaletteCommand => ({
        id: `project-${p.id}`,
        label: p.title,
        hint: `project · ${p.year}`,
        keywords: `${p.title} ${p.tagline} ${p.category} ${p.tech.join(" ")}`,
        icon: FolderOpen,
        perform: () => goProject(p),
      })),
      { id: "theme", label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode", hint: "action", keywords: "theme dark light mode", icon: theme === "dark" ? Sun : Moon, perform: () => { toggle(); close(); } },
      { id: "copy-email", label: "Copy email address", hint: "action", keywords: "email copy contact", icon: Mail, perform: () => { void copy(); close(); } },
      { id: "resume", label: "Download resume", hint: "pdf", keywords: "resume cv pdf download", icon: FileDown, perform: () => { window.open(SITE.resume, "_blank"); close(); } },
      { id: "github", label: "Open GitHub", hint: "external", keywords: "github code repos", icon: ExternalLink, perform: () => { window.open(SITE.github, "_blank"); close(); } },
      { id: "linkedin", label: "Open LinkedIn", hint: "external", keywords: "linkedin job work", icon: ExternalLink, perform: () => { window.open(SITE.linkedin, "_blank"); close(); } },
    ];
    return list.filter((c) => !profile || c.keywords.length >= 0);
  }, [projects, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.keywords} ${c.hint}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => setIndex(0), [query, filtered.length]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // keep the highlighted row visible while keyboard-navigating
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${index}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[index]?.perform();
    } else if (e.key === "Escape") {
      close();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            initial={{ opacity: 0, y: -8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-lg overflow-hidden rounded-lg border border-line bg-surface shadow-card-lg"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <span className="font-mono text-xs text-ink-faint">~</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search projects, sections, actions…"
                aria-label="Search commands"
                className="w-full bg-transparent py-3.5 font-mono text-sm text-ink outline-none placeholder:text-ink-faint"
              />
              <kbd className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[0.6rem] text-ink-faint">esc</kbd>
            </div>

            <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
              {filtered.length === 0 && (
                <p className="px-4 py-8 text-center font-mono text-xs text-ink-faint">no matches for “{query}”</p>
              )}
              {filtered.map((c, i) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    data-idx={i}
                    onMouseEnter={() => setIndex(i)}
                    onClick={c.perform}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left",
                      i === index ? "bg-raised" : "",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", i === index ? "text-accent-ink" : "text-ink-faint")} aria-hidden />
                    <span className="flex-1 text-sm">{c.label}</span>
                    <span className="font-mono text-[0.65rem] uppercase tracking-wider text-ink-faint">{c.hint}</span>
                    {i === index && <CornerDownLeft className="size-3.5 shrink-0 text-ink-faint" aria-hidden />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 border-t border-line px-4 py-2 font-mono text-[0.62rem] uppercase tracking-wider text-ink-faint">
              <span><kbd className="mr-1">↑↓</kbd> navigate</span>
              <span><kbd className="mr-1">↵</kbd> select</span>
              <span className="ml-auto">therowkneet://menu</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
