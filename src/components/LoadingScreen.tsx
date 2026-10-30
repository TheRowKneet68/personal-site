/** Shown while the CMS content loads. A plain progress trace - no fake boot log. */
export function LoadingScreen({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-bg" role="status" aria-live="polite">
      <div className="w-56">
        <p className="font-display text-[1.6rem]">Ronit Baniya Gupta</p>
        <div className="mt-3 h-[2px] overflow-hidden bg-line" aria-hidden>
          <div className="rk-loading-trace h-full w-1/3 bg-accent" />
        </div>
        <p className="sr-only">Loading</p>
      </div>
    </div>
  );
}
