import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useData, type LoadStep } from "../context/DataContext";
import { SITE } from "../lib/constants";

/* Circuit-board boot. The SVG is a 1000-unit square centred on the screen
   (slice), the chip is 410..590, and 16 traces fan out from its pins to the
   screen edges with one 45-degree bend each. The HTML logo sits on the chip
   because both are sized in vmax. */
const C = 500;
const CHIP = 90; // half the chip side
const PINS = [-60, -20, 20, 60]; // pin offsets along each side
// outer pins leave sooner and bend further, so neighbouring traces never cross
const RUN = { 60: [26, 130], 20: [70, 54] } as const;

type Trace = { d: string; via: [number, number] };
const TRACES: Trace[] = [0, 90, 180, 270].flatMap((deg) => {
  const r = (deg * Math.PI) / 180;
  const rot = (x: number, y: number): [number, number] => {
    const dx = x - C;
    const dy = y - C;
    return [Math.round(C + dx * Math.cos(r) - dy * Math.sin(r)), Math.round(C + dx * Math.sin(r) + dy * Math.cos(r))];
  };
  return PINS.map((o) => {
    const [a, b] = RUN[Math.abs(o) as 60 | 20];
    const s = Math.sign(o);
    const x = C + o;
    const y0 = C - CHIP;
    const pts = [rot(x, y0), rot(x, y0 - a), rot(x + s * b, y0 - a - b), rot(x + s * b, -40)];
    return { d: `M${pts.map((p) => p.join(",")).join("L")}`, via: pts[2]! };
  });
});

const STEPS: LoadStep[] = ["profile", "projects", "skills", "experience", "stats"];
const MIN_MS = 1900;

/** The circuit board, chip and scanning logo; the readout goes in children. */
function Board({ exit, onPointerDown, children }: { exit: boolean; onPointerDown?: () => void; children: ReactNode }) {
  return (
    <div
      className={`boot fixed inset-0 z-[100] overflow-hidden bg-bg ${exit ? "is-exit" : ""}`}
      role="status"
      aria-live="polite"
      onPointerDown={onPointerDown}
    >
      <svg className="boot-board absolute inset-0 size-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g className="boot-traces">
          {TRACES.map((t, i) => (
            <path key={i} d={t.d} pathLength={1} style={{ ["--i" as string]: i }} />
          ))}
        </g>
        <g className="boot-pulses">
          {TRACES.map((t, i) => (
            <path key={i} d={t.d} pathLength={1} style={{ ["--i" as string]: (i * 7) % 16 }} />
          ))}
        </g>
        <g className="boot-vias">
          {TRACES.map((t, i) => (
            <circle key={i} cx={t.via[0]} cy={t.via[1]} r={4.5} style={{ ["--i" as string]: i }} />
          ))}
        </g>
        <rect className="boot-chip" x={C - CHIP} y={C - CHIP} width={CHIP * 2} height={CHIP * 2} rx={6} pathLength={1} />
      </svg>

      <div className="boot-logo absolute top-1/2 left-1/2" aria-hidden>
        <div className="boot-logo-art" />
        <div className="boot-scan" />
      </div>

      {children}
    </div>
  );
}

/** First-open boot screen: traces converge on the chip, the logo scans in,
    and the steps below tick as the real requests answer. Tap to skip. */
export function LoadingScreen({ show }: { show: boolean }) {
  const { status, loaded, projects } = useData();
  const [phase, setPhase] = useState<"on" | "exit" | "off">(show ? "on" : "off");
  const started = useRef(performance.now());
  const [minDone, setMinDone] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    const quick = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => setMinDone(true), quick ? 0 : MIN_MS - (performance.now() - started.current));
    return () => clearTimeout(id);
  }, []);

  const finished = status !== "loading" || !show;
  useEffect(() => {
    if (phase !== "on" || !finished || !(minDone || skipped || status === "error")) return;
    setPhase("exit");
  }, [phase, finished, minDone, skipped, status]);
  useEffect(() => {
    if (phase !== "exit") return;
    const id = window.setTimeout(() => setPhase("off"), 520);
    return () => clearTimeout(id);
  }, [phase]);

  if (phase === "off") return null;
  const pct = Math.round((loaded.length / STEPS.length) * 100);

  return (
    <Board exit={phase === "exit"} onPointerDown={() => setSkipped(true)}>
      <div className="boot-readout absolute left-1/2 w-[16rem] -translate-x-1/2 rounded-[3px] border border-line bg-bg/90 px-4 py-3 font-mono text-[0.78rem] backdrop-blur-sm">
        <p className="boot-pct flex items-baseline justify-between border-b border-line pb-1.5 text-ink">
          <span className="text-ink-faint">loading</span>
          <span className="tabular text-[1.05rem] font-semibold text-accent">{pct}%</span>
        </p>
        <ul className="mt-2 grid gap-1">
          {STEPS.map((s, i) => {
            const ok = loaded.includes(s);
            return (
              <li key={s} className="boot-step flex justify-between" style={{ ["--i" as string]: i }}>
                <span className={ok ? "text-ink-dim" : "text-ink-faint"}>{s}</span>
                <span className={ok ? "text-accent" : "boot-wait text-ink-faint"}>
                  {ok ? (s === "projects" && projects ? `${projects.length} ok` : "ok") : "..."}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="sr-only">Loading, {pct} percent</p>
    </Board>
  );
}

/** Short scan-line wipe whenever the page (not the hash) changes. */
export function RouteWipe() {
  const { pathname } = useLocation();
  const first = useRef(true);
  const [wipe, setWipe] = useState<string | null>(null);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setWipe(pathname);
    const id = window.setTimeout(() => setWipe(null), 650);
    return () => clearTimeout(id);
  }, [pathname]);

  if (!wipe) return null;
  return (
    <div key={wipe} className="wipe pointer-events-none fixed inset-0 z-[90]" aria-hidden>
      <div className="wipe-panel absolute inset-0 bg-bg">
        <div className="boot-logo wipe-logo absolute top-1/2 left-1/2">
          <div className="boot-logo-art" />
        </div>
        <p className="absolute bottom-6 left-6 font-mono text-[0.75rem] text-accent">{wipe}</p>
      </div>
      <div className="wipe-line absolute inset-x-0 h-[2px] bg-accent" />
    </div>
  );
}

const RESUME_EVENT = "rk:resume";
/** Start the résumé download from code (the command palette). */
export const startResume = (): void => void window.dispatchEvent(new Event(RESUME_EVENT));

type Job = { url: string; got: number; total: number; state: "build" | "fail" | "done" };

/** The résumé is built live on the server, so cover the wait with the board and
    real byte progress, then hand the file over. Every link to it routes here. */
export function ResumeDownload() {
  const [job, setJob] = useState<Job | null>(null);
  const [exit, setExit] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    const run = async (url: string): Promise<void> => {
      if (busy.current) return;
      busy.current = true;
      setExit(false);
      const set = (j: Partial<Job>): void => setJob((o) => ({ url, got: 0, total: 0, state: "build", ...o, ...j }));
      set({ got: 0, total: 0, state: "build" });
      const started = performance.now();
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || !res.body) throw new Error(String(res.status));
        const total = Number(res.headers.get("content-length")) || 0;
        const reader = res.body.getReader();
        const parts: Uint8Array[] = [];
        let got = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value);
          got += value.length;
          set({ got, total });
        }
        const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "resume.pdf";
        // let the logo finish scanning in before the board powers off
        await new Promise((r) => setTimeout(r, Math.max(0, 1300 - (performance.now() - started))));
        const href = URL.createObjectURL(new Blob(parts as BlobPart[], { type: "application/pdf" }));
        const a = Object.assign(document.createElement("a"), { href, download: name });
        a.click();
        setTimeout(() => URL.revokeObjectURL(href), 10_000);
        set({ state: "done" });
      } catch {
        set({ state: "fail" });
        await new Promise((r) => setTimeout(r, 1400));
        location.assign(url); // a delayed window.open would be popup-blocked
      }
      setExit(true);
      setTimeout(() => {
        setJob(null);
        busy.current = false;
      }, 520);
    };

    const onClick = (e: MouseEvent): void => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || !/\/resume\.pdf$/.test(a.pathname)) return;
      e.preventDefault();
      void run(a.href);
    };
    const onEvent = (): void => void run(new URL(SITE.resume, location.href).href);
    document.addEventListener("click", onClick);
    window.addEventListener(RESUME_EVENT, onEvent);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(RESUME_EVENT, onEvent);
    };
  }, []);

  if (!job) return null;
  const kb = (n: number): string => `${Math.max(1, Math.round(n / 1024))} KB`;
  const status =
    job.state === "fail" ? "failed, opening directly" : job.state === "done" ? "downloaded" : job.got ? `received ${kb(job.got)}` : "building on the server";
  return (
    <Board exit={exit}>
      <div className="boot-readout absolute left-1/2 w-[16rem] -translate-x-1/2 rounded-[3px] border border-line bg-bg/90 px-4 py-3 font-mono text-[0.78rem] backdrop-blur-sm">
        <p className="boot-pct flex items-baseline justify-between border-b border-line pb-1.5">
          <span className="text-ink-faint">resume.pdf</span>
          <span className="tabular text-[1.05rem] font-semibold text-accent">
            {job.total ? `${Math.round((job.got / job.total) * 100)}%` : job.state === "done" ? "100%" : ""}
          </span>
        </p>
        <p className={`boot-step mt-2 ${job.state === "fail" ? "text-ink" : job.state === "done" ? "text-accent" : "text-ink-dim"}`}>
          {status}
          {job.state === "build" ? <span className="boot-wait"> ...</span> : null}
        </p>
      </div>
      <p className="sr-only">Résumé: {status}</p>
    </Board>
  );
}
