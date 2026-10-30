import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Copy, ExternalLink, LogOut, RefreshCw, Send, Trash2 } from "lucide-react";
import { api, ApiClientError } from "../services/api";
import type { AdminContent, ContactMessage, Profile } from "../types";
import { cn } from "../utils/format";
import {
  AboutSection,
  AchievementsSection,
  AdminCard,
  BasicsSection,
  ConnectSection,
  FeaturedInSection,
  JourneySection,
  PrinciplesSection,
  SkillsSection,
  TestimonialsSection,
} from "../components/admin/sections";
import { ProjectsEditor } from "../components/admin/ProjectsEditor";
import { SiteCopySection } from "../components/admin/SiteCopySection";
import { ColorsSection } from "../components/admin/ColorsSection";
import { applyColors } from "../lib/palette";
import { projectErrors } from "../components/admin/checks";
import { ui } from "../components/admin/ui";
import { QrCode } from "../components/QrCode";
import { ThemeToggle } from "../components/ThemeToggle";
import { ADMIN_TOKEN_KEY, CONNECT_URL } from "../lib/constants";

const TOKEN_KEY = ADMIN_TOKEN_KEY;

type Tab =
  | "copy"
  | "colors"
  | "basics"
  | "about"
  | "journey"
  | "principles"
  | "skills"
  | "projects"
  | "achievements"
  | "featured"
  | "connect"
  | "testimonials"
  | "inbox"
  | "subscribers"
  | "security";

const GROUPS: { title: string; tabs: { id: Tab; label: string }[] }[] = [
  {
    title: "Site",
    tabs: [
      { id: "copy", label: "Hero and intros" },
      { id: "colors", label: "Colours" },
      { id: "basics", label: "Profile and contact" },
      { id: "about", label: "About" },
      { id: "journey", label: "Journey" },
      { id: "principles", label: "Principles" },
      { id: "skills", label: "Skills" },
    ],
  },
  {
    title: "Work",
    tabs: [
      { id: "projects", label: "Projects" },
      { id: "achievements", label: "Achievements" },
      { id: "featured", label: "Press" },
    ],
  },
  {
    title: "People",
    tabs: [
      { id: "connect", label: "Contact card links" },
      { id: "testimonials", label: "Testimonials" },
    ],
  },
  {
    title: "Inbox",
    tabs: [
      { id: "inbox", label: "Messages" },
      { id: "subscribers", label: "Subscribers" },
    ],
  },
  { title: "Settings", tabs: [{ id: "security", label: "Password" }] },
];

const TAB_IDS: string[] = GROUPS.flatMap((g) => g.tabs.map((t) => t.id));

/** /admin#about or /admin#project=suraksha360 - where the site's Edit links land. */
function fromHash(): { tab: Tab; project?: string } {
  const h = decodeURIComponent(window.location.hash.slice(1));
  if (h.startsWith("project=")) return { tab: "projects", project: h.slice("project=".length) };
  return { tab: TAB_IDS.includes(h) ? (h as Tab) : "projects" };
}

function Labelled({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={ui.label}>
        {label}
      </label>
      {children}
    </div>
  );
}

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
      setError(err instanceof ApiClientError ? err.message : "Sign-in failed. Check the password and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="graticule relative grid min-h-screen place-items-center px-4">
      <div className="absolute right-3 top-3">
        <ThemeToggle />
      </div>
      <form
        className="w-full max-w-sm rounded-[6px] border border-line bg-surface p-6 shadow-card-lg sm:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <img src="/images/logo.svg" alt="" width={40} height={40} className="size-10 rounded-[4px]" />
        <h1 className="font-display mt-5 text-[1.9rem]">Site admin</h1>
        <p className="mt-1 text-[0.95rem] text-ink-dim">Sign in to edit your portfolio.</p>
        <div className="mt-6">
          <Labelled id="admin-pw" label="Password">
            <input
              id="admin-pw"
              autoFocus
              type="password"
              autoComplete="current-password"
              className={ui.input}
              value={password}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "admin-pw-err" : undefined}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Labelled>
          {error ? (
            <p id="admin-pw-err" className="mt-2 text-[0.88rem] text-warn">
              {error}
            </p>
          ) : null}
        </div>
        <button type="submit" disabled={busy || !password} className={cn(ui.primary, "mt-6 h-10 w-full")}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <Link to="/" className="link mt-4 inline-block py-1 text-[0.9rem] text-ink-dim">
          Back to the site
        </Link>
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
      setError("Use at least 12 characters for the new password.");
      return;
    }
    if (next !== confirm) {
      setError("The two new passwords don't match.");
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
      setError(err instanceof ApiClientError ? err.message : "The password wasn't changed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className={cn(ui.card, "max-w-md space-y-5 p-5 sm:p-6")}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {done ? <p className="text-[0.92rem] text-accent-ink">Password changed. Every other session has been signed out.</p> : null}
      {error ? <p className="text-[0.92rem] text-warn">{error}</p> : null}
      <Labelled id="pw-current" label="Current password">
        <input id="pw-current" type="password" autoComplete="current-password" className={ui.input} value={current} onChange={(e) => setCurrent(e.target.value)} />
      </Labelled>
      <Labelled id="pw-new" label="New password, at least 12 characters">
        <input id="pw-new" type="password" autoComplete="new-password" className={ui.input} value={next} onChange={(e) => setNext(e.target.value)} />
      </Labelled>
      <Labelled id="pw-confirm" label="Confirm new password">
        <input id="pw-confirm" type="password" autoComplete="new-password" className={ui.input} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Labelled>
      <button type="submit" disabled={busy || !current || !next || !confirm} className={cn(ui.primary, "h-10")}>
        {busy ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}

export function AdminPage() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [content, setContent] = useState<AdminContent | null>(null);
  const [saved, setSaved] = useState("");
  const [tab, setTab] = useState<Tab>(() => fromHash().tab);
  const [editProject] = useState(() => fromHash().project);
  // keep the address in step so a refresh or a shared link reopens the same section
  useEffect(() => window.history.replaceState(null, "", `#${tab}`), [tab]);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [subscribers, setSubscribers] = useState<string[] | null>(null);
  const [inboxError, setInboxError] = useState("");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const snapshot = useMemo(() => (content ? JSON.stringify(content) : ""), [content]);
  const dirty = Boolean(content) && snapshot !== saved;
  const errors = useMemo(() => (content ? projectErrors(content.projects) : []), [content]);

  const load = useCallback(async (t: string) => {
    try {
      const c = await api.getAdminContent(t);
      setContent(c);
      setSaved(JSON.stringify(c));
      setLoadError("");
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      } else {
        setLoadError(err instanceof ApiClientError ? err.message : "The content didn't load. Refresh to try again.");
      }
    }
  }, []);

  const loadInbox = useCallback(async (t: string) => {
    try {
      const [m, s] = await Promise.all([api.adminMessages(t), api.adminSubscribers(t)]);
      setMessages(m.messages);
      setSubscribers(s.subscribers);
      setInboxError("");
    } catch (err) {
      setInboxError(err instanceof ApiClientError ? err.message : "The inbox didn't load.");
    }
  }, []);

  useEffect(() => {
    if (token) {
      void load(token);
      void loadInbox(token);
    }
  }, [token, load, loadInbox]);

  const save = useCallback(async () => {
    if (!token || !content || errors.length > 0) return;
    setSaveState("saving");
    setSaveError("");
    try {
      await api.saveAdminContent(token, content);
      applyColors(content.profile.colors); // the saved colours take over this browser straight away
      setSaved(JSON.stringify(content));
      setSaveState("idle");
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof ApiClientError ? err.message : "Changes weren't saved. Try again.");
    }
  }, [token, content, errors.length]);

  // Ctrl/Cmd+S saves; leaving with unsaved edits asks first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) void save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent): void => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [dirty, save]);

  const logout = () => {
    if (dirty && !window.confirm("You have unsaved changes. Log out anyway?")) return;
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setContent(null);
    navigate("/");
  };

  const copyAllEmails = async () => {
    if (!subscribers) return;
    await navigator.clipboard.writeText(subscribers.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteMessage = async (id: string) => {
    if (!token || !window.confirm("Delete this message?")) return;
    try {
      await api.adminDeleteMessage(token, id);
      setMessages((ms) => (ms ? ms.filter((m) => (m.id ?? m.created_at) !== id) : ms));
    } catch (err) {
      setInboxError(err instanceof ApiClientError ? err.message : "The message wasn't deleted.");
    }
  };

  const deleteSubscriber = async (email: string) => {
    if (!token || !window.confirm(`Remove ${email}?`)) return;
    try {
      await api.adminDeleteSubscriber(token, email);
      setSubscribers((s) => (s ? s.filter((e) => e !== email) : s));
    } catch (err) {
      setInboxError(err instanceof ApiClientError ? err.message : "The subscriber wasn't removed.");
    }
  };

  const patchProfile = (profile: Profile) => setContent((c) => (c ? { ...c, profile } : c));

  const uploadImage = useCallback(
    async (file: File) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("Couldn't read the file."));
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

  if (!token) {
    return (
      <LoginView
        onLogin={(t) => {
          localStorage.setItem(TOKEN_KEY, t);
          setToken(t);
        }}
      />
    );
  }

  const count = (t: Tab): number | undefined => (t === "inbox" ? messages?.length : t === "subscribers" ? subscribers?.length : t === "projects" ? content?.projects.length : undefined);
  const status = errors.length
    ? { text: `Fix ${errors.length} ${errors.length === 1 ? "problem" : "problems"} before saving`, tone: "text-warn" }
    : saveState === "saving"
      ? { text: "Saving…", tone: "text-ink-dim" }
      : saveState === "error"
        ? { text: saveError, tone: "text-warn" }
        : dirty
          ? { text: "Unsaved changes", tone: "text-signal" }
          : { text: "All changes saved", tone: "text-ink-faint" };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5" title="Go to the site">
            <img src={content?.profile.logo || "/images/logo.svg"} alt="" width={30} height={30} className="size-[30px] shrink-0 rounded-[4px] object-cover" />
            <span className="hidden truncate font-semibold sm:inline">{content?.profile.name ?? "Admin"}</span>
          </Link>
          <span className="hidden text-ink-faint sm:inline">/</span>
          <span className="hidden text-[0.92rem] text-ink-dim sm:inline">Admin</span>
          <p className={cn("ml-auto flex min-w-0 items-center gap-2 truncate text-[0.88rem]", status.tone)} role="status" aria-live="polite">
            {dirty && !errors.length && saveState === "idle" ? <span className="size-2 shrink-0 rounded-full bg-signal" aria-hidden /> : null}
            {!dirty && !errors.length && saveState === "idle" ? <Check className="size-4 shrink-0" aria-hidden /> : null}
            {/* the check icon says "saved" on phones; other states keep their words */}
            <span className={cn("truncate", !dirty && !errors.length && saveState === "idle" && "max-sm:sr-only")}>{status.text}</span>
          </p>
          <a href="/" target="_blank" rel="noopener noreferrer" className={cn(ui.small, "max-sm:hidden")}>
            <ExternalLink className="size-3.5" aria-hidden /> View site
          </a>
          <button
            type="button"
            className={ui.primary}
            onClick={() => void save()}
            disabled={!dirty || saveState === "saving" || errors.length > 0}
            title="Save (Ctrl S)"
          >
            Save
          </button>
          <ThemeToggle size="size-8" />
          <button type="button" className={ui.icon} onClick={logout} aria-label="Log out" title="Log out">
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Admin sections" className="border-line max-lg:hidden lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:border-r">
          <div className="space-y-6 px-3 py-6">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <p className="px-3 text-[0.8rem] font-semibold text-ink-faint">{g.title}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {g.tabs.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setTab(t.id)}
                        aria-current={tab === t.id ? "page" : undefined}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between rounded-[4px] px-3 py-2 text-left text-[0.93rem] transition-colors",
                          tab === t.id ? "bg-raised font-semibold text-ink" : "text-ink-dim hover:bg-surface hover:text-ink",
                        )}
                      >
                        {t.label}
                        {count(t.id) !== undefined ? <span className="tabular text-[0.8rem] text-ink-faint">{count(t.id)}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mb-6 lg:hidden">
            <label htmlFor="admin-section" className={ui.label}>
              Section
            </label>
            <select id="admin-section" className={cn(ui.input, "cursor-pointer")} value={tab} onChange={(e) => setTab(e.target.value as Tab)}>
              {GROUPS.map((g) => (
                <optgroup key={g.title} label={g.title}>
                  {g.tabs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                      {count(t.id) !== undefined ? ` (${count(t.id)})` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="mx-auto max-w-[72rem]">
            {errors.length ? (
              <ul className="mb-6 space-y-1 rounded-[4px] border border-warn/50 bg-warn-soft px-4 py-3 text-[0.9rem] text-ink">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}

            {loadError ? (
              <AdminCard title="Something went wrong" kicker={loadError} />
            ) : !content ? (
              <p className="text-ink-dim" role="status">
                Loading your content…
              </p>
            ) : (
              <>
                {tab === "copy" && (
                  <AdminCard title="Hero and intros" kicker="The headline, the four stats and the sentence beside each section title.">
                    <SiteCopySection value={content.profile} onChange={patchProfile} />
                  </AdminCard>
                )}
                {tab === "colors" && (
                  <AdminCard title="Colours" kicker="The accent and background tint for the whole site, in both light and dark mode.">
                    <ColorsSection value={content.profile} onChange={patchProfile} />
                  </AdminCard>
                )}
                {tab === "basics" && (
                  <AdminCard title="Profile and contact" kicker="Name, contact details, logo and portraits.">
                    <BasicsSection value={content.profile} onChange={patchProfile} uploadImage={uploadImage} />
                  </AdminCard>
                )}
                {tab === "connect" && (
                  <AdminCard
                    title="Contact card links"
                    kicker="The links on /connect, the page your business-card QR code opens."
                    actions={
                      <span className="flex items-center gap-3">
                        <span className="rounded-[4px] bg-white p-1.5 text-black" aria-hidden>
                          <QrCode value={CONNECT_URL} size={56} />
                        </span>
                        <span className="max-w-40 break-all text-[0.8rem] leading-snug text-ink-faint">{CONNECT_URL}</span>
                      </span>
                    }
                  >
                    <ConnectSection value={content.profile.social_links ?? []} onChange={(v) => patchProfile({ ...content.profile, social_links: v })} />
                  </AdminCard>
                )}
                {tab === "about" && (
                  <AdminCard title="About" kicker="Your paragraphs, credentials, focus areas and fun facts.">
                    <AboutSection value={content.profile} onChange={patchProfile} />
                  </AdminCard>
                )}
                {tab === "journey" && (
                  <AdminCard title="Journey" kicker="The timeline in the About section.">
                    <JourneySection value={content.profile.journey} onChange={(v) => patchProfile({ ...content.profile, journey: v })} />
                  </AdminCard>
                )}
                {tab === "principles" && (
                  <AdminCard title="Principles" kicker="'How I work' in the About section.">
                    <PrinciplesSection value={content.profile.principles} onChange={(v) => patchProfile({ ...content.profile, principles: v })} />
                  </AdminCard>
                )}
                {tab === "skills" && (
                  <AdminCard title="Skills" kicker="The full parts drawer in the Numbers section.">
                    <SkillsSection value={content.profile.tech} onChange={(v) => patchProfile({ ...content.profile, tech: v })} />
                  </AdminCard>
                )}
                {tab === "projects" && (
                  <AdminCard title="Projects" kicker="Order here is the order on the site. Featured projects appear as large sheets on the home page.">
                    <ProjectsEditor value={content.projects} onChange={(v) => setContent({ ...content, projects: v })} uploadImage={uploadImage} initialId={editProject} />
                  </AdminCard>
                )}
                {tab === "achievements" && (
                  <AdminCard title="Achievements" kicker="Competition results, certificates and roles. These feed the Recognition table and timeline.">
                    <AchievementsSection value={content.achievements} onChange={(v) => setContent({ ...content, achievements: v })} uploadImage={uploadImage} />
                  </AdminCard>
                )}
                {tab === "featured" && (
                  <AdminCard title="Press" kicker="Media coverage. A project page shows an outlet when its write-up mentions the outlet's name.">
                    <FeaturedInSection value={content.profile.featured_in ?? []} onChange={(v) => patchProfile({ ...content.profile, featured_in: v })} uploadImage={uploadImage} />
                  </AdminCard>
                )}
                {tab === "testimonials" && (
                  <AdminCard title="Testimonials" kicker="Not shown on the site at the moment. Add names before bringing them back.">
                    <TestimonialsSection value={content.profile.testimonials ?? []} onChange={(v) => patchProfile({ ...content.profile, testimonials: v })} />
                  </AdminCard>
                )}
                {tab === "inbox" && (
                  <AdminCard
                    title="Messages"
                    kicker="Sent from the contact form."
                    actions={
                      <button type="button" className={ui.small} onClick={() => void loadInbox(token)}>
                        <RefreshCw className="size-3.5" aria-hidden /> Refresh
                      </button>
                    }
                  >
                    {inboxError ? <p className="mb-4 text-[0.92rem] text-warn">{inboxError}</p> : null}
                    {messages === null ? (
                      <p className="text-ink-dim">Loading…</p>
                    ) : messages.length === 0 ? (
                      <p className="rounded-[6px] border border-dashed border-line-strong px-5 py-8 text-center text-ink-dim">No messages yet. New ones appear here.</p>
                    ) : (
                      <ul className="space-y-3">
                        {messages.map((m, i) => (
                          <li key={`${m.created_at}-${i}`} className={cn(ui.card, "p-5")}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold">{m.name}</p>
                                <p className="break-all text-[0.9rem] text-ink-dim">{m.email}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[0.85rem] text-ink-faint">{m.created_at ? new Date(m.created_at).toLocaleString() : ""}</span>
                                <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "your message"}`)}`} className={ui.small}>
                                  <Send className="size-3.5" aria-hidden /> Reply
                                </a>
                                <button
                                  type="button"
                                  className={ui.danger}
                                  onClick={() => void deleteMessage(m.id ?? m.created_at ?? "")}
                                  disabled={!m.id && !m.created_at}
                                >
                                  <Trash2 className="size-3.5" aria-hidden /> Delete
                                </button>
                              </div>
                            </div>
                            {m.subject ? <p className="mt-3 font-semibold text-ink-dim">{m.subject}</p> : null}
                            <p className="mt-2 whitespace-pre-line text-ink-dim">{m.message}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </AdminCard>
                )}
                {tab === "subscribers" && (
                  <AdminCard
                    title="Subscribers"
                    kicker="Emails from the old newsletter form. The form is no longer on the site."
                    actions={
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className={ui.small} onClick={() => void loadInbox(token)}>
                          <RefreshCw className="size-3.5" aria-hidden /> Refresh
                        </button>
                        <button type="button" className={ui.small} onClick={() => void copyAllEmails()} disabled={!subscribers?.length}>
                          <Copy className="size-3.5" aria-hidden /> {copied ? "Copied" : "Copy all"}
                        </button>
                      </div>
                    }
                  >
                    {inboxError ? <p className="mb-4 text-[0.92rem] text-warn">{inboxError}</p> : null}
                    {subscribers === null ? (
                      <p className="text-ink-dim">Loading…</p>
                    ) : subscribers.length === 0 ? (
                      <p className="rounded-[6px] border border-dashed border-line-strong px-5 py-8 text-center text-ink-dim">No subscribers.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {subscribers.map((email) => (
                          <li key={email} className={cn(ui.card, "flex items-center justify-between gap-3 px-4 py-2.5")}>
                            <span className="min-w-0 break-all">{email}</span>
                            <div className="flex shrink-0 items-center gap-2">
                              <a href={`mailto:${email}`} className={ui.small}>
                                <Send className="size-3.5" aria-hidden /> Email
                              </a>
                              <button type="button" className={ui.danger} onClick={() => void deleteSubscriber(email)}>
                                <Trash2 className="size-3.5" aria-hidden /> Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </AdminCard>
                )}
                {tab === "security" && (
                  <AdminCard title="Password" kicker="Changing it signs out every other session.">
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
          </div>
        </main>
      </div>
    </div>
  );
}
