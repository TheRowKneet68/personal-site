import { useCallback, useRef, useState } from "react";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { Check, Fan, Lightbulb, Mic, Plug, Plus, Power, RefreshCw, Trash2, X, Zap } from "lucide-react";
import { useHomeHub, isMasterDevice } from "../../hooks/useHomeHub";
import type { IotDevice } from "../../types";
import { isNativeApp } from "../../lib/native";
import { HudPanel, StatusDot, TacticalToggle, deckInputCls } from "./hud";

/* ------------------------------------------------------------------ */
/*  SURAKSHA GHAR — home automation matrix                             */
/*                                                                     */
/*  Relay cards with optimistic toggles (see useHomeHub), an inline    */
/*  CONFIG mode for editing the registry (name / hub / pin per device) */
/*  and Web Speech voice commands matched against device names.        */
/* ------------------------------------------------------------------ */

/** Minimal shape of the (vendor-prefixed) SpeechRecognition API we use. */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Card icon by name keyword — cheap delight, no config needed.
 *  Colour is inherited from the tile (green when energised, dim idle). */
function DeviceIcon({ name, lit }: { name: string; lit: boolean }) {
  const n = name.toLowerCase();
  const Icon = /fan/.test(n) ? Fan : /(lamp|light|bulb)/.test(n) ? Lightbulb : /(socket|plug|outlet)/.test(n) ? Plug : /main|power/.test(n) ? Power : Zap;
  return <Icon size={18} className={`transition-opacity ${lit ? "opacity-100" : "opacity-55"}`} />;
}

export function SurakshaGhar({ authToken }: { authToken: string }) {
  const hub = useHomeHub(authToken);
  const [configMode, setConfigMode] = useState(false);
  const [draft, setDraft] = useState<IotDevice[]>([]);
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const enterConfig = (): void => {
    setDraft(hub.devices.map((d) => ({ ...d })));
    setConfigMode(true);
  };

  const saveConfig = async (): Promise<void> => {
    setSaving(true);
    if (await hub.saveDevices(draft)) setConfigMode(false);
    setSaving(false);
  };

  /** Match a spoken phrase to a device by name inclusion; "off" wins over
      the default-on so "fan off" and "turn off the fan" both behave.
      Bike phrases dispatch a deck-voice event that SwiftIgnition acts on
      when its SPP link is live (crank auto-releases). */
  const handleCommand = useCallback(
    (raw: string) => {
      const text = raw.toLowerCase();
      if (/bike|ignition|engine|crank/.test(text)) {
        const cmd = /crank|start/.test(text) ? "R" : /\boff\b|lock/.test(text) ? "S" : /\bon\b|unlock/.test(text) ? "O" : null;
        if (cmd) {
          setHeard(`${cmd === "R" ? "⟳" : cmd === "O" ? "▲" : "▼"} BIKE → ${cmd}`);
          window.dispatchEvent(new CustomEvent("deck-voice", { detail: { cmd } }));
          return;
        }
      }
      const device = hub.devices.find((d) => text.includes(d.name.toLowerCase()));
      if (!device) {
        setHeard(`UNRECOGNIZED · "${raw}"`);
        return;
      }
      const value: 0 | 1 = /\boff\b/.test(text) ? 0 : 1;
      setHeard(`${value === 1 ? "▲" : "▼"} ${device.name.toUpperCase()} → ${value === 1 ? "ON" : "OFF"}`);
      void hub.toggle(device, value);
    },
    [hub],
  );

  const toggleVoice = useCallback(() => {
    if (listening) {
      recRef.current?.stop();
      void SpeechRecognition.stop();
      return;
    }
    // Native shell: Android SpeechRecognizer via the Capacitor plugin —
    // webkitSpeechRecognition is unavailable inside the APK WebView.
    if (isNativeApp()) {
      setListening(true);
      setHeard("LISTENING…");
      void (async () => {
        try {
          const perm = await SpeechRecognition.checkPermissions();
          if (perm.speechRecognition !== "granted") {
            const req = await SpeechRecognition.requestPermissions();
            if (req.speechRecognition !== "granted") {
              setHeard("MIC PERMISSION DENIED");
              setListening(false);
              return;
            }
          }
          const { matches } = await SpeechRecognition.start({
            language: "en-US",
            maxResults: 1,
            prompt: "Speak a command",
            partialResults: false,
            popup: true,
          });
          const said = matches?.[0];
          if (said) handleCommand(said);
          else setHeard("HEARD NOTHING");
        } catch {
          setHeard("VOICE MODULE ERROR");
        } finally {
          setListening(false);
        }
      })();
      return;
    }
    const Ctor = getSpeechCtor();
    if (!Ctor) {
      setHeard("VOICE MODULE UNAVAILABLE IN THIS BROWSER");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript;
      if (transcript) handleCommand(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setHeard("");
    setListening(true);
    rec.start();
  }, [handleCommand, listening]);

  const patchDraft = (id: string, patch: Partial<IotDevice>): void =>
    setDraft((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  return (
    <div className="space-y-5">
      {/* command bar */}
      <div className="flex items-center justify-between">
        <p className="whitespace-nowrap font-cd-mono text-[9px] tracking-[0.14em] text-cd-dim sm:text-[10px] sm:tracking-[0.25em]">
          {hub.hubs.length} UPLINK{hub.hubs.length === 1 ? "" : "S"} · {hub.devices.length} NODE
          {hub.devices.length === 1 ? "" : "S"} · POLL 2s
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void hub.refreshState()}
            title="Re-sync telemetry"
            className="border border-cd-line p-1.5 text-cd-dim transition-colors hover:border-cd-cyan/40 hover:text-cd-cyan"
          >
            <RefreshCw size={13} />
          </button>
          {configMode ? (
            <>
              <button
                onClick={() => setConfigMode(false)}
                className="border border-cd-line px-2.5 py-1.5 font-cd-mono text-[10px] tracking-[0.22em] text-cd-dim transition-colors hover:border-cd-red/40 hover:text-cd-red"
              >
                CANCEL
              </button>
              <button
                onClick={() => void saveConfig()}
                disabled={saving}
                className="flex items-center gap-1 border border-cd-green/50 bg-cd-green/10 px-2.5 py-1.5 font-cd-mono text-[10px] tracking-[0.22em] text-cd-green transition-colors hover:bg-cd-green/20 disabled:opacity-40"
              >
                <Check size={12} /> {saving ? "SAVING…" : "COMMIT"}
              </button>
            </>
          ) : (
            <button
              onClick={enterConfig}
              title="Edit devices"
              className="border border-cd-line px-2.5 py-1.5 font-cd-mono text-[10px] tracking-[0.22em] text-cd-dim transition-colors hover:border-cd-amber/40 hover:text-cd-amber"
            >
              CONFIG
            </button>
          )}
        </div>
      </div>

      {hub.error ? (
        <p className="cd-chamfer border border-cd-red/30 bg-cd-red/5 px-3 py-2 font-cd-mono text-[11px] tracking-wider text-cd-red">
          {hub.error}
        </p>
      ) : null}

      {/* relay matrix — grouped per uplink in both run + config modes */}
      <div className="space-y-6">
        {(configMode
          ? hub.hubs.map((h) => ({ hub: h, devs: draft.filter((d) => d.hub === h) }))
          : hub.hubs.map((h) => ({ hub: h, devs: hub.devices.filter((d) => d.hub === h) }))
        )
          .filter((g) => g.devs.length > 0)
          .map((group) => (
            <section key={group.hub} className="space-y-3.5">
              {/* uplink divider */}
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 font-cd-mono text-[10px] tracking-[0.3em] text-cd-white/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-cd-cyan shadow-[0_0_8px_rgba(56,225,255,0.8)]" />
                  UPLINK {group.hub.replace("hub-", "0").toUpperCase()}
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-cd-line to-transparent" />
                <span className="font-cd-mono text-[9px] tracking-[0.22em] text-cd-dim/70">
                  {group.devs.length} NODE{group.devs.length === 1 ? "" : "S"}
                </span>
              </div>
              {group.devs.map((device) =>
                configMode ? (
                  <HudPanel key={device.id} label={`NODE · ${device.id}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        className={`${deckInputCls} min-w-0 flex-1`}
                        value={device.name}
                        maxLength={48}
                        placeholder="device name"
                        onChange={(e) => patchDraft(device.id, { name: e.target.value })}
                      />
                      <input
                        className={`${deckInputCls} w-20`}
                        value={device.pin.toUpperCase()}
                        maxLength={4}
                        placeholder="V18"
                        onChange={(e) => patchDraft(device.id, { pin: e.target.value.replace(/[^\dvV]/gi, "").toLowerCase() })}
                      />
                      <select
                        className={`${deckInputCls} w-24`}
                        value={device.hub}
                        onChange={(e) => patchDraft(device.id, { hub: e.target.value })}
                      >
                        {hub.hubs.map((h) => (
                          <option key={h} value={h} className="bg-cd-hull">
                            {h}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => patchDraft(device.id, { invert: !device.invert })}
                        title="Active-low relay: deck ON sends 0 upstream"
                        className={`border px-2 py-1.5 font-cd-mono text-[10px] tracking-[0.18em] transition-colors ${
                          device.invert
                            ? "border-cd-amber/50 bg-cd-amber/10 text-cd-amber"
                            : "border-cd-line text-cd-dim/70 hover:text-cd-dim"
                        }`}
                      >
                        INV
                      </button>
                      <button
                        onClick={() => setDraft((l) => l.filter((d) => d.id !== device.id))}
                        className="border border-cd-line p-1.5 text-cd-red/70 transition-colors hover:border-cd-red/40 hover:text-cd-red"
                        title="Remove node"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </HudPanel>
                ) : (
                  <HudPanel key={device.id} label={device.pin.toUpperCase()} className={hub.state[device.id] === 1 ? "border-cd-green/25" : ""}>
                  {/* energised accent rail */}
                  {hub.state[device.id] === 1 ? (
                    <span className="absolute bottom-3 left-0 top-3 w-0.5 bg-cd-green shadow-[0_0_10px_rgba(61,255,171,0.8)]" aria-hidden />
                  ) : null}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center border transition-all duration-300 ${
                          hub.state[device.id] === 1
                            ? "border-cd-green/40 bg-cd-green/10 text-cd-green shadow-[0_0_14px_rgba(61,255,171,0.25)]"
                            : "border-cd-line bg-black/30 text-cd-dim"
                        }`}
                      >
                        <DeviceIcon name={device.name} lit={hub.state[device.id] === 1} />
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`truncate font-cd-mono text-[15px] tracking-wide transition-colors ${
                            hub.state[device.id] === 1 ? "text-cd-white" : "text-cd-dim"
                          }`}
                        >
                          {device.name}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <StatusDot value={hub.state[device.id]} />
                          <span
                            className={`font-cd-mono text-[9px] tracking-[0.22em] ${
                              hub.state[device.id] === 1 ? "text-cd-green" : hub.state[device.id] === 0 ? "text-cd-dim/60" : "text-cd-amber/80"
                            }`}
                          >
                            {hub.state[device.id] === 1 ? "ACTIVE" : hub.state[device.id] === 0 ? "IDLE" : "NO SIGNAL"}
                          </span>
                          {device.invert ? <span className="font-cd-mono text-[9px] tracking-[0.18em] text-cd-amber/70">⇄INV</span> : null}
                          {isMasterDevice(device) ? <span className="font-cd-mono text-[9px] tracking-[0.22em] text-cd-cyan/80">◈ MASTER</span> : null}
                        </div>
                      </div>
                    </div>
                    <TacticalToggle
                      on={hub.state[device.id] === 1}
                      busy={Boolean(hub.pending[device.id])}
                      onToggle={() => void hub.toggle(device, hub.state[device.id] === 1 ? 0 : 1)}
                    />
                  </div>
                  </HudPanel>
                )
              )}
            </section>
        ))}

        {configMode ? (
          <button
            onClick={() =>
              setDraft((l) => [...l, { id: `dev-${crypto.randomUUID().slice(0, 8)}`, name: "", hub: hub.hubs[0] ?? "hub-1", pin: "v0" }])
            }
            className="flex items-center justify-center gap-2 border border-dashed border-cd-line py-3.5 font-cd-mono text-[11px] tracking-[0.24em] text-cd-dim transition-colors hover:border-cd-cyan/40 hover:text-cd-cyan"
          >
            <Plus size={14} /> ADD NODE
          </button>
        ) : null}
      </div>

      {/* voice console */}
      <div className="flex items-center gap-3.5 border border-cd-line bg-gradient-to-b from-cd-hull/90 to-cd-glass px-4 py-3">
        <button
          onClick={toggleVoice}
          aria-label="Voice command"
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors ${
            listening ? "border-cd-red/70 text-cd-red" : "border-cd-cyan/40 text-cd-cyan hover:bg-cd-cyan/10 hover:shadow-[0_0_16px_rgba(56,225,255,0.25)]"
          }`}
        >
          {listening ? <span className="absolute inset-0 animate-ping rounded-full border border-cd-red/40" /> : null}
          <Mic size={17} />
        </button>
        <p className="min-w-0 flex-1 truncate font-cd-mono text-[11px] tracking-wider text-cd-dim">
          {listening ? <span className="animate-pulse tracking-[0.24em] text-cd-red">LISTENING…</span> : heard || 'VOICE LINK STANDBY · try "turn on room light"'}
        </p>
        {heard && !listening ? <X size={12} className="shrink-0 cursor-pointer text-cd-dim/50" onClick={() => setHeard("")} /> : null}
      </div>
    </div>
  );
}
