import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

/* ------------------------------------------------------------------ */
/*  Cyber-Deck authentication                                          */
/*                                                                     */
/*  Uses the DEDICATED deck credential vault: POST /api/deck/login      */
/*  exchanges the DECK password for a 12h HMAC bearer token scoped to   */
/*  deck routes only — it cannot touch content-admin endpoints, and an  */
/*  admin token cannot drive relays. Server-side rate limit:            */
/*  5 attempts / 15 min per vault. Storage key "rk-deck-token" is kept  */
/*  separate from the admin panel's "rk-admin-token".                   */
/*                                                                     */
/*  The idle auto-lock is UX hardening on top of the real boundary      */
/*  (the signed token); it clears the session after DECK_IDLE_MS of     */
/*  no interaction so an unattended phone doesn't stay armed.           */
/* ------------------------------------------------------------------ */

const DECK_TOKEN_KEY = "rk-deck-token";
const DECK_IDLE_MS = 5 * 60_000;

/** Session state exposed to the deck UI. */
export interface DeckAuth {
  /** Bearer token when authenticated, null at the gate. */
  token: string | null;
  /** Why the last session ended — shown on the gate screen. */
  lockReason: "idle" | "manual" | null;
  login: (password: string) => Promise<void>;
  /** Swap in a fresh token after a password rotation (stays signed in). */
  reauth: (token: string) => void;
  lock: () => void;
}

export function useDeckAuth(): DeckAuth {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(DECK_TOKEN_KEY));
  const [lockReason, setLockReason] = useState<DeckAuth["lockReason"]>(null);

  const lock = useCallback((reason: DeckAuth["lockReason"] = "manual") => {
    localStorage.removeItem(DECK_TOKEN_KEY);
    setToken(null);
    setLockReason(reason);
  }, []);

  const login = useCallback(async (password: string) => {
    // Dedicated deck vault — same machinery as admin, different credential.
    const { token } = await api.deckLogin(password);
    localStorage.setItem(DECK_TOKEN_KEY, token);
    setToken(token);
    setLockReason(null);
  }, []);

  const reauth = useCallback((fresh: string) => {
    localStorage.setItem(DECK_TOKEN_KEY, fresh);
    setToken(fresh);
    setLockReason(null);
  }, []);

  useEffect(() => {
    if (!token) return;
    let timer = window.setTimeout(() => lock("idle"), DECK_IDLE_MS);
    const bump = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => lock("idle"), DECK_IDLE_MS);
    };
    // Discrete events only — pointermove would reset the timer every frame.
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "wheel"];
    for (const e of events) window.addEventListener(e, bump, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, bump);
    };
  }, [token, lock]);

  return { token, lockReason, login, reauth, lock };
}
