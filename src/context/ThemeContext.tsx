import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

const KEY = "rk-theme";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

const saved = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // private mode
  }
};

/** index.html picks the first theme before paint (saved choice, else the device). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.classList.contains("light") ? "light" : "dark"));

  useEffect(() => {
    const root = document.documentElement;
    // no colour transitions mid-switch, or hover-transitioned text lags a frame behind its background
    root.classList.add("rk-theme-switching");
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("rk-theme-switching")));
    return () => cancelAnimationFrame(id);
  }, [theme]);

  // follow the device setting until the visitor picks one
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (!saved()) setTheme(mq.matches ? "light" : "dark");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode: the choice lasts for this visit only */
    }
    const root = document.documentElement;
    const apply = (): void => {
      root.classList.add("rk-theme-switching");
      root.classList.remove("dark", "light");
      root.classList.add(next);
      setTheme(next);
    };
    // the new theme pours down from the top behind a glowing line; instant where unsupported
    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
    const line = Object.assign(document.createElement("div"), { className: "theme-line" });
    document
      .startViewTransition(() => {
        apply();
        document.body.append(line);
      })
      .finished.finally(() => line.remove());
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
