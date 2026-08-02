import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../services/api";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ReadingProgress } from "./ReadingProgress";
import { BackToTop } from "./BackToTop";

const CommandPalette = lazy(() =>
  import("./CommandPalette").then((m) => ({ default: m.CommandPalette })),
);

export function Layout({ children }: { children: ReactNode }) {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const timer = setTimeout(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
      }, 60);
      return () => clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash]);

  useEffect(() => {
    api.trackVisit();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:bg-accent focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:text-[#14150f]"
      >
        skip to content
      </a>
      <ReadingProgress />
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <BackToTop />
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
    </div>
  );
}
