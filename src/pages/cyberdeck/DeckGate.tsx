import { useState } from "react";
import { ApiClientError } from "../../services/api";
import type { DeckAuth } from "../../hooks/useDeckAuth";

const inputCls =
  "w-full border border-cd-line bg-black/40 px-3 py-2.5 font-cd-mono text-sm tracking-wider text-cd-white placeholder:text-cd-dim/40 focus:border-cd-cyan focus:shadow-[0_0_14px_rgba(56,225,255,0.15)] focus:outline-none";

/**
 * Auth gate for /terminal. Not the security boundary itself — the server's
 * HMAC bearer token + login rate limit is. This screen just collects the
 * password and surfaces why the previous session ended.
 */
export function DeckGate({ auth }: { auth: DeckAuth }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError("");
    try {
      await auth.login(password);
    } catch (err) {
      // Server messages are already generic (rate limit / wrong password).
      setError(err instanceof ApiClientError ? err.message : "ACCESS DENIED");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cd-void px-4">
      <div className="cd-grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />

      {/* ambient reactor ring behind the card */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-25">
        <span className="block h-[420px] w-[420px] animate-[spin_24s_linear_infinite] rounded-full border border-dashed border-cd-cyan/50" />
      </div>

      <form
        className="cd-chamfer relative w-full max-w-sm whitespace-nowrap border border-cd-line bg-gradient-to-b from-cd-hull/90 to-cd-glass p-7"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <span className="absolute -top-px -right-px h-3.5 w-3.5 border-t-2 border-r-2 border-cd-cyan/60" />
        <p className="flex items-center gap-2 font-cd-mono text-[9px] tracking-[0.3em] text-cd-amber/90">
          <span className="h-1 w-1 animate-pulse bg-cd-red shadow-[0_0_6px_rgba(255,71,87,0.9)]" />
          RESTRICTED // LEVEL-4 CLEARANCE
        </p>
        <h1 className="mt-3 font-cd-mono text-2xl font-bold tracking-[0.28em] text-cd-white">
          CYBER<span className="text-cd-cyan">·</span>DECK
        </h1>
        <p className="mt-2 font-cd-mono text-[11px] leading-relaxed text-cd-dim">
          {auth.lockReason === "idle" ? (
            <span className="text-cd-amber">SESSION LOCKED — idle timeout</span>
          ) : (
            "Authenticate to arm hardware controls."
          )}
        </p>
        <input
          autoFocus
          type="password"
          autoComplete="current-password"
          className={`${inputCls} mt-6`}
          placeholder="access key"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? (
          <p className="cd-chamfer mt-3 border border-cd-red/30 bg-cd-red/5 px-3 py-2 font-cd-mono text-[11px] tracking-wider text-cd-red">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !password}
          className="cd-chamfer mt-5 w-full border border-cd-cyan/50 bg-cd-cyan/10 px-4 py-3 font-cd-mono text-xs tracking-[0.3em] text-cd-cyan transition-all hover:bg-cd-cyan/20 hover:shadow-[0_0_18px_rgba(56,225,255,0.25)] disabled:opacity-40"
        >
          {busy ? "VERIFYING…" : "AUTHENTICATE"}
        </button>
      </form>

      <div className="cd-vignette pointer-events-none absolute inset-0" />
      <div className="cd-scanlines pointer-events-none absolute inset-0" />
    </div>
  );
}
