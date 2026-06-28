// A scheme is a leading run like `http:`, `https:`, `mailto:`, `tel:` — see
// RFC 3986 ("scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )").
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Normalizes a user-entered link href so a scheme-less domain (e.g.
 * `example.com`) becomes a valid absolute URL instead of a broken relative
 * link.
 *
 * Trims the input and returns `""` when it is empty. A value that already
 * carries a scheme (`http:`, `https:`, `mailto:`, `tel:`, …) is returned
 * unchanged, as is one that intentionally points at a relative path or anchor
 * (it begins with `/`, `#`, or `?`). Anything else is treated as a bare domain
 * and prefixed with `https://`.
 */
export function normalizeHref(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (SCHEME_RE.test(trimmed)) return trimmed;
  if (/^[/#?]/.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
