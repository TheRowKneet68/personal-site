import type { CapacitorConfig } from "@capacitor/cli";

/** Capacitor shell for the TheRowKneet APK. The WebView loads the PUBLISHED
    site directly (server.url) instead of bundling a static copy — so /api/*
    calls hit the live Vercel functions and the app always runs the latest
    deployed code. Portfolio at root; /terminal via the footer link. The
    native bridge (Bluetooth SPP) is still injected into the remote page,
    which is the whole point of going native. */
const config: CapacitorConfig = {
  appId: "com.therowkneet.cyberdeck",
  appName: "TheRowKneet",
  webDir: "dist",
  server: {
    url: "https://www.ronitbaniyagupta.com.np/",
  },
};

export default config;
