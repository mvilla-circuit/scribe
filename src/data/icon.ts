// A page icon can be one of three kinds: an emoji glyph, a Lucide line icon
// (optionally tinted with a palette color), or a user-uploaded image. All three
// are persisted into the single `documents.icon` text column as tagged JSON, so
// no schema change is needed and every render site shares one parse path.
//
// Backward compatibility: icons saved before this change are bare emoji strings
// (e.g. "😀"), which are not valid tagged JSON. `parseIcon` detects that and
// treats any unrecognized payload as a legacy emoji, so old pages keep working.

export type IconValue =
  | { type: "emoji"; emoji: string }
  | { type: "glyph"; name: string; color: string | null }
  | { type: "image"; url: string };

// Parses the stored column value into a structured icon, or null when unset.
// Falls back to treating the raw string as a legacy emoji when it isn't our
// tagged JSON.
export function parseIcon(raw: string | null | undefined): IconValue | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { type: "emoji", emoji: raw };
  }

  if (!parsed || typeof parsed !== "object") {
    return { type: "emoji", emoji: raw };
  }

  const value = parsed as Record<string, unknown>;
  switch (value.type) {
    case "emoji":
      return typeof value.emoji === "string"
        ? { type: "emoji", emoji: value.emoji }
        : null;
    case "glyph":
      return typeof value.name === "string"
        ? {
            type: "glyph",
            name: value.name,
            color: typeof value.color === "string" ? value.color : null,
          }
        : null;
    case "image":
      return typeof value.url === "string"
        ? { type: "image", url: value.url }
        : null;
    default:
      return { type: "emoji", emoji: raw };
  }
}

// Serializes a structured icon into the string stored on `documents.icon`.
export function serializeIcon(icon: IconValue): string {
  return JSON.stringify(icon);
}
