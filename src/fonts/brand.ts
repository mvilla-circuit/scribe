/**
 * Cardillac is personal-use only (see `assets/LICENSES.md`). Allowed when
 * `VITE_ALLOW_CARDILLAC=true`, or automatically in Vite DEV. Commercial / App
 * Store builds must leave the flag unset (production + no allow).
 */
export function isCardillacAllowed(): boolean {
  if (import.meta.env.VITE_ALLOW_CARDILLAC === "true") return true;
  if (import.meta.env.VITE_ALLOW_CARDILLAC === "false") return false;
  return import.meta.env.DEV;
}

/** Catalog id for the brand wordmark face. */
export const BRAND_FONT_ID = "cardillac";
