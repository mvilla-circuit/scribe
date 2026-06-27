import { fetch } from "@tauri-apps/plugin-http";

/**
 * Cached bookmark metadata. Mirrors the LinkCard node attrs (minus `url`/
 * `status`), so a successful fetch can be written straight onto the node and
 * persisted into `documents.content` for instant, offline re-renders.
 */
export interface LinkMetadata {
  title: string | null;
  description: string | null;
  siteName: string | null;
  favicon: string | null;
  image: string | null;
}

const EMPTY: LinkMetadata = {
  title: null,
  description: null,
  siteName: null,
  favicon: null,
  image: null,
};

/** A friendly host label, e.g. "https://www.example.com/x" -> "example.com". */
export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Normalizes a user-entered URL: adds https:// when no scheme is present so the
 * HTTP plugin (and the eventual <a href>) always get an absolute URL.
 */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
}

/**
 * True for a single, bare URL token (used by the paste rule to decide whether a
 * pasted clipboard string should become a bookmark card).
 */
export function isBareUrl(text: string): boolean {
  const t = text.trim();
  if (/\s/.test(t)) return false;
  return /^https?:\/\/\S+$/i.test(t);
}

function absolute(
  href: string | null | undefined,
  base: string,
): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function parseMetadata(html: string, baseUrl: string): LinkMetadata {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const meta = (selector: string): string | null => {
    const el = doc.querySelector(selector);
    const content = el?.getAttribute("content");
    return content?.trim() ? content.trim() : null;
  };

  const title =
    meta('meta[property="og:title"]') ??
    meta('meta[name="twitter:title"]') ??
    (doc.querySelector("title")?.textContent?.trim() || null);

  const description =
    meta('meta[property="og:description"]') ??
    meta('meta[name="twitter:description"]') ??
    meta('meta[name="description"]');

  const siteName = meta('meta[property="og:site_name"]') ?? hostLabel(baseUrl);

  const image = absolute(
    meta('meta[property="og:image"]') ?? meta('meta[name="twitter:image"]'),
    baseUrl,
  );

  const iconHref =
    doc.querySelector('link[rel="icon"]')?.getAttribute("href") ??
    doc.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") ??
    doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href");
  let favicon = absolute(iconHref, baseUrl);
  if (!favicon) {
    try {
      favicon = `${new URL(baseUrl).origin}/favicon.ico`;
    } catch {
      favicon = null;
    }
  }

  return { title, description, siteName, image, favicon };
}

/**
 * Fetches a page and extracts its OG/Twitter/<title>/favicon metadata. Tolerant
 * by design: any network or parse failure resolves to the bare-domain fallback
 * (a card still renders) rather than throwing.
 */
export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        // A desktop UA coaxes richer OG tags from sites that branch on it.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      connectTimeout: 8000,
    });
    if (!res.ok) return { ...EMPTY, siteName: hostLabel(url) };
    const html = await res.text();
    return parseMetadata(html, url);
  } catch {
    return { ...EMPTY, siteName: hostLabel(url) };
  }
}
