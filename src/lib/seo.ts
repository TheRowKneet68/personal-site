import { SITE } from "./constants";

export interface SeoOptions {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  jsonLd?: object;
}

function upsertMeta(attr: "name" | "property", key: string, content: string): void {
  const tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (tag) {
    tag.setAttribute("content", content);
  } else {
    const el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute("content", content);
    document.head.appendChild(el);
  }
}

function upsertLink(rel: string, href: string): void {
  const tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (tag) {
    tag.setAttribute("href", href);
  } else {
    const el = document.createElement("link");
    el.setAttribute("rel", rel);
    el.setAttribute("href", href);
    document.head.appendChild(el);
  }
}

const absolute = (path: string): string => (path.startsWith("http") ? path : `${SITE.url}${path}`);

export function applySeo(options: SeoOptions): void {
  const title = options.title;
  const description = options.description;
  const url = absolute(options.path ?? "/");
  const image = absolute(options.image ?? SITE.ogImage);

  document.title = title;
  upsertMeta("name", "description", description);
  upsertLink("canonical", url);

  upsertMeta("property", "og:type", options.type ?? "website");
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:image", image);
  upsertMeta("property", "og:site_name", `${SITE.handle}`);

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);

  const scriptId = "rk-jsonld";
  const existing = document.getElementById(scriptId);
  if (existing) existing.remove();
  if (options.jsonLd) {
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(options.jsonLd);
    document.head.appendChild(script);
  }
}
