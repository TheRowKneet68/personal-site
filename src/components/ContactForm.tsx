import { useState, type FormEvent } from "react";
import { runBoard } from "./LoadingScreen";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { api, ApiClientError } from "../services/api";
import { Button } from "./Button";
import { cn } from "../utils/format";

type SubmitState = "idle" | "submitting" | "success" | "error";

const inputClass =
  "w-full rounded-[3px] border border-field bg-bg px-3.5 py-3 text-[0.98rem] text-ink placeholder:text-ink-faint transition-colors focus:border-accent focus:outline-2 focus:outline-offset-0 focus:outline-accent";

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string; // honeypot - humans never see it
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
    if (form.name.trim().length < 2) next.name = "Enter your name so I know who to reply to.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = "Enter a valid email address, like name@example.com.";
    if (form.subject.trim().length > 200) next.subject = "Keep the subject under 200 characters.";
    if (!form.message.trim()) next.message = "Write a message first.";
    else if (form.message.trim().length > 4000) next.message = "Keep the message under 4000 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;
    setState("submitting");
    setServerError("");
    try {
      await runBoard("message", "transmitting message", "delivered", () =>
        api.postContact({
          name: form.name,
          email: form.email,
          subject: form.subject,
          message: form.message,
          ...(form.website ? { website: form.website } : {}),
        }),
      );
      setState("success");
      setForm(EMPTY);
    } catch (err) {
      setState("error");
      setServerError(err instanceof ApiClientError ? err.message : "The message didn't send. Try again, or email me directly.");
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="mb-1.5 block text-[0.9rem] font-medium text-ink-dim">
            Name
          </label>
          <input id="cf-name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "cf-name-err" : undefined} className={cn(inputClass, errors.name && "border-warn")} placeholder="Your name"
            value={form.name} onChange={set("name")} autoComplete="name" />
          {errors.name && <p id="cf-name-err" className="mt-1.5 text-sm text-warn">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="cf-email" className="mb-1.5 block text-[0.9rem] font-medium text-ink-dim">
            Email
          </label>
          <input id="cf-email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "cf-email-err" : undefined} type="email" className={cn(inputClass, errors.email && "border-warn")} placeholder="you@example.com"
            value={form.email} onChange={set("email")} autoComplete="email" />
          {errors.email && <p id="cf-email-err" className="mt-1.5 text-sm text-warn">{errors.email}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cf-subject" className="mb-1.5 block text-[0.9rem] font-medium text-ink-dim">
            Subject <span className="text-ink-faint">(optional)</span>
          </label>
          <input id="cf-subject" aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? "cf-subject-err" : undefined} className={inputClass} placeholder="A hackathon, a product, a question"
            value={form.subject} onChange={set("subject")} />
          {errors.subject && <p id="cf-subject-err" className="mt-1.5 text-sm text-warn">{errors.subject}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cf-message" className="mb-1.5 block text-[0.9rem] font-medium text-ink-dim">
            Message
          </label>
          <textarea id="cf-message" aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "cf-message-err" : undefined} rows={5} className={cn(inputClass, "resize-y", errors.message && "border-warn")}
            placeholder="Skip the 10-paragraph brief. Tell me what you want to exist and I'll figure out the rest."
            value={form.message} onChange={set("message")} />
          {errors.message && <p id="cf-message-err" className="mt-1.5 text-sm text-warn">{errors.message}</p>}
        </div>
      </div>

      {/* honeypot - hidden from humans, irresistible to bots */}
      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor="cf-website">leave this field empty</label>
        <input id="cf-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
      </div>

      <div className="mt-6">
        <Button type="submit" variant="solid" disabled={state === "submitting"} className="w-full sm:w-auto">
          {state === "submitting" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Sending…
            </>
          ) : (
            "Send message"
          )}
        </Button>

        {state === "success" && (
          <p className="mt-4 flex items-center gap-2 text-sm text-accent-ink" role="status">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden /> Message sent. I'll reply within a day or two.
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
