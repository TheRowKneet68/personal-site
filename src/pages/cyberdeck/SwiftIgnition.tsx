import { useCallback, useEffect, useRef, useState } from "react";
import { Bluetooth, Lock, Unlock } from "lucide-react";
import { useIgnition } from "../../hooks/useIgnition";
import type { LinkState } from "../../hooks/useIgnition";
import { Chip, HudPanel } from "./hud";

/* ------------------------------------------------------------------ */
/*  SWIFT IGNITION — arc-reactor bike controller                       */
/*                                                                     */
/*  Safety model:                                                      */
/*   · Browser builds are SIMULATION ONLY (no radio access).           */
/*   · Crank is interlocked behind the unlock state ('O' first).       */
/*   · Hold-to-crank sends 'R' on touchdown and 'E' on ANY release     */
/*     (pointer up/cancel/leave, window blur, tab hide) and hard-caps  */
/*     at MAX_CRANK_MS to protect the starter motor.                   */
/* ------------------------------------------------------------------ */

const MAX_CRANK_MS = 5_000;
const CHARGE_TICK_MS = 100;

const STATE_LABEL: Record<LinkState, string> = {
  "web-sim": "SIMULATION / NATIVE ONLY",
  disconnected: "OFFLINE",
  connecting: "HANDSHAKING…",
  connected: "LINK STABLE",
  reconnecting: "RE-LINKING…",
};

const STATE_COLOR: Record<LinkState, string> = {
  "web-sim": "text-cd-amber",
  disconnected: "text-cd-red",
  connecting: "text-cd-amber",
  connected: "text-cd-green",
  reconnecting: "text-cd-amber",
};

/** Signal meter from measured write latency (EMA). */
function LatencyMeter({ bars }: { bars: 0 | 1 | 2 | 3 }) {
  return (
    <span className="flex items-end gap-0.5" title="write latency EMA">
      {[6, 9, 12, 15].map((h, i) => (
        <span
          key={h}
          style={{ height: h }}
          className={`w-1 ${i < bars ? "bg-cd-green shadow-[0_0_6px_rgba(61,255,171,0.7)]" : "bg-cd-line"}`}
        />
      ))}
    </span>
  );
}

const BIKE_STATE_KEY = "rk-bike-unlocked";
/** While held, 'R' is re-transmitted so one lost SPP byte can't strand the
 *  starter — the firmware re-asserts SLF LOW on every R it sees. */
const CRANK_REPEAT_MS = 600;

export function SwiftIgnition() {
  const ign = useIgnition();
  // Last commanded lock state survives app restarts; the link adoption in
  // useIgnition restores the transport, this restores the dashboard truth.
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(BIKE_STATE_KEY) === "1");
  const [cranking, setCranking] = useState(false);
  const [charge, setCharge] = useState(0);
  const crankingRef = useRef(false);
  const chargeTimer = useRef<number | null>(null);
  const repeatTimer = useRef<number | null>(null);

  const rememberUnlocked = useCallback((next: boolean): void => {
    try {
      localStorage.setItem(BIKE_STATE_KEY, next ? "1" : "0");
    } catch {
      /* best-effort */
    }
  }, []);

  /** Any release path funnels here — stop repeats, then exactly one 'x'. */
  const stopCrank = useCallback(() => {
    if (!crankingRef.current) return;
    crankingRef.current = false;
    setCranking(false);
    setCharge(0);
    for (const t of [chargeTimer, repeatTimer] as const) {
      if (t.current) {
        window.clearInterval(t.current);
        t.current = null;
      }
    }
    void ign.send("x").catch(() => undefined);
  }, [ign]);

  const startCrank = useCallback(() => {
    if (ign.status !== "connected" || !unlocked || crankingRef.current) return;
    crankingRef.current = true;
    setCranking(true);
    setCharge(0);
    void ign.send("R").catch(() => stopCrank());
    // Continuous crank bytes while held (user-requested): robust against
    // packet loss and the firmware's any-byte-releases else-branch.
    repeatTimer.current = window.setInterval(() => {
      if (ign.status === "connected") void ign.send("R").catch(() => undefined);
    }, CRANK_REPEAT_MS);
    chargeTimer.current = window.setInterval(() => {
      setCharge((c) => {
        const next = c + CHARGE_TICK_MS / MAX_CRANK_MS;
        if (next >= 1) {
          // Starter-motor ceiling: force release after MAX_CRANK_MS.
          stopCrank();
          return 0;
        }
        return next;
      });
    }, CHARGE_TICK_MS);
  }, [ign, stopCrank, unlocked]);

  // Safety disengage when the app loses focus mid-crank.
  useEffect(() => {
    if (!cranking) return;
    const kill = (): void => stopCrank();
    window.addEventListener("blur", kill);
    document.addEventListener("visibilitychange", kill);
    return () => {
      window.removeEventListener("blur", kill);
      document.removeEventListener("visibilitychange", kill);
    };
  }, [cranking, stopCrank]);

  // Voice commands from the Suraksha Ghar console (deck-voice events).
  const unlockVoice = useCallback(
    async (next: boolean): Promise<void> => {
      if (ign.status !== "connected") return;
      await ign.send(next ? "I" : "S").catch(() => undefined);
      rememberUnlocked(next);
      setUnlocked(next);
    },
    [ign, rememberUnlocked],
  );

  useEffect(() => {
    const onVoice = (e: Event): void => {
      const cmd = (e as CustomEvent<{ cmd: "O" | "S" | "R" | "E" }>).detail?.cmd;
      if (!cmd) return;
      if (cmd === "R") {
        // Crank pulse: hold for a beat, then the standard release path.
        startCrank();
        window.setTimeout(() => stopCrank(), 900);
      } else if (cmd === "E") stopCrank();
      else void unlockVoice(cmd === "O");
    };
    window.addEventListener("deck-voice", onVoice);
    return () => window.removeEventListener("deck-voice", onVoice);
  }, [startCrank, stopCrank, unlockVoice]);

  // Re-arm the interlock ONLY on a live→dead transition (dropped link mid-ride
  // = bike state unknown). At boot the status is merely "not yet adopted" —
  // resetting then would wipe the restored lock state for no reason.
  const prevStatus = useRef(ign.status);
  useEffect(() => {
    if (prevStatus.current === "connected" && ign.status !== "connected") {
      rememberUnlocked(false);
      setUnlocked(false);
      stopCrank();
    }
    prevStatus.current = ign.status;
  }, [ign.status, stopCrank, rememberUnlocked]);

  useEffect(
    () => () => {
      // unmount mid-hold: make sure the starter releases
      if (crankingRef.current) void ign.send("x").catch(() => undefined);
      for (const t of [chargeTimer, repeatTimer] as const) {
        if (t.current) window.clearInterval(t.current);
      }
    },
    [ign],
  );

  const toggleIgnition = async (): Promise<void> => {
    if (ign.status !== "connected") return;
    const next = !unlocked;
    setUnlocked(next); // optimistic
    try {
      await ign.send(next ? "I" : "S");
      rememberUnlocked(next);
    } catch {
      setUnlocked(!next);
    }
  };

  const CIRC = 2 * Math.PI * 70;
  const linkLive = ign.status === "connected";

  return (
    <div className="space-y-4">
      {/* ---- BT-SPP uplink ---- */}
      <HudPanel
        label="BT-SPP UPLINK"
        right={<LatencyMeter bars={ign.bars} />}
      >
        {!ign.native ? (
          <p className="cd-chamfer mb-4 border border-cd-amber/30 bg-cd-amber/5 px-3 py-2 font-cd-mono text-[10px] tracking-[0.22em] text-cd-amber">
            ⚠ SIMULATION MODE — BLUETOOTH REQUIRES THE ANDROID APK
          </p>
        ) : null}
        <div className="space-y-2.5 font-cd-mono text-[11px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 tracking-[0.22em] text-cd-dim">
              <Bluetooth size={12} /> TARGET
            </span>
            <span className="tracking-wider text-cd-white">{ign.mac || "UNCONFIGURED"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="tracking-[0.22em] text-cd-dim">STATE</span>
            <span className={`${STATE_COLOR[ign.status]} tracking-[0.22em]`}>
              {STATE_LABEL[ign.status]}
              {linkLive && ign.latency !== null ? ` · ${Math.round(ign.latency)}ms` : ""}
            </span>
          </div>
          {ign.error ? <p className="text-cd-red">{ign.error}</p> : null}
          <button
            onClick={linkLive ? ign.disconnect : ign.connect}
            className={`cd-chamfer mt-1 w-full whitespace-nowrap border px-3 py-2.5 text-[10px] tracking-[0.26em] transition-colors ${
              linkLive
                ? "border-cd-red/40 bg-cd-red/5 text-cd-red hover:bg-cd-red/15"
                : "border-cd-cyan/50 bg-cd-cyan/10 text-cd-cyan hover:bg-cd-cyan/20 hover:shadow-[0_0_16px_rgba(56,225,255,0.25)]"
            }`}
          >
            {linkLive ? "DISCONNECT" : ign.status === "connecting" || ign.status === "reconnecting" ? "WORKING…" : "CONNECT DEVICE"}
          </button>
        </div>
      </HudPanel>

      {/* ---- ignition lock ---- */}
      <HudPanel label="IGNITION CONTROL">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center border transition-all duration-300 ${
                unlocked
                  ? "border-cd-green/40 bg-cd-green/10 shadow-[0_0_14px_rgba(61,255,171,0.25)]"
                  : "border-cd-line bg-black/30"
              }`}
            >
              {unlocked ? <Unlock size={17} className="text-cd-green" /> : <Lock size={17} className="text-cd-red/80" />}
            </span>
            <div>
              <p className={`font-cd-mono text-[15px] tracking-wide ${unlocked ? "text-cd-white" : "text-cd-dim"}`}>
                {unlocked ? "UNLOCKED" : "LOCKED"}
              </p>
            </div>
          </div>
          <button
            onClick={() => void toggleIgnition()}
            disabled={!linkLive}
            role="switch"
            aria-checked={unlocked}
            className={`relative h-9 w-[68px] shrink-0 border transition-all duration-200 disabled:opacity-40 ${
              unlocked ? "border-cd-green/60 bg-cd-green/10 shadow-[0_0_18px_rgba(61,255,171,0.3)]" : "border-cd-line bg-black/40"
            }`}
          >
            <span
              className={`absolute bottom-1 top-1 left-1 w-7 transition-all duration-200 ${
                unlocked ? "translate-x-[32px] bg-cd-green shadow-[0_0_12px_rgba(61,255,171,0.9)]" : "bg-cd-red/50"
              }`}
            />
            <span
              className={`pointer-events-none absolute inset-0 flex items-center justify-center font-cd-mono text-[8px] tracking-[0.3em] transition-colors ${
                unlocked ? "text-cd-green/90" : "text-cd-dim/50"
              }`}
            >
              {unlocked ? "ON" : "OFF"}
            </span>
          </button>
        </div>
      </HudPanel>

      {/* ---- arc reactor crank ---- */}
      <HudPanel label="ARC REACTOR · STARTER" right={<Chip>{unlocked ? "ARMED" : "INTERLOCKED"}</Chip>}>
        <div className="flex flex-col items-center py-2">
          <button
            type="button"
            aria-label="Hold to crank engine"
            disabled={!linkLive || !unlocked}
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              e.preventDefault();
              startCrank();
            }}
            onPointerUp={stopCrank}
            onPointerCancel={stopCrank}
            onPointerLeave={stopCrank}
            onContextMenu={(e) => e.preventDefault()}
            className={`relative select-none outline-none transition-transform duration-150 disabled:cursor-not-allowed ${cranking ? "scale-95" : "active:scale-95"}`}
          >
            <svg width="200" height="200" viewBox="0 0 200 200" className={cranking ? "engine-crank-shake" : undefined}>
              {/* rotating decorative ring */}
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 7"
                className={`${cranking ? "text-cd-amber animate-spin" : "text-cd-cyan"} opacity-40`}
                style={{ transformOrigin: "center" }}
              />
              {/* static hull ring */}
              <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(56,225,255,0.18)" strokeWidth="2" />
              {/* charge progress ring */}
              <circle
                cx="100"
                cy="100"
                r="70"
                fill="none"
                stroke={cranking ? "#ffb454" : "#38e1ff"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - charge)}
                transform="rotate(-90 100 100)"
                opacity={linkLive && unlocked ? 1 : 0.25}
                style={{ filter: `drop-shadow(0 0 6px ${cranking ? "#ffb454" : "#38e1ff"})`, transition: "stroke 200ms" }}
              />
              {/* core */}
              <circle
                cx="100"
                cy="100"
                r="46"
                className={cranking ? "fill-cd-amber/15 animate-pulse" : "fill-cd-cyan/5"}
                style={{ filter: cranking ? "drop-shadow(0 0 24px rgba(255,180,84,0.55))" : undefined }}
              />
              <circle cx="100" cy="100" r="34" fill="none" stroke={cranking ? "#ffb454" : "rgba(56,225,255,0.35)"} strokeWidth="1" />
              {/* hologram of the Super Splendor — headlight + pilot lamp
                  blink 1s while unlocked, everything burns solid on crank */}
              <g
                className={`transition-opacity duration-300 ${unlocked ? "opacity-100" : "opacity-35"}`}
                style={{
                  color: cranking ? "#ffb454" : "#38e1ff",
                  filter: `drop-shadow(0 0 ${cranking ? 5 : 3}px ${cranking ? "rgba(255,180,84,0.8)" : "rgba(56,225,255,0.55)"})`,
                }}
                transform="translate(68 82)"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* wheels */}
                <circle cx="11" cy="26" r="7" />
                <circle cx="53" cy="26" r="7" />
                {/* frame */}
                <path d="M11 26 L22 12 L40 12 L53 26" />
                <path d="M22 12 L30 26 L47 26" opacity="0.7" />
                {/* seat + handlebar */}
                <path d="M17 12 H27" strokeWidth="1.8" />
                <path d="M40 12 L45 6 H51" />
                {/* headlight */}
                <circle
                  cx="57"
                  cy="9"
                  r="2.8"
                  className={
                    cranking
                      ? "fill-cd-amber/90 stroke-cd-amber"
                      : unlocked && linkLive
                        ? "bike-blink fill-cd-cyan/80 stroke-cd-cyan"
                        : "stroke-current"
                  }
                />
                {/* pilot / sidelight */}
                <circle
                  cx="51.5"
                  cy="15.5"
                  r="1.5"
                  className={
                    cranking
                      ? "fill-cd-amber/90 stroke-cd-amber"
                      : unlocked && linkLive
                        ? "bike-blink fill-cd-cyan/70 stroke-cd-cyan"
                        : "stroke-current"
                  }
                />
              </g>
            </svg>
          </button>
          <p className={`mt-3 whitespace-nowrap font-cd-mono text-[10px] tracking-[0.24em] sm:text-[11px] ${cranking ? "animate-pulse text-cd-amber" : unlocked && linkLive ? "text-cd-white/80" : "text-cd-dim/70"}`}>
            {!linkLive ? "LINK REQUIRED" : !unlocked ? "IGNITION INTERLOCKED" : cranking ? `CRANKING · ${Math.round(charge * MAX_CRANK_MS / 1000)}s` : "HOLD TO CRANK"}
          </p>

        </div>
      </HudPanel>

      {/* ---- event log (bottom of the deck) ---- */}
      <HudPanel label="EVENT LOG">
        <div className="text-[9px] leading-relaxed text-cd-dim/60">
          {ign.log.length === 0 ? "NO EVENTS" : ign.log.map((line) => <div key={line}>{line}</div>)}
        </div>
      </HudPanel>
    </div>
  );
}
