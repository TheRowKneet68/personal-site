import { useEffect, useState } from "react";

/* Short scenes for actions that hand over to another app (dialer, mail) and
   for sending a message: a ringing phone, a letter sealed and flown off, and a
   bird carrying the letter while the message really sends. */

type Kind = "call" | "mail" | "bird";
type State = "go" | "done" | "fail";
type Scene = { kind: Kind; caption: string; state: State; run: number };

let show: ((s: Scene | null) => void) | null = null;
let skip: (() => void) | null = null;
let run = 0;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Play a scene for `ms` (a tap ends it sooner), then close it. */
async function play(kind: Kind, caption: string, ms: number): Promise<void> {
  if (!show) return;
  show({ kind, caption, state: "go", run: ++run });
  await Promise.race([sleep(ms), new Promise<void>((r) => (skip = r))]);
  skip = null;
  show(null);
}

/** The bird carries the letter for as long as the real send takes, then flies
    off ("delivered") or drops it ("not sent", error rethrown for the form). */
export async function runBird<T>(task: () => Promise<T>): Promise<T> {
  const set = show;
  if (!set) return task();
  const id = ++run;
  const started = performance.now();
  set({ kind: "bird", caption: "sending your message", state: "go", run: id });
  try {
    const result = await task();
    await sleep(Math.max(0, 1400 - (performance.now() - started)));
    set({ kind: "bird", caption: "delivered", state: "done", run: id });
    await sleep(900);
    return result;
  } catch (err) {
    set({ kind: "bird", caption: "not sent", state: "fail", run: id });
    await sleep(1300);
    throw err;
  } finally {
    set(null);
  }
}

const PHONE =
  "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z";

function Art({ kind }: { kind: Kind }) {
  if (kind === "call")
    return (
      <div className="scene-call">
        {[0, 1, 2].map((i) => (
          <span key={i} className="scene-wave" style={{ ["--i" as string]: i }} />
        ))}
        <svg viewBox="0 0 24 24" className="scene-phone" aria-hidden>
          <path d={PHONE} />
        </svg>
      </div>
    );
  if (kind === "mail")
    return (
      <svg viewBox="0 0 120 92" className="scene-mail" aria-hidden>
        <g className="mail-fly">
          <g className="mail-trail">
            <path d="M-6 50h-26M-4 62h-38M-8 74h-22" />
          </g>
          <rect x="10" y="30" width="100" height="56" rx="3" className="mail-back" />
          <g className="mail-letter">
            <rect x="20" y="6" width="80" height="52" rx="2" />
            <path d="M30 18h44M30 27h60M30 36h52" />
          </g>
          <path d="M10 30 L60 62 L110 30 L110 86 L10 86 Z" className="mail-front" />
          <path d="M10 30 L60 62 L110 30 Z" className="mail-flap" />
          <circle cx="60" cy="60" r="6" className="mail-seal" />
        </g>
      </svg>
    );
  return (
    <svg viewBox="0 0 120 92" className="scene-bird" aria-hidden>
      <g className="bird-body">
        <path d="M40 46 L22 37 L28 47 L19 55 L40 52" className="bird-line" />
        <path d="M58 41 C52 22 40 12 28 9 C38 22 45 34 53 45" className="bird-wing bird-wing-back" />
        <path d="M38 44 C46 32 70 30 82 38 C90 43 88 52 78 55 C64 60 46 58 38 44 Z" className="bird-fill" />
        <circle cx="84" cy="36" r="8" className="bird-fill" />
        <path d="M91 34.5 L101 38 L91 41 Z" className="bird-beak" />
        <circle cx="86.5" cy="34" r="1.5" className="bird-eye" />
        <path d="M64 42 C67 24 77 12 92 7 C83 22 75 34 69 46" className="bird-wing bird-wing-front" />
        <g className="bird-letter">
          <path d="M58 56 V64 M68 56 V64" className="bird-line" />
          <rect x="50" y="64" width="26" height="17" rx="2" className="bird-paper" />
          <path d="M50 64 L63 73 L76 64" className="bird-line" />
        </g>
      </g>
    </svg>
  );
}

/** Mounted once. Phone and email links play their scene, then open the app. */
export function SceneLayer() {
  const [scene, setScene] = useState<Scene | null>(null);

  useEffect(() => {
    show = setScene;
    const onClick = (e: MouseEvent): void => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href^="tel:"], a[href^="mailto:"]');
      if (!(a instanceof HTMLAnchorElement) || a.dataset.handoff) return;
      e.preventDefault();
      const href = a.href;
      const call = href.startsWith("tel:");
      const who = decodeURIComponent(href.replace(/^(tel|mailto):/, "").split("?")[0] ?? "");
      // ~1s keeps it well inside the window phones allow for opening the app after a tap
      void play(call ? "call" : "mail", call ? `calling ${who}` : "opening your mail app", call ? 1100 : 1000).then(() => {
        // hand over through a throwaway link, so the page itself never sits mid-navigation
        const go = Object.assign(document.createElement("a"), { href });
        go.dataset.handoff = "1";
        document.body.append(go);
        go.click();
        go.remove();
      });
    };
    document.addEventListener("click", onClick);
    return () => {
      show = null;
      document.removeEventListener("click", onClick);
    };
  }, []);

  if (!scene) return null;
  return (
    <div
      key={scene.run}
      className={`scene fixed inset-0 z-[100] grid place-items-center bg-bg/95 backdrop-blur-sm is-${scene.state}`}
      role="status"
      aria-live="polite"
      onPointerDown={() => skip?.()}
    >
      <div className="flex flex-col items-center">
        <Art kind={scene.kind} />
        <p className={`scene-caption mt-6 font-mono text-[0.85rem] ${scene.state === "fail" ? "text-warn" : scene.state === "done" ? "text-accent" : "text-ink-dim"}`}>
          {scene.caption}
          {scene.state === "go" ? <span className="boot-wait"> ...</span> : scene.state === "done" ? " ✓" : null}
        </p>
      </div>
    </div>
  );
}
