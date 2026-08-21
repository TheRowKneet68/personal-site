# Cyber-Deck Setup & Operations Guide

Private IoT control hub ("Cyber-Deck") layered onto the public portfolio PWA.

- **Public site** — offline-capable PWA, zero secrets in the bundle.
- **`/terminal`** — unlisted deck route, gated by the same scrypt/HMAC auth as `/admin`.
- **Suraksha Ghar** — home automation via Blynk REST (tokens server-side only).
- **Swift Ignition** — HC-05 bike ignition over Bluetooth SPP (**native APK only**).

---

## 1. Environment variables

All secrets live in `.env` / `.env.local` (both gitignored). **Never** prefix a
secret with `VITE_` — Vite inlines those into the public JS bundle.

| Var | File | Who reads it | Purpose |
|---|---|---|---|
| `BLYNK_TOKEN` | `.env` | Express server only | Comma-separated Blynk app tokens → addressed as `hub-1`, `hub-2`, … |
| `ADMIN_PASSWORD` | `.env` | Express server only | Deck/admin login (min 12 chars) |
| `VITE_HC05_MAC` | `.env.local` | App bundle (APK only) | HC-05 MAC, e.g. `58:56:00:01:50:09` |

On Vercel: Project → Settings → Environment Variables → *Import .env*
(Production + Preview + Development).

### One-time Supabase step

Run the whole `supabase/schema.sql` in the Supabase SQL editor (the appended
`iot_config` table stores your editable device registry). Until it runs,
device *reads* work but config saves return
`"Device storage not configured"`.

### Blynk datastreams

The dashboard can only read/write pins that exist as datastreams:

- Every hub template needs **Integer datastreams V0–V4** (or whatever pins you
  map devices to in CONFIG mode — e.g. `V18`).
- Missing datastream = that device shows an amber "unknown" LED; writes fail
  with "Device rejected the command".

---

## 2. Run locally

```bash
npm install
npm run dev          # web on :5173 + API on :3001 (proxied)
```

- Portfolio: `http://localhost:5173`
- Deck: `http://localhost:5173/terminal` (unlisted, `noindex`)
- Smoke-test the IoT proxy: `cd server && npx tsx scripts/smoke-iot.ts`
  (API must be running)

Bluetooth is intentionally inert in browsers — Swift Ignition runs in
**SIMULATION / NATIVE ONLY** mode.

---

## 3. Deploy the PWA (Vercel)

```bash
npm run build        # emits dist/ + sw.js + manifest.webmanifest
npm run preview      # verify service worker + manifest serve 200
git push             # Vercel builds automatically
```

Checklist after first deploy:

1. Open the site in a mobile browser → "Add to Home Screen" → launches standalone.
2. DevTools → Application → Service Workers: `sw.js` activated.
3. Offline toggle → portfolio still loads (precache), `/terminal` deliberately
   does NOT work offline, `/api/*` never cached.
4. Log into `/terminal` once so the deck chunk is warm.

Caching policy (configured in `vite.config.ts`):

| What | Policy |
|---|---|
| App shell, fonts, images | Precache at install |
| `resume.pdf` | CacheFirst after first view |
| Supabase public media | StaleWhileRevalidate |
| `/api/*` | **Network only — never cached** |
| `/terminal` navigation | **Never served from cache** |

HTTPS is mandatory (service worker + Web Speech both require it).

---

## 4. Build the Android APK (Capacitor)

Prerequisites: Android Studio (current stable — its bundled JDK is correct),
USB debugging optional, Node ≥ 20.

```bash
npm run build            # fresh web assets into dist/
npx cap add android      # ONE TIME — generates android/ platform folder
npx cap sync             # copies dist/ + plugins into the native project
npx cap open android     # opens Android Studio
```

In Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.
Debug APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`.
For release: Build → Generate Signed Bundle/APK (create a keystore, keep it
safe — losing it means you can never update the installed app).

Rebuild after any web change:

```bash
npm run build && npx cap sync
```

> The APK wraps the same production bundle. The deck's Bluetooth module
> activates because `Capacitor.isNativePlatform()` is true inside the WebView;
> the public website keeps it disabled.

### Install on the bike phone

1. Transfer `app-debug.apk`, open it, allow "install unknown apps" for your
   file manager.
2. Pair the HC-05 **once in Android Settings → Bluetooth** (PIN `1234` or
   `0000`). The app connects by MAC — it does not pair for you.
3. Launch CyberDeck → `/terminal` → authenticate → SWIFT IGNITION → CONNECT.

---

## 5. Bluetooth troubleshooting

| Symptom | Cause / fix |
|---|---|
| "Bluetooth permission denied" | Android 12+ requires `BLUETOOTH_CONNECT`. Grant it when prompted, or Settings → Apps → CyberDeck → Permissions → Nearby devices. |
| Connect fails instantly | HC-05 not paired yet, or wrong MAC in `.env.local`. Verify MAC with a serial terminal app. The hook falls back from secure to insecure RFCOMM automatically — persistent failure usually means pairing/power. |
| Connected, commands ignored | Arduino sketch must read the serial byte and act on `'O'/'S'/'R'/'E'`. Check HC-05 TX/RX wiring (5V logic divider on RX recommended) and baud 9600. |
| Worked, now "LINK LOST" | Bike powered off / out of range kills SPP silently. Auto-reconnect tries 3× every 4 s; press CONNECT to retry manually. |
| Connect hangs ~10 s then fails | Wrong MAC (device absent) — classic RFCOMM discovery timeout. |

Protocol reference (what the deck transmits):

| Byte | Meaning | Trigger |
|---|---|---|
| `'O'` | Unlock / ignition ON | Lock switch → unlocked |
| `'S'` | Lock / ignition OFF | Lock switch → locked |
| `'R'` | Starter crank ON | Reactor touchdown |
| `'E'` | Starter crank OFF | Any release, blur, tab hide, or 5 s auto-cut |

### Android background policies

- **Battery optimization** can freeze the WebView between commands:
  Settings → Apps → CyberDeck → Battery → **Unrestricted**.
- Aggressive OEM killers (Xiaomi/Realme/Samsung): exclude CyberDeck from
  "deep sleeping apps" / put it under "Never sleeping apps".
- SPP survives screen-off but **not** Bluetooth toggles or losing the HC-05's
  power — the keepalive detects this within ~15 s and re-links.
- Voice control (Suraksha Ghar) needs microphone permission; Web Speech works
  on Chrome/WebView online, and is unavailable on iOS browsers.

---

## 6. Security model recap

- Blynk tokens exist **only** in the server process; clients address hubs as
  `hub-N`. Device registry rows store hub labels, never tokens.
- All `/api/iot/*` routes require the HMAC bearer token (same credential as
  `/admin`); login is rate-limited 5/15 min, writes 30/min.
- Deck session auto-locks after 5 min idle (`ESC` locks immediately); storage
  key is separate from the content-admin panel.
- Upstream fetch errors are normalised before responding — a failed Blynk call
  can never echo a tokened URL into the client or logs.
- Rotate the password periodically in `/admin` → Security (bumps token
  version, signs out every session including the deck).

## 7. Useful commands

```bash
npm run dev            # local dev (web + api)
npm run build          # production web build (+ PWA assets)
npm run preview        # serve dist/ locally
npm run typecheck      # tsc -b
npm run lint           # eslint
cd server && npx tsx scripts/smoke-iot.ts   # IoT proxy smoke test
```
