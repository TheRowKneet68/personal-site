import { useCallback, useEffect, useState, type RefObject } from "react";

export function useScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (): void => setMatches(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

export function useCopyToClipboard(text: string): { copied: boolean; copy: () => Promise<void> } {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("copy manually:", text);
    }
  }, [text]);
  return { copied, copy };
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

/** One entrance per element: `armed` once it is known to be off-screen, `on` when
    it first scrolls into view. Already-visible elements, reduced-motion users and
    browsers without IntersectionObserver never arm, so nothing waits on motion. */
export function useRevealOnce<T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = "0px 0px -15% 0px",
): { armed: boolean; on: boolean } {
  const [state, setState] = useState<"idle" | "armed" | "on">("idle");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined" || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return;
    setState("armed");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("on");
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return { armed: state !== "idle", on: state === "on" };
}

/** Content-box width of an element, kept current with ResizeObserver. */
export function useElementWidth<T extends Element>(ref: RefObject<T | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/** Counts 0 -> target once `run` turns true (ease-out). Reduced motion: no count. */
export function useCountUp(target: number, run: boolean, ms = 1300): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (!run || prefersReducedMotion()) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return value;
}
