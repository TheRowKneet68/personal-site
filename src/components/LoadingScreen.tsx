import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/** Brief branded boot screen, dismissed once content has loaded. */
export function LoadingScreen({ show }: { show: boolean }) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeInOut" } }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-bg"
          role="status"
          aria-label="Loading"
        >
          <p className="font-mono text-[0.8rem] text-ink-dim">
            <span className="text-accent">therowkneet@pokhara</span>:~$ <span className="text-ink">building</span>
            <span className="ml-0.5 inline-block h-4 w-[7px] animate-pulse bg-accent align-middle" aria-hidden />
          </p>
          <div className="h-px w-48 overflow-hidden bg-line" aria-hidden>
            <motion.div
              className="h-full bg-accent"
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 0.9, ease: "easeInOut", ...(reduce ? { delay: 0 } : {}) }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
