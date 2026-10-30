import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useData, type LoadStep } from "../context/DataContext";
import { SITE } from "../lib/constants";
import { isNativeApp } from "../lib/native";
import { detectPlatform, platformIcon, platformName } from "../lib/platforms";
import { hasScene, socialScene, type ScenePlatform } from "../lib/outboundScenes";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

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
    const id = window.setTimeout(() => setMinDone(true), MIN_MS - (performance.now() - started.current));
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
  const [run, setRun] = useState(0);
  const busy = useRef(false);
  const closing = useRef(0);

  useEffect(() => {
    const run = async (url: string): Promise<void> => {
      if (busy.current) return;
      busy.current = true;
      clearTimeout(closing.current);
      setRun((n) => n + 1);
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
      busy.current = false; // a new click may start the next one straight away
      closing.current = window.setTimeout(() => setJob(null), 520);
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
    <Board key={run} exit={exit}>
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

const esc = (t: string): string => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** What /go.html shows in the new tab before moving on to `to`. */
interface GoPage {
  title: string;
  css: string;
  html: string;
  to: string;
  ms: number;
  bg: string;
}

/** The board version: traces draw in, "connecting to host", then it moves on. */
function outboundPage(url: URL): GoPage {
  const css = getComputedStyle(document.documentElement);
  const v = (n: string): string => css.getPropertyValue(n).trim();
  const [bg, ink, dim, accent] = [v("--rk-bg"), v("--rk-ink"), v("--rk-ink-faint"), v("--rk-accent")];
  const local = url.origin === location.origin;
  const platform = local ? null : detectPlatform(url.href);
  if (hasScene(platform)) return socialPage(url, platform, { bg, ink, dim });
  const traces = TRACES.map((t, i) => `<path d="${t.d}" pathLength="1" style="animation-delay:${i * 18}ms"/>`).join("");
  const host = esc(local ? (url.pathname.split("/").pop() || url.pathname) : url.hostname.replace(/^www\./, ""));
  return {
    title: `Opening ${host}`,
    to: url.href,
    ms: 800,
    bg,
    css: `body{color:${dim};background-image:radial-gradient(color-mix(in oklab,${ink} 9%,transparent) 1px,transparent 1.4px);background-size:22px 22px}
svg{position:fixed;inset:0;width:100%;height:100%}
path,rect{fill:none;stroke:${accent};vector-effect:non-scaling-stroke}
path{stroke-opacity:.5;stroke-width:1.6;stroke-dasharray:1 1;stroke-dashoffset:-1;animation:d .5s cubic-bezier(.6,0,.3,1) forwards}
rect{stroke-width:2;stroke-dasharray:1 1;stroke-dashoffset:1;animation:d .4s ease-out .3s forwards;filter:drop-shadow(0 0 8px ${accent})}
.logo{position:fixed;top:50%;left:50%;width:12vmax;aspect-ratio:1;transform:translate(-50%,-50%);background:${ink};
-webkit-mask:url(/images/logo-mask.png) center/contain no-repeat;mask:url(/images/logo-mask.png) center/contain no-repeat;
clip-path:inset(0 0 100% 0);animation:r .35s steps(10,end) .35s forwards;filter:drop-shadow(0 0 10px ${accent})}
p{position:fixed;left:0;right:0;top:calc(50% + 9vmax + 1.5rem);text-align:center;margin:0}
b{color:${accent};font-weight:600}
@keyframes d{to{stroke-dashoffset:0}}@keyframes r{to{clip-path:inset(0)}}
@media (prefers-reduced-motion:reduce){rect,.logo{filter:none}}`,
    html: `<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">${traces}<rect x="410" y="410" width="180" height="180" rx="6" pathLength="1"/></svg>
<div class="logo"></div><p>${local ? "opening" : "connecting to"} <b>${host}</b> ...</p>`,
  };
}

/** The platform's icon as SVG markup, drawn with the same icon set as the site. */
function iconMarkup(platform: string): string {
  const el = document.createElement("div");
  const root = createRoot(el);
  const Icon = platformIcon(platform);
  flushSync(() => root.render(<Icon />));
  const svg = el.innerHTML;
  root.unmount();
  return svg;
}

function socialPage(url: URL, platform: ScenePlatform, t: { bg: string; ink: string; dim: string }): GoPage {
  const { css, html } = socialScene(platform, iconMarkup(platform));
  const name = esc(platformName(platform));
  return {
    title: `Opening ${name}`,
    to: url.href,
    ms: 900,
    bg: t.bg,
    css: `:root{--bg:${t.bg};--ink:${t.ink}}
body{color:${t.ink};display:grid;place-items:center}
.col{display:flex;flex-direction:column;align-items:center}
p{margin:2.2rem 0 0;color:${t.dim};text-align:center;animation:fade .3s ease .2s both}
b{color:${t.ink};font-weight:600}
@keyframes fade{from{opacity:0}}
${css}
@media (prefers-reduced-motion:reduce){.flash{display:none}*{filter:none!important}}`,
    html: `<div class="col">${html}<p>opening <b>${name}</b> ...</p></div>`,
  };
}

/** The scene as a standalone document, shown in a full-screen iframe so its
    styles can't touch the site's and it is sized by the screen, not a tab. */
const goDoc = (g: GoPage): string => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;overflow:hidden;background:${g.bg};font:13px/1.4 "JetBrains Mono",ui-monospace,monospace}${g.css}</style>
</head><body>${g.html}</body></html>`;

/** Links to other sites (and same-site new-tab links like the PDF) play their
    scene here on the page, then open. Opening right after the scene still
    counts as the tap that started it; if a browser blocks it anyway, the link
    opens in this tab instead. The new site gets no handle back to this page. */
export function OutboundLinks() {
  const [scene, setScene] = useState<{ doc: string; open: () => void; run: number } | null>(null);

  useEffect(() => {
    let run = 0;
    let timer = 0;
    const onClick = (e: MouseEvent): void => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || isNativeApp()) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || a.hasAttribute("download")) return;
      const url = new URL(a.href);
      const sameSite = url.origin === location.origin;
      if (!/^https?:$/.test(url.protocol) || (sameSite && a.target !== "_blank")) return;
      e.preventDefault();
      const page = outboundPage(url);
      let done = false;
      const open = (): void => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        setScene(null);
        const w = window.open(url.href, "_blank");
        if (w) w.opener = null;
        else location.assign(url.href); // popup blocked: open it here
      };
      setScene({ doc: goDoc(page), open, run: ++run });
      timer = window.setTimeout(open, page.ms);
    };
    document.addEventListener("click", onClick);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", onClick);
    };
  }, []);

  if (!scene) return null;
  return (
    <div key={scene.run} className="fixed inset-0 z-[100]" role="status" aria-live="polite">
      <iframe title="Opening link" srcDoc={scene.doc} className="size-full border-0" />
      {/* taps land here, not in the iframe: a tap opens the link straight away */}
      <div className="absolute inset-0 cursor-pointer" onClick={scene.open} />
    </div>
  );
}

type Action = { title: string; working: string; done: string; state: "work" | "done" | "fail" };
let showAction: ((a: Action | "exit") => void) | null = null;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Run a real task behind the board: "working" while it runs, then "done" (or
    "failed", and the error is rethrown for the caller to show), then power off. */
export async function runBoard<T>(title: string, working: string, done: string, task: () => Promise<T>, minMs = 1300): Promise<T> {
  const show = showAction;
  if (!show) return task();
  const started = performance.now();
  show({ title, working, done, state: "work" });
  try {
    const result = await task();
    await sleep(Math.max(0, minMs - (performance.now() - started)));
    show({ title, working, done, state: "done" });
    await sleep(550);
    return result;
  } catch (err) {
    show({ title, working, done, state: "fail" });
    await sleep(1200);
    throw err;
  } finally {
    show("exit");
  }
}

/** Mounted once; runBoard() drives it. */
export function ActionBoard() {
  const [action, setAction] = useState<Action | null>(null);
  const [exit, setExit] = useState(false);
  const [run, setRun] = useState(0);
  useEffect(() => {
    let t = 0;
    showAction = (a) => {
      clearTimeout(t);
      if (a === "exit") {
        setExit(true);
        t = window.setTimeout(() => setAction(null), 520);
      } else {
        if (a.state === "work") setRun((n) => n + 1);
        setExit(false);
        setAction(a);
      }
    };
    return () => {
      showAction = null;
      clearTimeout(t);
    };
  }, []);

  if (!action) return null;
  const line = action.state === "work" ? action.working : action.state === "done" ? action.done : "failed";
  return (
    <Board key={run} exit={exit}>
      <div className="boot-readout absolute left-1/2 w-[16rem] -translate-x-1/2 rounded-[3px] border border-line bg-bg/90 px-4 py-3 font-mono text-[0.78rem] backdrop-blur-sm">
        <p className="boot-pct flex items-baseline justify-between border-b border-line pb-1.5">
          <span className="text-ink-faint">{action.title}</span>
          <span className={`text-[1.05rem] font-semibold ${action.state === "fail" ? "text-warn" : "text-accent"}`}>
            {action.state === "done" ? "ok" : action.state === "fail" ? "x" : ""}
          </span>
        </p>
        <p className={`boot-step mt-2 ${action.state === "done" ? "text-accent" : action.state === "fail" ? "text-warn" : "text-ink-dim"}`}>
          {line}
          {action.state === "work" ? <span className="boot-wait"> ...</span> : null}
        </p>
      </div>
      <p className="sr-only">
        {action.title}: {line}
      </p>
    </Board>
  );
}
