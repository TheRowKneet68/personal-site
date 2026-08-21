import type { Request, Response as ExpressResponse } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";
import { storage, type StoredIotDevice } from "../services/storage.js";

/* ------------------------------------------------------------------ */
/*  Cyber-Deck IoT proxy ("Suraksha Ghar" home hub)                    */
/*                                                                     */
/*  Blynk tokens live ONLY in the server process (see env.ts). The     */
/*  client manages a device REGISTRY (name + hub id + virtual pin) and */
/*  references tokens by hub index — raw tokens never cross the wire   */
/*  in either direction. Registry persists in Supabase (iot_config),   */
/*  JSON file in fallback mode.                                        */
/* ------------------------------------------------------------------ */

const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_DEVICES = 32;
/* ponytail: account is homed on the Singapore region server — the generic
   blynk.cloud host silently drops foreign tokens. If you ever migrate
   regions, change this one constant (or promote it to env). */
const BLYNK_BASE = "https://sgp1.blynk.cloud/external/api";

/** Seed registry shown until the user saves their own layout — the legacy
    App Inventor five on hub-1. Purely a read default; nothing is persisted
    until the first config save in the UI. */
const DEFAULT_DEVICES: StoredIotDevice[] = [
  { id: "dev-main", name: "Main Power", hub: "hub-1", pin: "v0" },
  { id: "dev-light", name: "Room Light", hub: "hub-1", pin: "v1" },
  { id: "dev-socket", name: "Socket", hub: "hub-1", pin: "v2" },
  { id: "dev-fan", name: "Fan", hub: "hub-1", pin: "v3" },
  { id: "dev-lamp", name: "Lamp", hub: "hub-1", pin: "v4" },
];

/** Fail fast when no token is configured (e.g. preview deployments). */
function requireBlynk(): string[] {
  if (env.blynkTokens.length === 0) throw new HttpError(503, "Home hub not configured");
  return env.blynkTokens;
}

/** Resolve "hub-N" to its token. Generic errors only — an unknown hub and an
    unconfigured hub are indistinguishable from outside. */
function hubToken(hubParam: string): string {
  const hubs = requireBlynk();
  const match = /^hub-(\d+)$/.exec(hubParam);
  const index = match ? Number(match[1]) - 1 : -1;
  if (index < 0 || index >= hubs.length) throw new HttpError(404, "Unknown hub");
  return hubs[index];
}

/** Call the Blynk external API. Fetch errors embed the full URL — which
    contains the token — so every failure mode is normalised to a generic
    message before it can reach a response or a log. */
async function blynk(token: string, path: string): Promise<globalThis.Response> {
  try {
    return await fetch(`${BLYNK_BASE}${path}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new HttpError(502, "Home hub unreachable");
  }
}

function resolveDevices(): Promise<StoredIotDevice[]> {
  return storage.getIotDevices().then((d) => (d.length > 0 ? d : DEFAULT_DEVICES));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Validate + normalise a client-supplied registry. Every field is whitelisted:
    ids are opaque slugs, pins are v0–v255, hubs must exist. This function is
    the whole trust boundary for what gets written to storage and interpolated
    into upstream URLs. */
function normalizeDevices(raw: unknown): StoredIotDevice[] {
  const hubs = requireBlynk();
  if (!Array.isArray(raw)) throw new HttpError(400, "devices must be an array");
  if (raw.length > MAX_DEVICES) throw new HttpError(400, `Maximum ${MAX_DEVICES} devices`);
  const seen = new Set<string>();
  return raw.map((item) => {
    if (!isRecord(item)) throw new HttpError(400, "Invalid device entry");
    const id = typeof item.id === "string" ? item.id : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const hub = typeof item.hub === "string" ? item.hub : "";
    const pin = typeof item.pin === "string" ? item.pin.trim().toLowerCase() : "";
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw new HttpError(400, "Invalid device id");
    if (name.length < 1 || name.length > 48) throw new HttpError(400, "Device name must be 1–48 characters");
    if (!/^hub-\d+$/.test(hub) || Number(hub.slice(4)) < 1 || Number(hub.slice(4)) > hubs.length)
      throw new HttpError(400, `Unknown ${hub || "hub"}`);
    if (!/^v\d{1,3}$/.test(pin) || Number(pin.slice(1)) > 255)
      throw new HttpError(400, `Pin must be V0–V255 (got "${pin}")`);
    if (seen.has(id)) throw new HttpError(400, "Duplicate device id");
    seen.add(id);
    return { id, name, hub, pin, invert: item.invert === true };
  });
}

/** GET /api/iot/devices — hub ids + the device registry (auth required).
    Tokens are NOT included; hubs are opaque labels. */
export async function listDevices(_req: Request, res: ExpressResponse): Promise<void> {
  res.json({ hubs: requireBlynk().map((_, i) => `hub-${i + 1}`), devices: await resolveDevices() });
}

/** PUT /api/iot/devices — replace the entire registry with a validated list
    (auth required). Whole-list save matches how the admin panel edits content;
    optimistic UI makes it feel granular without extra endpoints. */
export async function saveDevices(req: Request, res: ExpressResponse): Promise<void> {
  const devices = normalizeDevices((req.body ?? {}).devices);
  await storage.setIotDevices(devices);
  res.json({ ok: true, devices });
}

/** GET /api/iot/state — live pin values for every registered device (auth
    required). Devices are grouped by hub so each hub costs ONE batched
    request regardless of device count; a dead hub yields nulls, not a 500. */
export async function getState(_req: Request, res: ExpressResponse): Promise<void> {
  const devices = await resolveDevices();
  const byHub = new Map<string, StoredIotDevice[]>();
  for (const d of devices) {
    const list = byHub.get(d.hub) ?? [];
    list.push(d);
    byHub.set(d.hub, list);
  }
  const snapshots = await Promise.all(
    [...byHub.entries()].map(async ([hub, devs]) => {
      const token = hubToken(hub);
      const pins = [...new Set(devs.map((d) => d.pin))];
      try {
        const r = await blynk(token, `/get?token=${encodeURIComponent(token)}&${pins.join("&")}`);
        /* Blynk answers a single-pin get with a bare value ("1") and a
           multi-pin get with an object — normalise both to key→value. */
        let body: Record<string, unknown> = {};
        if (r.ok) {
          const j: unknown = await r.json();
          if (typeof j === "number" || typeof j === "boolean" || typeof j === "string") {
            if (pins.length === 1) body = { [pins[0]]: j };
          } else if (isRecord(j)) {
            body = j;
          }
        }
        return devs.map((d) => {
          let value = Number(body[d.pin]);
          // Active-low channels store the complement — translate back to logical.
          if (d.invert && (value === 0 || value === 1)) value = value ^ 1;
          return [d.id, value === 0 || value === 1 ? value : null] as const;
        });
      } catch {
        return devs.map((d) => [d.id, null] as const);
      }
    }),
  );
  res.json({ state: Object.fromEntries(snapshots.flat()) });
}

/** POST /api/iot/devices/:id/state — write 0|1 to one device's pin (auth
    required). Body: { value: 0 | 1 }, strictly validated. */
export async function setDeviceState(req: Request, res: ExpressResponse): Promise<void> {
  const devices = await resolveDevices();
  const device = devices.find((d) => d.id === req.params.id);
  if (!device) throw new HttpError(404, "Unknown device");
  const { value } = (req.body ?? {}) as { value?: unknown };
  if (value !== 0 && value !== 1) throw new HttpError(400, "value must be 0 or 1");

  const token = hubToken(device.hub);
  // Active-low channels energise on 0 — complement at the wire.
  const wireValue = device.invert ? ((value ^ 1) as 0 | 1) : value;
  const r = await blynk(token, `/update?token=${encodeURIComponent(token)}&${device.pin}=${wireValue}`);
  if (!r.ok) throw new HttpError(502, "Device rejected the command");
  res.json({ ok: true, id: device.id, value });
}
