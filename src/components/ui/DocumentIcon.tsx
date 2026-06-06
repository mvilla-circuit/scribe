import { DynamicIcon } from "lucide-react/dynamic";
import type { IconName } from "lucide-react/dynamic";
import { parseIcon } from "../../data/icon";
import { cn } from "../../lib/utils";

type DocumentIconProps = {
  /** The raw stored value from `documents.icon`. */
  icon: string | null | undefined;
  /** Pixel size: emoji font size, glyph box, and image box all use this. */
  size: number;
  className?: string;
};

// Renders a page icon from its stored column value, dispatching on kind: emoji
// glyphs are plain text, Lucide glyphs render via DynamicIcon (tinted with the
// chosen palette color), and uploads render as a rounded image. Returns null
// when no icon is set so callers can supply their own fallback.
export function DocumentIcon({ icon, size, className }: DocumentIconProps) {
  const parsed = parseIcon(icon);
  if (!parsed) return null;

  if (parsed.type === "emoji") {
    return (
      <span
        className={cn("inline-block leading-none", className)}
        style={{ fontSize: size }}
      >
        {parsed.emoji}
      </span>
    );
  }

  if (parsed.type === "glyph") {
    return (
      <DynamicIcon
        name={parsed.name as IconName}
        size={size}
        className={className}
        style={{ color: parsed.color ?? "currentColor" }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={parsed.url}
      alt=""
      width={size}
      height={size}
      className={cn("inline-block rounded-md object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
