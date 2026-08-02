import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { api, ApiClientError } from "../services/api";
import type { AdminContent, Profile } from "../types";
import { cn } from "../utils/format";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  AboutSection,
  AchievementsSection,
  AdminCard,
  BasicsSection,
  FeaturedInSection,
  JourneySection,
  PrinciplesSection,
  ProjectsSection,
  SkillsSection,
  TestimonialsSection,
} from "../components/admin/sections";

const TOKEN_KEY = "rk-admin-token";

type Tab = "basics" | "about" | "journey" | "principles" | "skills" | "projects" | "achievements" | "testimonials";

const TABS: { id: Tab; label: string }[] = [
  { id: "basics", label: "Basics" },
  { id: "about", label: "About" },
  { id: "journey", label: "Journey" },
  { id: "principles", label: "Principles" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "achievements", label: "Achievements" },
  { id: "testimonials", label: "Testimonials" },
];

const inputCls =
  "w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";
const btnCls =
  "rounded-md border border-line px-4 py-2 font-mono text-xs text-ink-dim hover:border-accent hover:text-accent disabled:opacity-40";

function LoginView({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const { token } = await api.adminLogin(password);
      onLogin(token);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <form
        className="w-full max-w-sm rounded-lg border border-line bg-surface p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h1 className="font-serif text-2xl text-ink">admin</h1>
        <p className="mt-1 text-sm text-ink-faint">Sign in to edit site content.</p>
        <input
          autoFocus
          type="password"
          className={cn(inputCls, "mt-5")}
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="mt-2 text-sm text-warn">{error}</p> : null}
        <button type="submit" disabled={busy || !password} className={cn(btnCls, "mt-4 w-full")}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export function AdminPage() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [content, setContent] = useState<AdminContent | null>(null);
  const [tab, setTab] = useState<Tab>("basics");
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setContent(null);
  };

  const load = useCallback(
    async (t: string) => {
      try {
        setContent(await api.getAdminContent(t));
        setLoadError("");
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        } else {
          setLoadError(err instanceof ApiClientError ? err.message : "Failed to load content");
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  const save = async () => {
    if (!token || !content) return;
    setSaveState("saving");
    setSaveError("");
    try {
      await api.saveAdminContent(token, content);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof ApiClientError ? err.message : "Save failed");
    }
  };

  const patchProfile = (profile: Profile) => setContent((c) => (c ? { ...c, profile } : c));

  if (!token) return <LoginView onLogin={(t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); }} />;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5" title="Go to homepage">
            <img
              src={content?.profile.logo || "/images/logo.svg"}
              alt=""
              width={22}
              height={22}
              className="shrink-0"
            />
            <span className="truncate font-mono text-sm font-bold uppercase tracking-[0.12em]">
              {content?.profile.name ?? "Admin"}
            </span>
            <span className="hidden font-mono text-xs text-ink-faint sm:inline">/ admin</span>
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            {saveState === "saved" ? <span className="font-mono text-xs text-accent">saved ✓</span> : null}
            {saveState === "error" ? <span className="font-mono text-xs text-warn">{saveError}</span> : null}
            <Link to="/" className={cn(btnCls, "inline-flex items-center gap-1.5")}>
              <ExternalLink className="size-3.5" aria-hidden />
              view site
            </Link>
            <ThemeToggle />
            <button className={btnCls} onClick={() => void save()} disabled={!content || saveState === "saving"}>
              {saveState === "saving" ? "Saving…" : "Save all"}
            </button>
            <button className={btnCls} onClick={logout}>Log out</button>
          </div>
        </div>

        <nav className="border-t border-line bg-bg">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
            {TABS.map((t) => (
              <button
              key={t.id}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 font-mono text-xs",
                tab === t.id ? "bg-accent text-accent-ink" : "text-ink-dim hover:text-ink",
              )}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>

    <main className="mx-auto max-w-6xl px-4 py-8">
        {loadError ? (
          <AdminCard title="Something went wrong" kicker={loadError} />
        ) : !content ? (
          <AdminCard title="Loading…" />
        ) : (
          <>
            {tab === "basics" && (
              <AdminCard title="Basics" kicker="Identity, contact details and social links.">
                <BasicsSection value={content.profile} onChange={patchProfile} />
              </AdminCard>
            )}
            {tab === "about" && (
              <AdminCard title="About" kicker="Hero paragraphs, badges, focus areas, fun facts and stats.">
                <AboutSection value={content.profile} onChange={patchProfile} />
              </AdminCard>
            )}
            {tab === "journey" && (
              <AdminCard title="Journey" kicker="The timeline shown in the About section.">
                <JourneySection value={content.profile.journey} onChange={(v) => patchProfile({ ...content.profile, journey: v })} />
              </AdminCard>
            )}
            {tab === "principles" && (
              <AdminCard title="Principles">
                <PrinciplesSection value={content.profile.principles} onChange={(v) => patchProfile({ ...content.profile, principles: v })} />
              </AdminCard>
            )}
            {tab === "skills" && (
              <AdminCard title="Skills" kicker="Skill categories — saved to profile.tech.">
                <SkillsSection value={content.profile.tech} onChange={(v) => patchProfile({ ...content.profile, tech: v })} />
              </AdminCard>
            )}
            {tab === "projects" && (
              <AdminCard title="Projects" kicker={`${content.projects.length} projects. Open one to edit its fields, case study and links.`}>
                <ProjectsSection value={content.projects} onChange={(v) => setContent({ ...content, projects: v })} />
              </AdminCard>
            )}
            {tab === "achievements" && (
              <AdminCard title="Achievements">
                <AchievementsSection value={content.achievements} onChange={(v) => setContent({ ...content, achievements: v })} />
                <div className="mt-6 border-t border-line pt-5">
                  <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-faint">featured in</p>
                  <FeaturedInSection
                    value={content.profile.featured_in ?? []}
                    onChange={(v) => patchProfile({ ...content.profile, featured_in: v })}
                  />
                </div>
              </AdminCard>
            )}
            {tab === "testimonials" && (
              <AdminCard title="Testimonials">
                <TestimonialsSection
                  value={content.profile.testimonials ?? []}
                  onChange={(v) => patchProfile({ ...content.profile, testimonials: v })}
                />
              </AdminCard>
            )}
          </>
        )}
      </main>
    </div>
  );
}
