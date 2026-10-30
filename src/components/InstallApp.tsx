import { useEffect, useRef, useState } from "react";
import { EllipsisVertical, Share, SquarePlus } from "lucide-react";
import { useMediaQuery } from "../hooks";
import { isNativeApp } from "../lib/native";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Chrome fires this once, often before React mounts, so catch it at module load.
let deferred: PromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((l) => l());
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // keep it for our button instead of Chrome's mini-bar
  deferred = e as PromptEvent;
  notify();
});
window.addEventListener("appinstalled", () => {
  deferred = null;
  notify();
});

const isIos = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** "prompt": the browser can install it. "ios"/"menu": show the steps for that browser. null: nothing to offer. */
function useInstall(): "prompt" | "ios" | "menu" | null {
  const [, rerender] = useState(0);
  const touch = useMediaQuery("(pointer: coarse)"); // phones and tablets only
  const standalone = useMediaQuery("(display-mode: standalone)") || (navigator as { standalone?: boolean }).standalone === true;
  useEffect(() => {
    const l = (): void => rerender((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  if (!touch || standalone || isNativeApp()) return null;
  if (deferred) return "prompt";
  return isIos() ? "ios" : "menu"; // no prompt yet (or never): the browser menu still works
}

/** "Install app" link; renders nothing where installing isn't possible. */
export function InstallApp({ className }: { className?: string }) {
  const mode = useInstall();
  const dialog = useRef<HTMLDialogElement>(null);
  if (!mode) return null;

  const onClick = async (): Promise<void> => {
    const e = deferred;
    if (mode !== "prompt" || !e) return dialog.current?.showModal();
    await e.prompt();
    await e.userChoice; // the event is single-use either way
    deferred = null;
    notify();
  };

  return (
    <>
      <button type="button" onClick={() => void onClick()} className={className}>
        Install app
      </button>
      {mode !== "prompt" ? (
        <dialog
          ref={dialog}
          aria-labelledby="ios-install-title"
          onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
          className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-[4px] border border-line bg-surface p-6 text-ink backdrop:bg-black/50"
        >
          <h2 id="ios-install-title" className="text-[1.1rem] font-semibold">
            Add this site to your Home Screen
          </h2>
          <ol className="mt-4 grid gap-3 text-[0.95rem] text-ink-dim">
            <li className="flex items-center gap-3">
              {mode === "ios" ? (
                <Share className="size-5 shrink-0 text-accent" aria-hidden />
              ) : (
                <EllipsisVertical className="size-5 shrink-0 text-accent" aria-hidden />
              )}
              <span>
                Tap <span className="font-semibold text-ink">{mode === "ios" ? "Share" : "the ⋮ menu"}</span> in the browser bar.
              </span>
            </li>
            <li className="flex items-center gap-3">
              <SquarePlus className="size-5 shrink-0 text-accent" aria-hidden />
              <span>
                Choose <span className="font-semibold text-ink">{mode === "ios" ? "Add to Home Screen" : "Install app or Add to Home screen"}</span>.
              </span>
            </li>
          </ol>
          <form method="dialog" className="mt-6 flex justify-end">
            <button className="min-h-11 rounded-[3px] border border-line px-4 font-medium hover:bg-raised">Got it</button>
          </form>
        </dialog>
      ) : null}
    </>
  );
}
