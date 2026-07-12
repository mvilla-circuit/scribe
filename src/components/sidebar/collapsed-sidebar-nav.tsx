import { CollapsedOutlineRail } from "@/components/book/collapsed-outline-rail";
import { ChevronLeftIcon } from "@/components/book/icons";
import { IconButton } from "@/components/ui/icon-button";
import type { Book } from "@/data/books";

import { CollapsedLibraryRail } from "./collapsed-library-rail";
import { useBookBackTarget } from "./use-book-back-target";

/**
 * The body of the collapsed sidebar: an icon-only rail showing the Library's
 * books/folders, or — when a book is open — a Back-to-library control above the
 * book's Title Page and pages.
 */
export function CollapsedSidebarNav({
  activeBook,
}: {
  activeBook: Book | null;
}) {
  const backTarget = useBookBackTarget(activeBook);

  if (!activeBook) return <CollapsedLibraryRail />;

  return (
    <div className="flex flex-col gap-1.5">
      <IconButton
        label={backTarget.tooltip}
        side="right"
        onClick={backTarget.goBack}
        className="mx-auto text-muted"
      >
        <ChevronLeftIcon size={18} />
      </IconButton>
      <CollapsedOutlineRail book={activeBook} />
    </div>
  );
}
