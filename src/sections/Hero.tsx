import { motion, useReducedMotion } from "framer-motion";
import { useData } from "../context/DataContext";
import { Button } from "../components/Button";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

export function Hero() {
  const { profile, profileStats } = useData();
  const reduce = useReducedMotion();
  if (!profile) return null;

  const fade = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: EASE },
  });

  const portrait1 = (profile.portrait1 ?? "").trim();
  const hasPortrait1 = Boolean(portrait1);

  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 right-[-20%] h-[38rem] w-[38rem] rounded-full opacity-60 dark:opacity-40"
        style={{
          background:
            "radial-gradient(closest-side, var(--rk-accent-soft), transparent 70%)",
        }}
        aria-hidden
      />
      <div className="container-rk pt-32 pb-20 md:pt-44 md:pb-28">
        <div className={hasPortrait1 ? "flex flex-col gap-8 md:flex-row md:items-center md:justify-between" : "max-w-4xl"}>
          <div className={hasPortrait1 ? "min-w-0 flex-1" : "max-w-4xl"}>
            <motion.p {...fade(0)} className="mono-label">
              // {profile.role.toLowerCase()} · based in {profile.location}
            </motion.p>

            <motion.h1 {...fade(0.08)} className="text-hero mt-7 font-bold">
              I build what
              <br />
              <em className="accent-serif">doesn't</em> exist yet.
              <span className="ml-1 inline-block h-[0.85em] w-[0.6ch] animate-pulse bg-accent align-baseline" aria-hidden />
            </motion.h1>

            <motion.p {...fade(0.16)} className="mt-7 max-w-xl text-lg leading-relaxed text-ink-dim">
              I'm <span className="font-semibold text-ink">{profile.name}</span> — {profile.slogan}.
              Hardware on the workbench, software in the terminal, and a habit of shipping
              both before anyone asks.
            </motion.p>

            <motion.div {...fade(0.24)} className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Button href="#work" variant="solid" withArrow className="w-full sm:w-auto">
                see the work
              </Button>
              <Button href="#contact" variant="outline" className="w-full sm:w-auto">
                get in touch
              </Button>
            </motion.div>

            <motion.dl
              {...fade(0.32)}
              className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-4"
            >
              {(profileStats ?? profile.stats ?? []).map((s) => (
                <div key={s.label} className="bg-bg px-5 py-5">
                  <dd className="text-2xl font-bold tracking-tight text-accent-ink md:text-3xl">{s.value}</dd>
                  <dt className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-faint">
                    {s.label}
                  </dt>
                </div>
              ))}
            </motion.dl>
          </div>

          {hasPortrait1 && (
            <motion.div
              {...fade(0.12)}
              className="relative hidden shrink-0 md:mx-0 md:mt-[-2.2rem] md:block md:max-w-[370px]"
            >
              <div className="overflow-hidden rounded-full border border-line bg-surface p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
                <img
                  src={portrait1}
                  alt={`${profile.name} portrait`}
                  width={640}
                  height={640}
                  fetchPriority="high"
                  className="h-[19rem] w-[19rem] rounded-full object-cover md:h-[24rem] md:w-[24rem]"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
