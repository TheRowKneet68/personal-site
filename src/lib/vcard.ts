import type { SocialLink } from "../types";

/** Contact details printed on the physical card and embedded in the .vcf.
    Website deliberately uses the non-www domain - same as the QR target. */
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

/** The printed visiting card image, embedded as the saved contact's photo. */
const PHOTO_URL = "/images/visiting-card.png";

async function photoLine(): Promise<string> {
  try {
    const res = await fetch(PHOTO_URL);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return `PHOTO;ENCODING=B;TYPE=PNG:${btoa(bin)}`;
  } catch {
    return "";
  }
}

/** Build a vCard 3.0 string from the card + the enabled social links. Local
    generation only - no third-party vCard service. */
export async function buildVCard(links: SocialLink[]): Promise<string> {
  const photo = await photoLine();
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
  if (photo) lines.push(photo);
  links
    .filter((l) => l.enabled)
    .forEach((link, i) => {
      lines.push(`item${i + 1}.URL:${link.url}`);
      lines.push(`item${i + 1}.X-ABLabel:${escapeVCard(link.name)}`);
    });
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/** Save the contact on-device. A data: vCard link makes both iOS Safari and
    Android Chrome open the OS contact-import screen (where the number lands
    in the device contacts), instead of just downloading a file. */
export function downloadVCard(filename: string, content: string): void {
  const b64 = btoa(unescape(encodeURIComponent(content)));
  const anchor = document.createElement("a");
  anchor.href = `data:text/vcard;charset=utf-8;base64,${b64}`;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}