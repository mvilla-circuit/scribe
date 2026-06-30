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
 * A readable label from a URL's path, e.g.
 * "https://github.com/owner/repo" -> "owner/repo". Returns `null` for a bare
 * domain (no path), so callers can fall back to the host. Used to give an
 * unfetchable link (private repo, 404, offline) a meaningful title.
 */
export function pathLabel(url: string): string | null {
  try {
    const cleaned = decodeURIComponent(new URL(url).pathname).replace(
      /^\/+|\/+$/g,
      "",
    );
    return cleaned || null;
  } catch {
    return null;
  }
}

// The conventional `/favicon.ico` for a URL's origin, used so even an
// unfetchable link can still show the site's icon.
function originFavicon(url: string): string | null {
  try {
    return `${new URL(url).origin}/favicon.ico`;
  } catch {
    return null;
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

/**
 * Extracts OG/Twitter/`<title>`/favicon metadata from a page's HTML. Pure and
 * tolerant: missing fields read back as `null` (with a bare-domain `siteName`
 * fallback), and relative image/favicon URLs are resolved against `baseUrl`.
 */
export function parseMetadata(html: string, baseUrl: string): LinkMetadata {
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

  // Try a spread of image conventions: sites disagree on which one they set, so
  // checking several (incl. the secure/url variants and the legacy image_src
  // link) recovers a preview far more often than og:image alone.
  const image = absolute(
    meta('meta[property="og:image"]') ??
      meta('meta[property="og:image:secure_url"]') ??
      meta('meta[property="og:image:url"]') ??
      meta('meta[name="twitter:image"]') ??
      meta('meta[name="twitter:image:src"]') ??
      doc.querySelector('link[rel="image_src"]')?.getAttribute("href") ??
      null,
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

// Fetches a page and parses its metadata, or resolves to `null` on any network
// / HTTP failure so the caller can fall back to an oEmbed provider.
async function fetchAndParse(url: string): Promise<LinkMetadata | null> {
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
    if (!res.ok) return null;
    const html = await res.text();
    return parseMetadata(html, url);
  } catch {
    return null;
  }
}

// The shape of the bits of an oEmbed payload we use (snake_case per the spec).
interface OEmbedResponse {
  title?: string;
  thumbnail_url?: string;
  provider_name?: string;
}

// Returns the oEmbed JSON endpoint for providers whose pages are JS shells that
// hide their OG tags from a plain GET (so scraping the HTML yields nothing).
function oEmbedEndpoint(url: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  const target = encodeURIComponent(url);
  if (host === "youtube.com" || host === "youtu.be") {
    return `https://www.youtube.com/oembed?url=${target}&format=json`;
  }
  if (host === "vimeo.com") {
    return `https://vimeo.com/api/oembed.json?url=${target}`;
  }
  return null;
}

// Reliable title + thumbnail for a known provider via its oEmbed endpoint, or
// `null` when there's no endpoint or the request/parse fails.
async function fetchOEmbed(url: string): Promise<LinkMetadata | null> {
  const endpoint = oEmbedEndpoint(url);
  if (!endpoint) return null;
  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      connectTimeout: 8000,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OEmbedResponse;
    const title = data.title?.trim() || null;
    const image = data.thumbnail_url?.trim() || null;
    if (!title && !image) return null;
    return {
      ...EMPTY,
      title,
      image,
      siteName: data.provider_name?.trim() || hostLabel(url),
    };
  } catch {
    return null;
  }
}

/**
 * Resolves a URL's bookmark metadata. Scrapes the page's OG/Twitter tags first
 * and, when that leaves the title or preview image missing, fills the gaps from
 * a provider oEmbed endpoint (e.g. YouTube). Tolerant by design: any failure
 * still resolves to a bare-domain fallback so a card always renders.
 */
export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  const parsed = await fetchAndParse(url);
  if (parsed?.title && parsed.image) return parsed;

  const embed = await fetchOEmbed(url);
  if (!parsed && !embed) {
    return {
      ...EMPTY,
      siteName: hostLabel(url),
      favicon: originFavicon(url),
    };
  }

  return {
    title: parsed?.title ?? embed?.title ?? null,
    description: parsed?.description ?? null,
    siteName: embed?.siteName ?? parsed?.siteName ?? hostLabel(url),
    favicon: parsed?.favicon ?? originFavicon(url),
    image: parsed?.image ?? embed?.image ?? null,
  };
}
