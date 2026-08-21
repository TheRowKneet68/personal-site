import { useEffect, useState } from "react";
import { useDeckAuth } from "../../hooks/useDeckAuth";
import { api, ApiClientError } from "../../services/api";
import { deckInputCls } from "./hud";
import { SurakshaGhar } from "./SurakshaGhar";
import { SwiftIgnition } from "./SwiftIgnition";
import { DeckGate } from "./DeckGate";

type Module = "ghar" | "ignition";

const TABS: { id: Module; label: string; code: string }[] = [
  { id: "ghar", label: "SURAKSHA GHAR", code: "01" },
  { id: "ignition", label: "SWIFT IGNITION", code: "02" },
];

/** UTC clock for the system bar — HUDs feel alive when something ticks.
 *  Self-contained so the 1s tick re-renders ONLY this span, not the deck. */
function UtcClock(): React.JSX.Element {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(t);
  }, []);
  return <span className="tabular-nums text-cd-dim">{now.toISOString().slice(11, 19)} UTC</span>;
}

/** Password rotation panel — POST /api/admin/change-password. On success the
 *  server bumps its token version (all other sessions die) and hands back a
 *  fresh token, which keeps THIS session signed in via reauth(). */
function KeyRotationPanel({ auth, onClose }: { auth: ReturnType<typeof useDeckAuth>; onClose: () => void }): React.JSX.Element {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (): Promise<void> => {
    if (busy) return;
    if (next.length < 12) { setMsg("NEW KEY MUST BE 12+ CHARS"); return; }
    if (next !== confirm) { setMsg("CONFIRMATION MISMATCH"); return; }
    setBusy(true);
    setMsg("");
    try {
      const { token } = await api.deckChangePassword(auth.token!, current, next);
      auth.reauth(token);
      setMsg("VAULT KEY ROTATED — OTHER SESSIONS SIGNED OUT");
      setTimeout(onClose, 1200);
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message.toUpperCase() : "ROTATION FAILED");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="cd-chamfer w-full max-w-sm border border-cd-line bg-cd-hull p-5 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-cd-mono text-[11px] tracking-[0.28em] text-cd-cyan">◈ ROTATE VAULT KEY</h2>
        <div className="space-y-3">
          <input type="password" autoComplete="current-password" placeholder="CURRENT KEY" value={current}
            onChange={(e) => setCurrent(e.target.value)} className={`${deckInputCls} w-full`} />
          <input type="password" autoComplete="new-password" placeholder="NEW KEY (12+ CHARS)" value={next}
            onChange={(e) => setNext(e.target.value)} className={`${deckInputCls} w-full`} />
          <input type="password" autoComplete="new-password" placeholder="CONFIRM NEW KEY" value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()} className={`${deckInputCls} w-full`} />
        </div>
        {msg ? (
          <p className={`mt-3 font-cd-mono text-[10px] tracking-[0.18em] ${msg.startsWith("VAULT KEY") ? "text-cd-green" : "text-cd-red"}`}>
            {msg}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="border border-cd-line px-3 py-1.5 font-cd-mono text-[10px] tracking-[0.22em] text-cd-dim transition-colors hover:text-cd-white">
            CANCEL
          </button>
          <button onClick={() => void submit()} disabled={busy}
            className="border border-cd-cyan/50 bg-cd-cyan/10 px-3 py-1.5 font-cd-mono text-[10px] tracking-[0.22em] text-cd-cyan transition-colors hover:bg-cd-cyan/20 disabled:opacity-40">
            {busy ? "ROTATING…" : "ROTATE"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hidden deck shell. Route is unlisted and noindex'd; everything behind the
 * gate is lazy-loaded so the public bundle never contains module code.
 */
export function TerminalPage() {
  const auth = useDeckAuth();
  const [active, setActive] = useState<Module>("ghar");
  const [keyPanel, setKeyPanel] = useState(false);

  useEffect(() => {
    document.title = "…";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  // ESC locks the deck — muscle-memory for a hardware panel.
  useEffect(() => {
    if (!auth.token) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") auth.lock();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [auth]);

  if (!auth.token) return <DeckGate auth={auth} />;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-cd-void">
      <div className="cd-grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_85%)]" />

      {/* ---- system bar ---- */}
      <header className="relative z-10 flex items-center justify-between border-b border-cd-line bg-black/30 px-5 py-3">
        <div className="flex items-center gap-3">
          {/* rotating reactor glyph */}
          <span className="relative flex h-7 w-7 items-center justify-center" aria-hidden>
            <span className="absolute inset-0 animate-[spin_9s_linear_infinite] rounded-full border border-dashed border-cd-cyan/40" />
            <span className="h-1.5 w-1.5 rounded-full bg-cd-cyan shadow-[0_0_8px_rgba(56,225,255,0.9)]" />
          </span>
          <h1 className="font-cd-mono text-sm font-bold tracking-[0.32em] text-cd-white">
            CYBER<span className="text-cd-cyan">·</span>DECK
          </h1>
        </div>
        <div className="flex items-center gap-4 font-cd-mono text-[10px] tracking-[0.22em]">
          <span className="hidden items-center gap-1.5 text-cd-dim sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cd-green shadow-[0_0_6px_rgba(61,255,171,0.8)]" />
            ONLINE
          </span>
          <UtcClock />
          <button
            onClick={() => setKeyPanel(true)}
            className="border border-cd-line px-2 py-1 tracking-[0.22em] text-cd-dim transition-colors hover:border-cd-cyan/50 hover:text-cd-cyan"
          >
            KEY
          </button>
          <button
            onClick={() => auth.lock()}
            className="border border-cd-line px-2 py-1 tracking-[0.22em] text-cd-red/80 transition-colors hover:border-cd-red/50 hover:text-cd-red"
          >
            LOCK
          </button>
        </div>
      </header>

      {/* ---- main deck area ---- */}
      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-6">
        {/* module tabs — underline style with chamfer marker */}
        <nav className="grid grid-cols-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`group relative px-2 pb-3 pt-2 font-cd-mono text-[11px] tracking-[0.24em] transition-colors ${
                active === t.id ? "text-cd-cyan" : "text-cd-dim/60 hover:text-cd-dim"
              }`}
            >
              <span className="mr-1.5 text-[9px] opacity-60">{t.code}</span>
              {t.label}
              <span
                className={`absolute inset-x-3 bottom-0 h-px transition-all ${
                  active === t.id
                    ? "bg-cd-cyan shadow-[0_0_10px_rgba(56,225,255,0.7)]"
                    : "bg-cd-line group-hover:bg-cd-dim/40"
                }`}
              />
              {active === t.id ? (
                <span className="absolute bottom-[-4px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-cd-cyan shadow-[0_0_8px_rgba(56,225,255,0.8)]" />
              ) : null}
            </button>
          ))}
        </nav>

        <div className="mt-6 flex-1">
          {active === "ghar" ? <SurakshaGhar authToken={auth.token} /> : <SwiftIgnition />}
        </div>
      </main>

      {/* ---- status footer ---- */}
      <footer className="relative z-10 flex items-center justify-between border-t border-cd-line bg-black/30 px-5 py-2 font-cd-mono text-[9px] tracking-[0.22em] text-cd-dim/70">
        <span>THEROWKNEET · DECK OS 2.0</span>
        <span className="hidden sm:inline">ESC TO LOCK</span>
      </footer>

      <div className="cd-vignette pointer-events-none absolute inset-0 z-20" />
      <div className="cd-scanlines pointer-events-none absolute inset-0 z-20" />
      {keyPanel ? <KeyRotationPanel auth={auth} onClose={() => setKeyPanel(false)} /> : null}
    </div>
  );
}
