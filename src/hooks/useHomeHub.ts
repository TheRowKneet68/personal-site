import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import type { IotDevice } from "../types";

/* ------------------------------------------------------------------ */
/*  useHomeHub — Suraksha Ghar state machine                          */
/*                                                                     */
/*  Owns the device registry + live pin states. Toggles are OPTIMISTIC: */
/*  the UI flips instantly (with haptic tick), the command goes out in  */
/*  the background with silent retries, and only a final failure reverts */
/*  the switch and surfaces an error. State polling pauses while any   */
/*  toggle is in flight so a slow read can't snap the switch back.     */
/* ------------------------------------------------------------------ */

/* ponytail: 2s poll ≈ real-time at this device count; SSE push only if
   Blynk rate limits or battery ever force it. */
const POLL_MS = 2_000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3_000;

/** Haptic tick where supported (Android APK); no-op elsewhere. */
function tick(): void {
  navigator.vibrate?.(12);
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_ATTEMPTS - 1) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw lastError;
}

/** Hub master switch: the device in a hub named like "Main Power".
 *  ponytail: name-based detection; promote to a registry field if you ever
 *  need a second differently-named master.
 *  Semantics — toggle(master, v) writes v to EVERY sibling in that hub;
 *  after any child settles, master is driven to AND(siblings). */
export function isMasterDevice(d: IotDevice): boolean {
  return /main\s*power|^power$/i.test(d.name);
}

export function useHomeHub(authToken: string) {
  const [hubs, setHubs] = useState<string[]>([]);
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [state, setState] = useState<Record<string, 0 | 1 | null>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  // Latest-value refs so timers/retries never act on stale closures.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const stateRef = useRef(state);
  stateRef.current = state;
  const devicesRef = useRef(devices);
  devicesRef.current = devices;

  /** Drive the hub master to AND(non-master siblings). Skips itself while
   *  siblings are in flight (their own settle re-runs this), and never fires
   *  when the master already shows the target value. */
  const reconcileMaster = useCallback(
    async (hubId: string, allDevices: IotDevice[]): Promise<void> => {
      const master = allDevices.find((d) => d.hub === hubId && isMasterDevice(d));
      if (!master) return;
      const sibs = allDevices.filter((d) => d.hub === hubId && d.id !== master.id);
      if (sibs.length === 0) return;
      if (Object.keys(pendingRef.current).some((id) => sibs.some((s) => s.id === id))) return;
      const target: 0 | 1 = sibs.every((s) => stateRef.current[s.id] === 1) ? 1 : 0;
      if (stateRef.current[master.id] === target) return;
      setState((s) => ({ ...s, [master.id]: target }));
      setPending((p) => ({ ...p, [master.id]: true }));
      try {
        await withRetry(() => api.setIotDeviceState(authToken, master.id, target));
        setError("");
      } catch {
        setState((s) => ({ ...s, [master.id]: s[master.id] === target ? null : (s[master.id] ?? null) }));
        setError(`"${master.name}" follow-up failed — check MAIN POWER`);
      } finally {
        setPending((p) => {
          const rest = { ...p };
          delete rest[master.id];
          return rest;
        });
      }
    },
    [authToken],
  );

  const refreshState = useCallback(async () => {
    if (Object.keys(pendingRef.current).length > 0) return;
    try {
      const fresh = (await api.getIotState(authToken)).state;
      const prev = stateRef.current;
      const keys = Object.keys(fresh);
      const changed =
        keys.length !== Object.keys(prev).length || keys.some((k) => prev[k] !== fresh[k]);
      if (!changed) return; // identical telemetry → zero re-render
      setState(fresh);
      setError("");
      // The master follows AND(siblings) even when a child changes OUTSIDE the
      // deck (Blynk app / wall switch): reconcile every hub after each poll.
      for (const hub of new Set(devicesRef.current.map((d) => d.hub))) {
        void reconcileMaster(hub, devicesRef.current);
      }
    } catch {
      setError("TELEMETRY LINK LOST — retrying on next cycle");
    }
  }, [authToken, reconcileMaster]);

  // Initial registry load.
  useEffect(() => {
    let cancelled = false;
    api
      .listIotDevices(authToken)
      .then((r) => {
        if (cancelled) return;
        setHubs(r.hubs);
        setDevices(r.devices);
        setLoaded(true);
      })
      .catch(() => !cancelled && setError("Could not load device registry"));
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  // Telemetry poll.
  useEffect(() => {
    if (!loaded) return;
    void refreshState();
    const timer = setInterval(() => void refreshState(), POLL_MS);
    return () => clearInterval(timer);
  }, [loaded, refreshState]);

  /** Optimistic toggle: flip now, confirm upstream with silent retries.
   *  Master devices fan their value out to every sibling in the same hub;
   *  child toggles let reconcileMaster keep the master = AND(siblings). */
  const toggle = useCallback(
    async (device: IotDevice, value: 0 | 1) => {
      if (pending[device.id]) return;
      tick();
      const previous = state[device.id];
      setState((s) => ({ ...s, [device.id]: value }));
      setPending((p) => ({ ...p, [device.id]: true }));

      const master = devices.find((d) => d.hub === device.hub && isMasterDevice(d));
      const isMaster = master?.id === device.id;

      try {
        if (isMaster && master) {
          // Fan out: master + every sibling get the same value, in parallel.
          const sibs = devices.filter((d) => d.hub === device.hub && d.id !== master.id);
          const writes = [master, ...sibs].map((d) =>
            api.setIotDeviceState(authToken, d.id, value).then(() => {
              setState((s) => ({ ...s, [d.id]: value }));
            }),
          );
          await Promise.allSettled(writes);
          setError("");
          void refreshState(); // truth wins after a broadcast
        } else {
          await withRetry(() => api.setIotDeviceState(authToken, device.id, value));
          setError("");
          void refreshState(); // confirm true device state
        }
      } catch {
        setState((s) => ({ ...s, [device.id]: previous ?? null }));
        setError(`"${device.name}" did not respond — command aborted`);
      } finally {
        setPending((p) => {
          const rest = { ...p };
          delete rest[device.id];
          return rest;
        });
        // Children drive the master; masters never reconcile themselves.
        if (!isMaster) void reconcileMaster(device.hub, devices);
      }
    },
    [authToken, devices, pending, refreshState, reconcileMaster, state],
  );

  /** Persist an edited registry (config mode save). */
  const saveDevices = useCallback(
    async (list: IotDevice[]): Promise<boolean> => {
      try {
        const r = await api.saveIotDevices(authToken, list);
        setDevices(r.devices);
        setError("");
        void refreshState();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Config save failed");
        return false;
      }
    },
    [authToken, refreshState],
  );

  return { hubs, devices, state, error, pending, loaded, toggle, saveDevices, refreshState };
}
