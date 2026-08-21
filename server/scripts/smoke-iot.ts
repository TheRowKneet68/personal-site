/* One-off smoke test for /api/iot/* — run with the API up:
   npx tsx scripts/smoke-iot.ts
   Exercises the registry roundtrip (Supabase/JSON) and read paths.
   Writes a test relay to the registry, then restores the previous list. */
import { getStoredAuth, issueToken } from "../middleware/auth.js";

const BASE = "http://localhost:3001/api";

const stored = await getStoredAuth();
const token = issueToken(stored?.tokenVersion ?? 0, stored?.passwordHash || process.env.ADMIN_PASSWORD || "");
const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

const beforeRaw = await fetch(`${BASE}/iot/devices`, { headers: auth });
const beforeBody = (await beforeRaw.json()) as {
  hubs?: string[];
  devices?: { id: string; name: string; hub: string; pin: string }[];
};
if (!beforeBody.devices) {
  console.log("GET devices ->", beforeRaw.status, JSON.stringify(beforeBody).slice(0, 200));
  process.exit(1);
}
const before = { hubs: beforeBody.hubs ?? [], devices: beforeBody.devices };
console.log(`GET devices -> hubs=[${before.hubs}] devices=${before.devices.length}`);

// registry write + validation checks
const probe = [...before.devices, { id: "smoke-probe", name: "Smoke Probe", hub: "hub-2", pin: "V18" }];
const saved = await fetch(`${BASE}/iot/devices`, {
  method: "PUT",
  headers: auth,
  body: JSON.stringify({ devices: probe }),
});
console.log("PUT registry (+probe on hub-2 V18) ->", saved.status);
console.log("PUT bad pin rejected ->",
  (await fetch(`${BASE}/iot/devices`, { method: "PUT", headers: auth, body: JSON.stringify({ devices: [{ id: "x", name: "X", hub: "hub-1", pin: "DROP TABLE" }] }) })).status === 400 ? "ok" : "FAIL");

// live state snapshot (read-only upstream)
const state = (await (await fetch(`${BASE}/iot/state`, { headers: auth })).json()) as { state: Record<string, number | null> };
for (const [id, v] of Object.entries(state.state)) console.log(`  state ${id} -> ${v ?? "null"}`);

// restore whatever was configured before the probe
await fetch(`${BASE}/iot/devices`, { method: "PUT", headers: auth, body: JSON.stringify({ devices: before.devices }) });
console.log("registry restored");
