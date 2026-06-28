import { DocumentIcon } from "@/components/ui/document-icon";
import { BookIcon, PageLinkIcon } from "@/editor/icons";

/**
 * The leading glyph for an internal page reference, shared by the page picker
 * and the page-link card so both pick the same icon for a target: its own
 * document icon when set, otherwise the book/page fallback glyph.
 */
export function PageTargetIcon({
  icon,
  glyph,
}: {
  icon: string | null;
  glyph: "page" | "book";
}) {
  if (icon) return <DocumentIcon icon={icon} size={18} />;
  if (glyph === "book") return <BookIcon size={16} />;
  return <PageLinkIcon size={16} />;
}
