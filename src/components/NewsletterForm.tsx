import { useState, type FormEvent } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { api } from "../services/api";
import { cn } from "../utils/format";

type State = "idle" | "submitting" | "success" | "duplicate" | "error";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setState("error");
      return;
    }
    setState("submitting");
    try {
      const res = await api.postNewsletter(email.trim());
      setState(res.subscribed ? "success" : "duplicate");
      if (res.subscribed) setEmail("");
    } catch {
      setState("error");
    }
  };

  const message: Partial<Record<State, string>> = {
    success: "subscribed — I'll only email when there's something real to say.",
    duplicate: "you're already on the list. thanks for sticking around.",
    error: "that email doesn't look right.",
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="mt-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="nl-email" className="sr-only">
          Email address
        </label>
        <input
          id="nl-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className={cn(
            "w-full rounded-sm border border-line bg-surface px-4 py-3 font-mono text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-accent focus:outline-none sm:w-64",
            state === "error" && "border-warn",
          )}
        />
        <button
          type="submit"
          disabled={state === "submitting"}
          className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-sm border border-line px-5 py-3 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ink transition-colors hover:border-accent hover:text-accent-ink disabled:pointer-events-none disabled:opacity-50"
        >
          {state === "submitting" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : state === "success" ? (
            <Check className="size-4 text-accent-ink" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
          {state === "submitting" ? "joining…" : "subscribe"}
        </button>
      </div>
      {message[state] && (
        <p
          className={cn("mt-2 text-sm", state === "error" ? "text-warn" : "text-ink-dim")}
          role={state === "error" ? "alert" : "status"}
        >
          {message[state]}
        </p>
      )}
    </form>
  );
}
