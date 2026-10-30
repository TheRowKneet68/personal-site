import { useEffect, useRef, useState } from "react";
import { Download, EllipsisVertical, Share, SquarePlus } from "lucide-react";
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

const isMacSafari = (): boolean => /Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg|Firefox/.test(navigator.userAgent);

type Mode = "prompt" | "ios" | "menu" | "mac";
/** "prompt": the browser can install it. Others: show that browser's steps. null: nothing to offer. */
function useInstall(): Mode | null {
  const [, rerender] = useState(0);
  const touch = useMediaQuery("(pointer: coarse)");
  const standalone = useMediaQuery("(display-mode: standalone)") || (navigator as { standalone?: boolean }).standalone === true;
  useEffect(() => {
    const l = (): void => rerender((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  if (standalone || isNativeApp()) return null;
  if (deferred) return "prompt";
  if (isIos()) return "ios";
  if (touch) return "menu"; // Android without a prompt yet: the browser menu still works
  return isMacSafari() ? "mac" : null; // desktop Chrome/Edge only offer it via the prompt; Firefox can't install
}

const STEPS: Record<Exclude<Mode, "prompt">, [string, string]> = {
  ios: ["Share", "Add to Home Screen"],
  menu: ["the ⋮ menu", "Install app or Add to Home screen"],
  mac: ["File", "Add to Dock"],
};

/** "Install app" button; renders nothing where installing isn't possible. */
export function InstallApp({ className, icon = false }: { className?: string; icon?: boolean }) {
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
      <button
        type="button"
        onClick={() => void onClick()}
        className={className}
        aria-label={icon ? "Install app" : undefined}
        title={icon ? "Install app" : undefined}
      >
        {icon ? <Download className="size-[18px]" aria-hidden /> : "Install app"}
      </button>
      {mode !== "prompt" ? (
        <dialog
          ref={dialog}
          aria-labelledby="ios-install-title"
          onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
          className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-[4px] border border-line bg-surface p-6 text-ink backdrop:bg-black/50"
        >
          <h2 id="ios-install-title" className="text-[1.1rem] font-semibold">
            {mode === "mac" ? "Add this site to your Dock" : "Add this site to your Home Screen"}
          </h2>
          <ol className="mt-4 grid gap-3 text-[0.95rem] text-ink-dim">
            <li className="flex items-center gap-3">
              {mode === "ios" ? (
                <Share className="size-5 shrink-0 text-accent" aria-hidden />
              ) : (
                <EllipsisVertical className="size-5 shrink-0 text-accent" aria-hidden />
              )}
              <span>
                {mode === "mac" ? "Open the" : "Tap"} <span className="font-semibold text-ink">{STEPS[mode][0]}</span>{" "}
                {mode === "mac" ? "menu." : "in the browser bar."}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <SquarePlus className="size-5 shrink-0 text-accent" aria-hidden />
              <span>
                Choose <span className="font-semibold text-ink">{STEPS[mode][1]}</span>.
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
