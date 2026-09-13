import { QRCodeSVG } from "qrcode.react";

/** Inline SVG QR - encodes EXACTLY `value` (the connect URL, never individual
    social accounts) so the printed card stays valid no matter how links change. */
export function QrCode({ value, size = 168, level = "M" }: { value: string; size?: number; level?: "L" | "M" | "Q" | "H" }) {
  return <QRCodeSVG value={value} size={size} level={level} bgColor="transparent" fgColor="currentColor" marginSize={0} />;
}