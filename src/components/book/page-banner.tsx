import { EditableText } from "./editable-text";

// The full-width banner band shown directly below the breadcrumbs when a page
// has a `banner_color`. It bleeds to the section edges; an inner wrapper matches
// the content column so the optional caption settles into the band's bottom-left
// corner, aligned with the page title below. The band is a bold solid color
// carrying light text, and the caption shows no placeholder (text is optional) —
// the writer clicks the band to add a line, which EditableText commits on
// Enter/blur so it stays one line.
export function PageBanner({
  color,
  text,
  reserveOutline,
  onCommitText,
}: {
  color: string | null;
  text: string | null;
  reserveOutline: boolean;
  onCommitText: (text: string) => void;
}) {
  if (!color) return null;
  return (
    <div
      className="flex w-full items-end"
      style={{ background: color, minHeight: "7rem" }}
    >
      {/* Mirror the content row exactly (same centred article + optional outline
          spacer) so the caption's left edge lands flush with the page title and
          body below, regardless of whether the outline is showing. */}
      <div className="mx-auto flex w-full max-w-[1120px] justify-center gap-12 px-8">
        <div className="w-full min-w-0 max-w-[68ch] pb-3">
          <EditableText
            value={text ?? ""}
            ariaLabel="Banner caption"
            allowEmpty
            onCommit={onCommitText}
            className="font-sans text-sm font-medium tracking-[0.08em]"
            style={{ color: "rgba(255, 255, 255, 0.95)" }}
          />
        </div>
        {reserveOutline && (
          <div className="hidden w-52 shrink-0 md:block" aria-hidden />
        )}
      </div>
    </div>
  );
}
