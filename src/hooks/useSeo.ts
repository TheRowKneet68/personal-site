import { useEffect, useMemo } from "react";
import { applySeo, type SeoOptions } from "../lib/seo";

export function useSeo(options: SeoOptions): void {
  // Serialize so callers can pass inline objects without retriggering.
  const memoized = useMemo(() => options, [JSON.stringify(options)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    applySeo(memoized);
  }, [memoized]);
}
