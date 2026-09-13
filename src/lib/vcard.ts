import type { SocialLink } from "../types";

/** Contact details printed on the physical card and embedded in the .vcf.
    Website deliberately uses the non-www domain — same as the QR target. */
export const CARD = {
  lastName: "Baniya Gupta",
  firstName: "Ronit",
  fullName: "Ronit Baniya Gupta",
  phone: "+977 982-911-7277",
  phoneRaw: "+9779829117277",
  email: "ronitbaniya68@gmail.com",
  website: "https://ronitbaniyagupta.com.np",
  org: "Suraksha Ghar",
  title: "Founder & CEO",
} as const;

function escapeVCard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Build a vCard 3.0 string from the card + the enabled social links. Local
    generation only — no third-party vCard service. */
export function buildVCard(links: SocialLink[]): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCard(CARD.lastName)};${escapeVCard(CARD.firstName)};;;`,
    `FN:${escapeVCard(CARD.fullName)}`,
    `ORG:${escapeVCard(CARD.org)}`,
    `TITLE:${escapeVCard(CARD.title)}`,
    `TEL;TYPE=CELL:${CARD.phoneRaw}`,
    `EMAIL;TYPE=INTERNET:${CARD.email}`,
    `URL:${CARD.website}`,
  ];
  links
    .filter((l) => l.enabled)
    .forEach((link, i) => {
      lines.push(`item${i + 1}.URL:${link.url}`);
      lines.push(`item${i + 1}.X-ABLabel:${escapeVCard(link.name)}`);
    });
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/** Trigger a .vcf download in the browser (works on Android + iOS Safari). */
export function downloadVCard(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}