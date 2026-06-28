import { CollapsedOutlineRail } from "@/components/book/collapsed-outline-rail";
import { ChevronLeftIcon } from "@/components/book/icons";
import { Tooltip } from "@/components/ui/tooltip";
import type { Book } from "@/data/books";
import { useUIStore } from "@/store/ui";

import { CollapsedLibraryRail } from "./collapsed-library-rail";

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
  const setActiveBook = useUIStore((s) => s.setActiveBook);

  if (!activeBook) return <CollapsedLibraryRail />;

  return (
    <div className="flex flex-col gap-1.5">
      <Tooltip content="Back to library" side="right">
        <button
          type="button"
          onClick={() => {
            setActiveBook(null);
          }}
          aria-label="Back to library"
          className="mx-auto flex h-9 w-9 items-center justify-center rounded-md text-muted outline-none transition-colors hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeftIcon size={18} />
        </button>
      </Tooltip>
      <CollapsedOutlineRail book={activeBook} />
    </div>
  );
}
