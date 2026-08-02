/**
 * Analytics-ready hook. No-op until you wire a provider:
 *  - Plausible: window.plausible(...)
 *  - GA4: window.gtag(...)
 *  - Umami: window.umami(...)
 * Visit tracking already happens server-side via POST /api/visitors.
 */
export function track(event: string, props?: Record<string, unknown>): void {
  const w = window as unknown as {
    plausible?: (event: string, options?: { props?: Record<string, unknown> }) => void;
    gtag?: (...args: unknown[]) => void;
    umami?: (event: string, props?: Record<string, unknown>) => void;
  };
  try {
    if (typeof w.plausible === "function") w.plausible(event, props ? { props } : undefined);
    else if (typeof w.gtag === "function") w.gtag("event", event, props);
    else if (typeof w.umami === "function") w.umami(event, props);
  } catch {
    /* analytics must never break the page */
  }
}
