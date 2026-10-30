import { useSeo } from "../hooks/useSeo";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";

export function NotFoundPage() {
  useSeo({
    title: "Page not found | Ronit Baniya Gupta",
    description: "The page you're looking for doesn't exist.",
  });

  return (
    <div className="container-rk flex min-h-[80vh] flex-col justify-center py-32">
      <p className="label tabular">Error 404</p>
      <h1 className="font-display t-h1 mt-3 max-w-[16ch]">This page doesn't exist</h1>
      <p className="mt-5 max-w-[48ch] text-ink-dim">
        The link may be old, or the page was moved. The projects are all on the home page.
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Button to="/" variant="solid">
          Go to the home page
        </Button>
        <Link to="/#work" className="link font-semibold">
          See the work
        </Link>
      </div>
    </div>
  );
}
