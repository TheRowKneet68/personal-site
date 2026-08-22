import type { CapacitorConfig } from "@capacitor/cli";

/** Capacitor shell for the TheRowKneet APK. The WebView serves the BUNDLED
    build (webDir) so the app shell opens with zero internet and Swift
    Ignition (Bluetooth SPP) works fully offline. API calls go cross-origin
    to the live Vercel functions via the absolute base in services/api.ts;
    Capacitor localhost origins are always CORS-allowlisted server-side.
    Portfolio at root; /terminal via the footer link. */
const config: CapacitorConfig = {
  appId: "com.therowkneet.cyberdeck",
  appName: "TheRowKneet",
  webDir: "dist",
};

export default config;
