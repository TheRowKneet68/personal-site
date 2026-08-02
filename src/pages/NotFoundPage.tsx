import { useSeo } from "../hooks/useSeo";
import { Button } from "../components/Button";

export function NotFoundPage() {
  useSeo({
    title: "404 — this page doesn't exist | Ronit Baniya Gupta",
    description: "The page you're looking for doesn't exist.",
  });

  return (
    <div className="container-rk flex min-h-[80vh] flex-col items-center justify-center py-32 text-center">
      <p className="mono-label">error 404</p>
      <h1 className="text-hero mt-6 max-w-2xl font-bold">
        this route <em className="accent-serif">doesn't</em> exist.
      </h1>
      <p className="mt-6 max-w-md text-ink-dim">
        Even my projects know better than to 404. Whatever you were after is either gone or
        was never there.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button to="/" variant="solid" withArrow>
          back home
        </Button>
        <Button to="/#work" variant="outline">
          see the work
        </Button>
      </div>
    </div>
  );
}
