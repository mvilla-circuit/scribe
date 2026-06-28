import type { FontMap } from "@/fonts/catalog";
import type { Json } from "@/lib/database.types";
import { asJsonObject } from "@/lib/utils";

/**
 * Coerces an untrusted jsonb value into a {@link FontMap}, keeping only
 * string-valued entries (fontIds) and dropping anything else. Shared by the
 * profile, book, and document font-override accessors so every one of them
 * trusts the column to the same degree instead of casting it blindly.
 */
export function coerceFontMap(value: Json | undefined): FontMap {
  const raw = asJsonObject(value);
  const result: Record<string, string> = {};
  for (const [role, entry] of Object.entries(raw)) {
    if (typeof entry === "string") result[role] = entry;
  }
  return result;
}
