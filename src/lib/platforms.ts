import { ExternalLink } from "lucide-react";
import {
  SiBandcamp,
  SiBehance,
  SiBitbucket,
  SiBluesky,
  SiCodesandbox,
  SiDevdotto,
  SiDiscord,
  SiDribbble,
  SiFacebook,
  SiFigma,
  SiFlickr,
  SiGithub,
  SiGitlab,
  SiHackerrank,
  SiHashnode,
  SiHuggingface,
  SiInstagram,
  SiKaggle,
  SiKick,
  SiLeetcode,
  SiLine,
  SiLinktree,
  SiMastodon,
  SiMedium,
  SiMeetup,
  SiMessenger,
  SiMixcloud,
  SiPatreon,
  SiPaypal,
  SiPinterest,
  SiProducthunt,
  SiQuora,
  SiReddit,
  SiReplit,
  SiSignal,
  SiSnapchat,
  SiSoundcloud,
  SiSpotify,
  SiStackoverflow,
  SiSubstack,
  SiTelegram,
  SiThreads,
  SiTiktok,
  SiTripadvisor,
  SiTumblr,
  SiTwitch,
  SiVimeo,
  SiWechat,
  SiWhatsapp,
  SiX,
  SiYelp,
  SiYoutube,
  SiZoom,
} from "react-icons/si";
import { FaCodepen, FaLinkedin } from "react-icons/fa6";
import type { ComponentType } from "react";

/**
 * Platform registry - official brand marks (Simple Icons via react-icons, with
 * Font Awesome fallbacks for brands Simple Icons dropped) and the hostname
 * table used for auto-detection. Real logos, bundled locally, never scraped.
 * Mirrors the server's label table.
 *
 * Anything NOT listed here can still be added - the admin accepts any http(s)
 * URL with a free-form platform name; it just gets the neutral external-link
 * icon (or a manual icon override).
 */

export interface PlatformMeta {
  id: string;
  name: string;
  hosts: string[];
}

export const PLATFORMS: PlatformMeta[] = [
  { id: "instagram", name: "Instagram", hosts: ["instagram.com", "instagr.am"] },
  { id: "facebook", name: "Facebook", hosts: ["facebook.com", "fb.com"] },
  { id: "tiktok", name: "TikTok", hosts: ["tiktok.com"] },
  { id: "linkedin", name: "LinkedIn", hosts: ["linkedin.com"] },
  { id: "github", name: "GitHub", hosts: ["github.com"] },
  { id: "youtube", name: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  { id: "x", name: "X", hosts: ["x.com", "twitter.com"] },
  { id: "whatsapp", name: "WhatsApp", hosts: ["wa.me"] },
  { id: "telegram", name: "Telegram", hosts: ["t.me", "telegram.me", "telegram.org"] },
  { id: "threads", name: "Threads", hosts: ["threads.net"] },
  { id: "bluesky", name: "Bluesky", hosts: ["bsky.app", "bluesky.app", "bluesky.social"] },
  { id: "mastodon", name: "Mastodon", hosts: ["mastodon.social", "mastodon.online"] },
  { id: "snapchat", name: "Snapchat", hosts: ["snapchat.com"] },
  { id: "reddit", name: "Reddit", hosts: ["reddit.com"] },
  { id: "pinterest", name: "Pinterest", hosts: ["pinterest.com", "pin.it"] },
  { id: "discord", name: "Discord", hosts: ["discord.com", "discord.gg"] },
  { id: "twitch", name: "Twitch", hosts: ["twitch.tv"] },
  { id: "medium", name: "Medium", hosts: ["medium.com"] },
  { id: "substack", name: "Substack", hosts: ["substack.com"] },
  { id: "dev", name: "dev.to", hosts: ["dev.to"] },
  { id: "hashnode", name: "Hashnode", hosts: ["hashnode.com"] },
  { id: "dribbble", name: "Dribbble", hosts: ["dribbble.com"] },
  { id: "behance", name: "Behance", hosts: ["behance.net"] },
  { id: "figma", name: "Figma", hosts: ["figma.com"] },
  { id: "codepen", name: "CodePen", hosts: ["codepen.io"] },
  { id: "codesandbox", name: "CodeSandbox", hosts: ["codesandbox.io"] },
  { id: "replit", name: "Replit", hosts: ["replit.com"] },
  { id: "spotify", name: "Spotify", hosts: ["open.spotify.com", "spotify.com"] },
  { id: "vimeo", name: "Vimeo", hosts: ["vimeo.com"] },
  { id: "soundcloud", name: "SoundCloud", hosts: ["soundcloud.com"] },
  { id: "bandcamp", name: "Bandcamp", hosts: ["bandcamp.com"] },
  { id: "mixcloud", name: "Mixcloud", hosts: ["mixcloud.com"] },
  { id: "stackoverflow", name: "Stack Overflow", hosts: ["stackoverflow.com"] },
  { id: "gitlab", name: "GitLab", hosts: ["gitlab.com"] },
  { id: "bitbucket", name: "Bitbucket", hosts: ["bitbucket.org"] },
  { id: "huggingface", name: "Hugging Face", hosts: ["huggingface.co"] },
  { id: "quora", name: "Quora", hosts: ["quora.com"] },
  { id: "paypal", name: "PayPal", hosts: ["paypal.me", "paypal.com"] },
  { id: "linktree", name: "Linktree", hosts: ["linktr.ee"] },
  { id: "tumblr", name: "Tumblr", hosts: ["tumblr.com"] },
  { id: "flickr", name: "Flickr", hosts: ["flickr.com"] },
  { id: "yelp", name: "Yelp", hosts: ["yelp.com", "yelp.ca"] },
  { id: "tripadvisor", name: "Tripadvisor", hosts: ["tripadvisor.com"] },
  { id: "kaggle", name: "Kaggle", hosts: ["kaggle.com"] },
  { id: "hackerrank", name: "HackerRank", hosts: ["hackerrank.com"] },
  { id: "leetcode", name: "LeetCode", hosts: ["leetcode.com"] },
  { id: "producthunt", name: "Product Hunt", hosts: ["producthunt.com"] },
  { id: "patreon", name: "Patreon", hosts: ["patreon.com"] },
  { id: "zoom", name: "Zoom", hosts: ["zoom.us", "zoom.com"] },
  { id: "signal", name: "Signal", hosts: ["signal.org", "signal.me"] },
  { id: "line", name: "LINE", hosts: ["line.me"] },
  { id: "wechat", name: "WeChat", hosts: ["weixin.qq.com"] },
  { id: "messenger", name: "Messenger", hosts: ["messenger.com", "m.me"] },
  { id: "meetup", name: "Meetup", hosts: ["meetup.com"] },
  { id: "kick", name: "Kick", hosts: ["kick.com"] },
];

export const PLATFORM_IDS = PLATFORMS.map((p) => p.id);

export function platformName(id: string): string {
  return PLATFORMS.find((p) => p.id === id)?.name ?? id;
}

/** Detect the platform from a hostname, or null when the URL isn't a known one. */
export function detectPlatform(url: string): string | null {
  const clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) return null;
  try {
    const host = new URL(clean).hostname.replace(/^www\./, "").toLowerCase();
    for (const p of PLATFORMS) {
      if (p.hosts.includes(host)) return p.id;
    }
  } catch {
    return null;
  }
  return null;
}

/** Only http(s) URLs are acceptable for a link target. Rejects javascript:,
    data:, vbscript: and every other scheme. */
export function isValidHttpUrl(url: string): boolean {
  const clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) return false;
  try {
    const parsed = new URL(clean);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Brand marks - Simple Icons via react-icons (LinkedIn and CodePen were
    dropped from recent Simple Icons releases, so those fall back to Font
    Awesome). Unknown platforms fall back to a neutral external-link glyph so
    a bad record can never crash. */
const BRAND_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  instagram: SiInstagram,
  facebook: SiFacebook,
  tiktok: SiTiktok,
  linkedin: FaLinkedin,
  github: SiGithub,
  youtube: SiYoutube,
  x: SiX,
  whatsapp: SiWhatsapp,
  telegram: SiTelegram,
  threads: SiThreads,
  bluesky: SiBluesky,
  mastodon: SiMastodon,
  snapchat: SiSnapchat,
  reddit: SiReddit,
  pinterest: SiPinterest,
  discord: SiDiscord,
  twitch: SiTwitch,
  medium: SiMedium,
  substack: SiSubstack,
  dev: SiDevdotto,
  hashnode: SiHashnode,
  dribbble: SiDribbble,
  behance: SiBehance,
  figma: SiFigma,
  codepen: FaCodepen,
  codesandbox: SiCodesandbox,
  replit: SiReplit,
  spotify: SiSpotify,
  vimeo: SiVimeo,
  soundcloud: SiSoundcloud,
  bandcamp: SiBandcamp,
  mixcloud: SiMixcloud,
  stackoverflow: SiStackoverflow,
  gitlab: SiGitlab,
  bitbucket: SiBitbucket,
  huggingface: SiHuggingface,
  quora: SiQuora,
  paypal: SiPaypal,
  linktree: SiLinktree,
  tumblr: SiTumblr,
  flickr: SiFlickr,
  yelp: SiYelp,
  tripadvisor: SiTripadvisor,
  kaggle: SiKaggle,
  hackerrank: SiHackerrank,
  leetcode: SiLeetcode,
  producthunt: SiProducthunt,
  patreon: SiPatreon,
  zoom: SiZoom,
  signal: SiSignal,
  line: SiLine,
  wechat: SiWechat,
  messenger: SiMessenger,
  meetup: SiMeetup,
  kick: SiKick,
};

export function platformIcon(platform: string): ComponentType<{ className?: string }> {
  return BRAND_ICONS[platform] ?? ExternalLink;
}