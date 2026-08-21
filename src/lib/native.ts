/**
 * Runtime environment guards for the Cyber-Deck.
 *
 * Threat model: the portfolio bundle is public, so anything Bluetooth-shaped
 * must stay inert in a normal browser. Web Bluetooth (navigator.bluetooth)
 * can neither open an SPP serial port nor pair with an HC-05, but advertising
 * device handles in the public bundle is still needless attack surface.
 *
 * We therefore detect the Capacitor native runtime without importing
 * @capacitor/core at module scope: on web the global simply doesn't exist,
 * so no Bluetooth code path can ever initialise outside the APK build.
 */

/** True only inside a Capacitor native shell (Android APK / iOS). */
export function isNativeApp(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return typeof cap?.isNativePlatform === "function" && cap.isNativePlatform();
}

/** HC-05 MAC from .env.local — bundled, but only consumed by native builds. */
export const HC05_MAC = import.meta.env.VITE_HC05_MAC ?? "";
