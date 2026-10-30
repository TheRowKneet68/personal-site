import { FileDown, Mail, CornerDownLeft, ExternalLink, FolderOpen, Hash, Moon, Sun } from "lucide-react";
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

  const { theme, toggle: toggleTheme } = useTheme();

  const goProject = (p: Project): void => {
    navigate(`/projects/${p.id}`);
    close();
  };

  const commands = useMemo<PaletteCommand[]>(() => {
    const list: PaletteCommand[] = [
      { id: "sec-work", label: "Go to Work", hint: "section", keywords: "projects build case study", icon: Hash, perform: () => goSection("#work") },
      { id: "sec-numbers", label: "Go to Numbers", hint: "section", keywords: "stats charts data graphs parts", icon: Hash, perform: () => goSection("#numbers") },
      { id: "sec-recognition", label: "Go to Recognition", hint: "section", keywords: "awards wins achievements competitions press", icon: Hash, perform: () => goSection("#recognition") },
      { id: "sec-about", label: "Go to About", hint: "section", keywords: "about who bio journey", icon: Hash, perform: () => goSection("#about") },
      { id: "sec-contact", label: "Go to Contact", hint: "section", keywords: "email message reach", icon: Hash, perform: () => goSection("#contact") },
      ...(projects ?? []).map((p): PaletteCommand => ({
        id: `project-${p.id}`,
        label: p.title,
        hint: `project · ${p.year}`,
        keywords: `${p.title} ${p.tagline} ${p.category} ${p.tech.join(" ")}`,
        icon: FolderOpen,
        perform: () => goProject(p),
      })),
      { id: "copy-email", label: "Copy email address", hint: "action", keywords: "email copy contact", icon: Mail, perform: () => { void copy(); close(); } },
      { id: "resume", label: "Download resume", hint: "pdf", keywords: "resume cv pdf download", icon: FileDown, perform: () => { window.open(SITE.resume, "_blank"); close(); } },
      { id: "github", label: "Open GitHub", hint: "external", keywords: "github code repos", icon: ExternalLink, perform: () => { window.open(SITE.github, "_blank"); close(); } },
      { id: "linkedin", label: "Open LinkedIn", hint: "external", keywords: "linkedin job work", icon: ExternalLink, perform: () => { window.open(SITE.linkedin, "_blank"); close(); } },
      { id: "theme", label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode", hint: "action", keywords: "theme dark light mode colour color", icon: theme === "dark" ? Sun : Moon, perform: () => { toggleTheme(); close(); } },
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
    open ? (
        <div
          className="rk-fade fixed inset-0 z-[80] flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="w-full max-w-lg overflow-hidden rounded-[4px] border border-line bg-surface shadow-card-lg"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <span className="text-ink-faint" aria-hidden>⌕</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects, sections, actions"
                aria-label="Search commands"
                className="w-full bg-transparent py-3.5 text-[0.98rem] text-ink outline-none placeholder:text-ink-faint"
              />
              <kbd className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[0.6rem] text-ink-faint">esc</kbd>
            </div>

            <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
              {filtered.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-ink-faint">Nothing matches “{query}”. Try a project name or a part like ESP32.</p>
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
                    <span className="text-[0.8rem] text-ink-faint">{c.hint}</span>
                    {i === index && <CornerDownLeft className="size-3.5 shrink-0 text-ink-faint" aria-hidden />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[0.8rem] text-ink-faint">
              <span><kbd className="mr-1">↑↓</kbd> navigate</span>
              <span><kbd className="mr-1">↵</kbd> select</span>
              <span className="ml-auto">esc to close</span>
            </div>
          </div>
        </div>
    ) : null
  );
}
