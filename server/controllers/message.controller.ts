import type { Request, Response } from "express";
import { storage, type NewVisitor } from "../services/storage.js";
import { buildVisitor, clientIp } from "../services/visitors.js";
import { HttpError } from "../middleware/errorHandler.js";
import { isEmail, requiredLength } from "../middleware/validate.js";

/** POST /api/contact — validated, honeypot-guarded, rate-limited upstream. */
export async function postContact(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;

  // Honeypot: a bot fills the hidden field. Pretend success, store nothing.
  if (body.website && String(body.website).length > 0) {
    res.json({ ok: true });
    return;
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!requiredLength(name, 2, 80)) throw new HttpError(400, "a real name helps me reply to the right person.");
  if (!isEmail(email) || email.length > 120) throw new HttpError(400, "that email doesn't look right.");
  if (subject.length > 200) throw new HttpError(400, "keep the subject under 200 characters.");
  if (!requiredLength(message, 10, 4000)) throw new HttpError(400, "tell me a bit more — at least 10 characters.");

  await storage.addMessage({ name, email, subject, message, ip: clientIp(req) });
  res.json({ ok: true });
}

/** POST /api/newsletter — subscribe with a dedupe. */
export async function postNewsletter(req: Request, res: Response): Promise<void> {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!isEmail(email) || email.length > 120) throw new HttpError(400, "that email doesn't look right.");
  const { subscribed } = await storage.addSubscriber(email);
  res.json({ ok: true, subscribed });
}

/** POST /api/visitors — fire-and-forget visit beacon. */
export async function postVisitor(req: Request, res: Response): Promise<void> {
  const visitor: NewVisitor = await buildVisitor(req);
  await storage.addVisitor(visitor);
  res.json({ ok: true });
}
