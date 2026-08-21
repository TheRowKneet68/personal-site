import type { CapacitorConfig } from "@capacitor/cli";

/** Capacitor shell for the Cyber-Deck APK. Web assets come from the standard
    production build (dist/) — same PWA bundle, wrapped natively so the
    Bluetooth SPP module can initialise (see src/lib/native.ts). */
const config: CapacitorConfig = {
  appId: "com.therowkneet.cyberdeck",
  appName: "CyberDeck",
  webDir: "dist",
};

export default config;
