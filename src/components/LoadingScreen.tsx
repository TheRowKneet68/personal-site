import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect } from "react";

const BOOT_LINES = [
  "arc reactor online",
  "neural interface linked",
  "armor integrity 100%",
  "deploying site interface",
];

/** JARVIS-style boot screen, dismissed once content has loaded. */
export function LoadingScreen({ show }: { show: boolean }) {
  const reduce = useReducedMotion();

  const pct = useMotionValue(0);
  const pctText = useTransform(pct, (v) => `${Math.round(v)}%`);
  useEffect(() => {
    if (!show) {
      pct.set(0);
      return;
    }
    const controls = animateProgress(pct, reduce);
    return controls.stop;
  }, [show, pct, reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: "easeInOut" } }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-bg"
          role="status"
          aria-label="Loading"
        >
          {/* holographic backdrop */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(circle at center, var(--rk-accent-soft), transparent 62%)" }}
            aria-hidden
          />

          <div className="relative flex flex-col items-center gap-10 px-4">
            {/* arc reactor core */}
            <div className="relative flex size-40 items-center justify-center md:size-52" aria-hidden>
              <motion.div
                animate={reduce ? {} : { rotate: 360 }}
                transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-dashed border-accent/35"
              />
              <motion.div
                animate={reduce ? {} : { rotate: -360 }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 rounded-full border border-accent/25 [border-top-color:var(--rk-accent)]"
              />
              <div className="absolute inset-9 rounded-full border border-accent/20" />
              <motion.div
                animate={reduce ? {} : { scale: [1, 1.08, 1], opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
                className="flex size-20 items-center justify-center rounded-full bg-accent/10 shadow-[0_0_70px_10px_var(--rk-accent-soft)]"
              >
                <svg viewBox="0 0 24 24" className="size-8 text-accent-ink md:size-10" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
                  <ellipse cx="12" cy="12" rx="9.5" ry="3.6" />
                  <ellipse cx="12" cy="12" rx="9.5" ry="3.6" transform="rotate(60 12 12)" />
                  <ellipse cx="12" cy="12" rx="9.5" ry="3.6" transform="rotate(120 12 12)" />
                </svg>
              </motion.div>
            </div>

            {/* terminal boot log */}
            <div className="relative w-full max-w-md rounded-md border border-line bg-surface/70 p-5 font-mono text-xs backdrop-blur-sm">
              <span className="pointer-events-none absolute -left-px -top-px size-3 border-l-2 border-t-2 border-accent/60" aria-hidden />
              <span className="pointer-events-none absolute -right-px -top-px size-3 border-r-2 border-t-2 border-accent/60" aria-hidden />
              <span className="pointer-events-none absolute -bottom-px -left-px size-3 border-b-2 border-l-2 border-accent/60" aria-hidden />
              <span className="pointer-events-none absolute -bottom-px -right-px size-3 border-b-2 border-r-2 border-accent/60" aria-hidden />

              <p className="text-ink-dim">
                <span className="text-accent">therowkneet@pokhara</span>:~$ <span className="text-ink">init</span>
                <span className="ml-0.5 inline-block h-3.5 w-[7px] animate-pulse bg-accent align-middle" aria-hidden />
              </p>

              <div className="mt-3 space-y-1.5">
                {BOOT_LINES.map((line, i) => (
                  <motion.p
                    key={line}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.3 }}
                    className="text-ink-faint"
                  >
                    <span className="text-accent">[ OK ]</span> {line}
                  </motion.p>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="h-px flex-1 overflow-hidden bg-line" aria-hidden>
                  <motion.div
                    className="h-full bg-accent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "0%" }}
                    transition={{ duration: 1.6, ease: "easeInOut" }}
                  />
                </div>
                <motion.span className="text-accent-ink">{pctText}</motion.span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function animateProgress(pct: ReturnType<typeof useMotionValue<number>>, reduce: boolean | null) {
  return animate(pct, 100, {
    duration: reduce ? 0.01 : 1.6,
    ease: "easeInOut",
  });
}
