import { useCallback, useEffect, useRef, useState } from "react";
import { BluetoothSerial } from "@ascentio-it/capacitor-bluetooth-serial";
import { HC05_MAC, isNativeApp } from "../lib/native";

/* ------------------------------------------------------------------ */
/*  useIgnition — Swift Ignition BT-SPP link                           */
/*                                                                     */
/*  HARDWARE GUARD: every Bluetooth call is gated behind isNativeApp(). */
/*  In a plain browser the hook runs in "web-sim" — commands resolve    */
/*  locally, nothing ever touches a radio. Full SPP only inside the     */
/*  Capacitor APK.                                                      */
/*                                                                      */
/*  Protocol (HC-05 → Arduino): 'O' unlock/ignition-on, 'S' lock/off,   */
/*  'R' start crank (hold), 'E' stop crank (release).                   */
/*                                                                      */
/*  The plugin exposes no live RSSI for classic SPP, so link quality is */
/*  reported as measured write latency (EMA) — real telemetry instead   */
/*  of a fake signal bar.                                               */
/* ------------------------------------------------------------------ */

export type IgnitionCommand = "I" | "S" | "R" | "x";

export type LinkState =
  | "web-sim" // browser: hardware disabled by design
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

const KEEPALIVE_MS = 15_000;
const RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 4_000;

/** Smoothed-latency buckets for the signal meter. */
function latencyBars(ms: number | null): 0 | 1 | 2 | 3 {
  if (ms === null) return 0;
  if (ms < 80) return 3;
  if (ms < 200) return 2;
  if (ms < 450) return 1;
  return 0;
}

export function useIgnition() {
  const native = isNativeApp();
  const [status, setStatus] = useState<LinkState>(native ? "disconnected" : "web-sim");
  const [error, setError] = useState("");
  const [latency, setLatency] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const statusRef = useRef(status);
  statusRef.current = status;
  const reconnectTimer = useRef<number | null>(null);
  const keepaliveTimer = useRef<number | null>(null);

  /** Bounded event ticker for the HUD. */
  const pushLog = useCallback((line: string) => {
    setLog((l) => [`[${new Date().toLocaleTimeString()}] ${line}`, ...l].slice(0, 5));
  }, []);

  /** Core connect sequence — secure first, insecure fallback (HC-05 has no
      encryption handshake and often rejects RFCOMM secure sockets). */
  const establishLink = useCallback(async (): Promise<void> => {
    if (!HC05_MAC) throw new Error("No HC-05 MAC configured (.env.local VITE_HC05_MAC)");
    try {
      await BluetoothSerial.connect({ address: HC05_MAC });
    } catch {
      await BluetoothSerial.connectInsecure({ address: HC05_MAC });
    }
  }, []);

  const clearTimers = useCallback((): void => {
    if (keepaliveTimer.current) window.clearInterval(keepaliveTimer.current);
    if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
    keepaliveTimer.current = null;
    reconnectTimer.current = null;
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    clearTimers();
    if (native && statusRef.current !== "disconnected") {
      await BluetoothSerial.disconnect({ address: HC05_MAC }).catch(() => undefined);
    }
    setStatus(native ? "disconnected" : "web-sim");
    setLatency(null);
    pushLog("LINK CLOSED");
  }, [clearTimers, native, pushLog]);

  /** Auto-reconnect with bounded retries; used by keepalive and write failures. */
  const scheduleReconnect = useCallback((): void => {
    if (!native || statusRef.current === "reconnecting") return;
    setStatus("reconnecting");
    setError("LINK LOST — re-establishing…");
    let attempt = 0;
    const tryOnce = (): void => {
      attempt += 1;
      establishLink()
        .then(() => {
          setStatus("connected");
          setError("");
          pushLog(`RECONNECTED (attempt ${attempt})`);
        })
        .catch(() => {
          if (attempt < RECONNECT_ATTEMPTS) {
            reconnectTimer.current = window.setTimeout(tryOnce, RECONNECT_DELAY_MS);
          } else {
            setStatus("disconnected");
            setError("Reconnect failed — check bike ignition power on the HC-05");
            pushLog("RECONNECT FAILED ×3");
          }
        });
    };
    pushLog("AUTO-RECONNECT ARMED");
    tryOnce();
  }, [establishLink, native, pushLog]);

  const connect = useCallback(async (): Promise<void> => {
    setError("");
    if (!native) {
      // SIMULATION MODE — visual demo only, no radio access from browsers.
      setStatus("connecting");
      window.setTimeout(() => {
        setStatus("connected");
        pushLog("SIM LINK ESTABLISHED");
      }, 600);
      return;
    }
    setStatus("connecting");
    try {
      const { enabled } = await BluetoothSerial.isEnabled();
      if (!enabled) await BluetoothSerial.enable();
      await establishLink();
      setStatus("connected");
      setLatency(null);
      pushLog(`SPP LINK UP · ${HC05_MAC}`);
      // Keepalive: poll isConnected so silent drops trigger auto-reconnect.
      keepaliveTimer.current = window.setInterval(() => {
        void (async () => {
          if (statusRef.current !== "connected") return;
          try {
            const { connected } = await BluetoothSerial.isConnected({ address: HC05_MAC });
            if (!connected) scheduleReconnect();
          } catch {
            scheduleReconnect();
          }
        })();
      }, KEEPALIVE_MS);
    } catch (err) {
      setStatus("disconnected");
      const message = err instanceof Error ? err.message : String(err ?? "");
      // Android permission prompts surface here as plain denials.
      setError(/permission/i.test(message) ? "Bluetooth permission denied — grant it in Android settings" : "Pair the HC-05 in Android settings first, then retry");
      pushLog("CONNECT FAILED");
    }
  }, [establishLink, native, pushLog, scheduleReconnect]);

  /** Send one protocol byte. Measures real round-trip latency for the meter. */
  const send = useCallback(
    async (cmd: IgnitionCommand): Promise<void> => {
      if (statusRef.current !== "connected") return;
      if (!native) return; // sim mode: nothing to transmit
      const t0 = performance.now();
      try {
        await BluetoothSerial.write({ address: HC05_MAC, value: cmd });
        const ms = performance.now() - t0;
        setLatency((prev) => (prev === null ? ms : prev * 0.7 + ms * 0.3));
      } catch {
        scheduleReconnect();
        pushLog("TRANSMIT FAILED");
        throw new Error("Transmit failed — link dropped");
      }
    },
    [native, pushLog, scheduleReconnect],
  );

  // Cleanup on unmount (leaving /terminal kills timers but NOT the link —
  // the deck auto-locks anyway).
  useEffect(() => clearTimers, [clearTimers]);

  return {
    native,
    mac: HC05_MAC,
    status,
    error,
    latency,
    bars: latencyBars(latency),
    log,
    connect: () => void connect(),
    disconnect: () => void disconnect(),
    send,
  };
}
