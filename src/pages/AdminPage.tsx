import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, ExternalLink, RefreshCw, Send, Trash2 } from "lucide-react";
import { api, ApiClientError } from "../services/api";
import type { AdminContent, ContactMessage, Profile } from "../types";
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

type Tab = "basics" | "about" | "journey" | "principles" | "skills" | "projects" | "achievements" | "featured" | "testimonials" | "inbox" | "subscribers" | "security";

const TABS: { id: Tab; label: string }[] = [
  { id: "basics", label: "Basics" },
  { id: "about", label: "About" },
  { id: "journey", label: "Journey" },
  { id: "principles", label: "Principles" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "achievements", label: "Achievements" },
  { id: "featured", label: "Featured In" },
  { id: "testimonials", label: "Testimonials" },
  { id: "inbox", label: "Inbox" },
  { id: "subscribers", label: "Subscribers" },
  { id: "security", label: "Security" },
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

function ChangePasswordForm({ token, onToken }: { token: string; onToken: (t: string) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setDone(false);
    if (next.length < 12) {
      setError("New password must be at least 12 characters");
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { token: fresh } = await api.adminChangePassword(token, current, next);
      onToken(fresh);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to change password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="max-w-sm space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {done ? (
        <p className="text-sm text-accent">Password changed — every other session has been signed out.</p>
      ) : null}
      {error ? <p className="text-sm text-warn">{error}</p> : null}
      <div>
        <label htmlFor="pw-current" className="mb-1 block text-xs text-ink-dim">
          Current password
        </label>
        <input
          id="pw-current"
          type="password"
          autoComplete="current-password"
          className={inputCls}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="pw-new" className="mb-1 block text-xs text-ink-dim">
          New password (min 12 characters)
        </label>
        <input
          id="pw-new"
          type="password"
          autoComplete="new-password"
          className={inputCls}
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="pw-confirm" className="mb-1 block text-xs text-ink-dim">
          Confirm new password
        </label>
        <input
          id="pw-confirm"
          type="password"
          autoComplete="new-password"
          className={inputCls}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <button type="submit" disabled={busy || !current || !next || !confirm} className={cn(btnCls, "w-full")}>
        {busy ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}

export function AdminPage() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [content, setContent] = useState<AdminContent | null>(null);
  const [tab, setTab] = useState<Tab>("basics");
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [subscribers, setSubscribers] = useState<string[] | null>(null);
  const [inboxError, setInboxError] = useState("");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setContent(null);
    navigate("/");
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

  const loadInbox = useCallback(async (t: string) => {
    try {
      const [m, s] = await Promise.all([api.adminMessages(t), api.adminSubscribers(t)]);
      setMessages(m.messages);
      setSubscribers(s.subscribers);
      setInboxError("");
    } catch (err) {
      setInboxError(err instanceof ApiClientError ? err.message : "Failed to load inbox");
    }
  }, []);

  useEffect(() => {
    if (token) {
      void load(token);
      void loadInbox(token);
    }
  }, [token, load, loadInbox]);

  const copyAllEmails = async () => {
    if (!subscribers) return;
    await navigator.clipboard.writeText(subscribers.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteMessage = async (id: string) => {
    if (!token) return;
    try {
      await api.adminDeleteMessage(token, id);
      setMessages((ms) => (ms ? ms.filter((m) => (m.id ?? m.created_at) !== id) : ms));
    } catch (err) {
      setInboxError(err instanceof ApiClientError ? err.message : "Delete failed");
    }
  };

  const deleteSubscriber = async (email: string) => {
    if (!token) return;
    try {
      await api.adminDeleteSubscriber(token, email);
      setSubscribers((s) => (s ? s.filter((e) => e !== email) : s));
    } catch (err) {
      setInboxError(err instanceof ApiClientError ? err.message : "Delete failed");
    }
  };

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

  const uploadImage = useCallback(
    async (file: File) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("Couldn't read file"));
        r.readAsDataURL(file);
      });
      const comma = dataUrl.indexOf(",");
      const b64 = dataUrl.slice(comma + 1);
      const contentType = /^data:(.*?);/.exec(dataUrl.slice(0, comma))?.[1] ?? "image/jpeg";
      const ext = /\.([a-zA-Z0-9]{1,5})$/.exec(file.name)?.[1] ?? "jpg";
      const base = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/\.[a-zA-Z0-9]{1,5}$/, "") || `upload-${Date.now()}`;
      const name = `${base}-${Date.now()}.${ext}`;
      const { url } = await api.adminUpload(token!, { data: b64, contentType, name });
      return url;
    },
    [token],
  );

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
              className="size-8 shrink-0 rounded-full object-cover"
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
                tab === t.id ? "bg-accent text-[#14150f]" : "text-ink-dim hover:text-ink",
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
                <BasicsSection value={content.profile} onChange={patchProfile} uploadImage={uploadImage} />
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
                <ProjectsSection value={content.projects} onChange={(v) => setContent({ ...content, projects: v })} uploadImage={uploadImage} />
              </AdminCard>
            )}
            {tab === "achievements" && (
              <AdminCard title="Achievements" kicker="Wins and battle entries from the site's Achievements section.">
                <AchievementsSection value={content.achievements} onChange={(v) => setContent({ ...content, achievements: v })} uploadImage={uploadImage} />
              </AdminCard>
            )}
            {tab === "featured" && (
              <AdminCard title="Featured In" kicker="Media coverage — press releases, articles and reels. Each row gets a photo or video preview on the site.">
                <FeaturedInSection
                  value={content.profile.featured_in ?? []}
                  onChange={(v) => patchProfile({ ...content.profile, featured_in: v })}
                  uploadImage={uploadImage}
                />
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
            {tab === "inbox" && (
              <AdminCard
                title="Inbox"
                kicker="Messages received from the contact form."
                actions={
                  <button className={cn(btnCls, "inline-flex items-center gap-1.5")} onClick={() => void loadInbox(token)}>
                    <RefreshCw className="size-3.5" aria-hidden /> refresh
                  </button>
                }
              >
                {inboxError ? <p className="text-sm text-warn">{inboxError}</p> : null}
                {messages === null ? (
                  <p className="text-sm text-ink-faint">Loading…</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-ink-faint">No messages yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {messages.map((m, i) => (
                      <li key={`${m.created_at}-${i}`} className="rounded-md border border-line bg-bg p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-mono text-sm text-ink">
                            {m.name} <span className="text-ink-faint">&lt;{m.email}&gt;</span>
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-ink-faint">
                              {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                            </span>
                            <a
                              href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "your message"}`)}`}
                              className={cn(btnCls, "inline-flex items-center gap-1.5 px-3 py-1")}
                            >
                              <Send className="size-3.5" aria-hidden /> reply
                            </a>
                            <button
                              className={cn(btnCls, "inline-flex items-center gap-1.5 px-3 py-1 text-warn hover:border-warn hover:text-warn")}
                              onClick={() => void deleteMessage(m.id ?? m.created_at ?? "")}
                              title="Delete this message"
                              disabled={!m.id && !m.created_at}
                            >
                              <Trash2 className="size-3.5" aria-hidden /> delete
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-ink-dim">{m.subject}</p>
                        <p className="mt-2 whitespace-pre-line text-sm text-ink-dim">{m.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </AdminCard>
            )}
            {tab === "subscribers" && (
              <AdminCard
                title="Subscribers"
                kicker="Emails signed up to the newsletter."
                actions={
                  <div className="flex items-center gap-2">
                    <button className={cn(btnCls, "inline-flex items-center gap-1.5")} onClick={() => void loadInbox(token)}>
                      <RefreshCw className="size-3.5" aria-hidden /> refresh
                    </button>
                    <button className={cn(btnCls, "inline-flex items-center gap-1.5")} onClick={() => void copyAllEmails()}>
                      <Copy className="size-3.5" aria-hidden /> {copied ? "copied ✓" : "copy all"}
                    </button>
                    {subscribers && subscribers.length > 0 ? (
                      <a
                        href={`mailto:?bcc=${subscribers.join(",")}&subject=${encodeURIComponent("TheRowKneet — ")}`}
                        className={cn(btnCls, "inline-flex items-center gap-1.5")}
                      >
                        <Send className="size-3.5" aria-hidden /> email all
                      </a>
                    ) : null}
                  </div>
                }
              >
                {inboxError ? <p className="text-sm text-warn">{inboxError}</p> : null}
                {subscribers === null ? (
                  <p className="text-sm text-ink-faint">Loading…</p>
                ) : subscribers.length === 0 ? (
                  <p className="text-sm text-ink-faint">No subscribers yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {subscribers.map((email) => (
                      <li key={email} className="flex items-center justify-between gap-3 rounded-md border border-line bg-bg px-3 py-2">
                        <span className="font-mono text-sm text-ink">{email}</span>
                        <div className="flex items-center gap-2">
                          <a href={`mailto:${email}`} className={cn(btnCls, "inline-flex items-center gap-1.5 px-3 py-1")}>
                            <Send className="size-3.5" aria-hidden /> email
                          </a>
                          <button
                            className={cn(btnCls, "inline-flex items-center gap-1.5 px-3 py-1 text-warn hover:border-warn hover:text-warn")}
                            onClick={() => void deleteSubscriber(email)}
                            title="Remove this subscriber"
                          >
                            <Trash2 className="size-3.5" aria-hidden /> delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </AdminCard>
            )}
            {tab === "security" && (
              <AdminCard
                title="Security"
                kicker="Rotate the admin password. Changing it signs out every other session."
              >
                <ChangePasswordForm
                  token={token}
                  onToken={(t) => {
                    localStorage.setItem(TOKEN_KEY, t);
                    setToken(t);
                  }}
                />
              </AdminCard>
            )}
          </>
        )}
      </main>
    </div>
  );
}
