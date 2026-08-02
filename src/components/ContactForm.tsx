import { useState, type FormEvent } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { api, ApiClientError } from "../services/api";
import { Button } from "./Button";
import { cn } from "../utils/format";

type SubmitState = "idle" | "submitting" | "success" | "error";

const inputClass =
  "w-full rounded-sm border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-accent focus:outline-none";

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string; // honeypot — humans never see it
}

const EMPTY: FormState = { name: "", email: "", subject: "", message: "", website: "" };

export function ContactForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [state, setState] = useState<SubmitState>("idle");
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState("");

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length < 2) next.name = "a real name helps me reply to the right person.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = "that email doesn't look right.";
    if (form.subject.trim().length > 200) next.subject = "keep the subject under 200 characters.";
    if (form.message.trim().length < 10) next.message = "tell me a bit more — at least 10 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;
    setState("submitting");
    setServerError("");
    try {
      await api.postContact({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
        ...(form.website ? { website: form.website } : {}),
      });
      setState("success");
      setForm(EMPTY);
    } catch (err) {
      setState("error");
      setServerError(err instanceof ApiClientError ? err.message : "something broke — try again or email me directly.");
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="mb-1.5 block font-mono text-[0.68rem] uppercase tracking-[0.14em] text-ink-faint">
            name
          </label>
          <input id="cf-name" className={cn(inputClass, errors.name && "border-warn")} placeholder="what should I call you?"
            value={form.name} onChange={set("name")} autoComplete="name" />
          {errors.name && <p className="mt-1 text-xs text-warn">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="cf-email" className="mb-1.5 block font-mono text-[0.68rem] uppercase tracking-[0.14em] text-ink-faint">
            email
          </label>
          <input id="cf-email" type="email" className={cn(inputClass, errors.email && "border-warn")} placeholder="you@example.com"
            value={form.email} onChange={set("email")} autoComplete="email" />
          {errors.email && <p className="mt-1 text-xs text-warn">{errors.email}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cf-subject" className="mb-1.5 block font-mono text-[0.68rem] uppercase tracking-[0.14em] text-ink-faint">
            subject
          </label>
          <input id="cf-subject" className={inputClass} placeholder="what's this about?"
            value={form.subject} onChange={set("subject")} />
          {errors.subject && <p className="mt-1 text-xs text-warn">{errors.subject}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cf-message" className="mb-1.5 block font-mono text-[0.68rem] uppercase tracking-[0.14em] text-ink-faint">
            message
          </label>
          <textarea id="cf-message" rows={5} className={cn(inputClass, "resize-y", errors.message && "border-warn")}
            placeholder="Don't send a 10-paragraph brief. Tell me what you want to exist — I'll figure out the rest."
            value={form.message} onChange={set("message")} />
          {errors.message && <p className="mt-1 text-xs text-warn">{errors.message}</p>}
        </div>
      </div>

      {/* honeypot — hidden from humans, irresistible to bots */}
      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor="cf-website">leave this field empty</label>
        <input id="cf-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
      </div>

      <div className="mt-6">
        <Button type="submit" variant="solid" withArrow disabled={state === "submitting"} className="w-full sm:w-auto">
          {state === "submitting" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> sending…
            </>
          ) : (
            "send message"
          )}
        </Button>

        {state === "success" && (
          <p className="mt-4 flex items-center gap-2 text-sm text-accent-ink" role="status">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden /> got it — I'll reply within a day or two.
          </p>
        )}
        {state === "error" && (
          <p className="mt-4 flex items-center gap-2 text-sm text-warn" role="alert">
            <AlertCircle className="size-4 shrink-0" aria-hidden /> {serverError}
          </p>
        )}
      </div>
    </form>
  );
}
