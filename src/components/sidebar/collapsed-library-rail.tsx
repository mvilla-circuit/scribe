import { useMemo } from "react";

import { DocumentIcon } from "@/components/ui/document-icon";
import { useBooks } from "@/data/books";
import { useFolders } from "@/data/folders";
import { buildTree, childrenOf, ROOT } from "@/data/tree";
import { useUIStore } from "@/store/ui";

import { CollapsedRailButton } from "./collapsed-rail-button";
import { AlertIcon, BookIcon, FolderIcon } from "./icons";
import { SIDEBAR_ICON_SIZE } from "./sidebar-row";

/**
 * The collapsed sidebar's Library view: an icon-only rail of the root-level
 * books and folders. Books open in place; folders can't show their contents in
 * the narrow rail, so clicking one expands that folder and re-opens the full
 * sidebar.
 */
export function CollapsedLibraryRail() {
  const foldersQuery = useFolders();
  const booksQuery = useBooks();

  const activeBookId = useUIStore((s) => s.activeBookId);
  const setActiveBook = useUIStore((s) => s.setActiveBook);
  const setFolderExpanded = useUIStore((s) => s.setFolderExpanded);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);

  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);
  const rootChildren = useMemo(
    () => childrenOf(buildTree(folders, books), ROOT),
    [folders, books],
  );

  // A full retry card doesn't fit the narrow rail, so surface a single warning
  // affordance that re-opens the sidebar where the expanded tree shows the
  // proper error state with a retry action.
  if (foldersQuery.isError || booksQuery.isError) {
    return (
      <div className="flex flex-col gap-1.5">
        <CollapsedRailButton
          label="Couldn't load library"
          onClick={() => {
            setSidebarCollapsed(false);
          }}
        >
          <span className="text-danger">
            <AlertIcon size={SIDEBAR_ICON_SIZE} />
          </span>
        </CollapsedRailButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {rootChildren.map((child) =>
        child.kind === "book" ? (
          <CollapsedRailButton
            key={child.id}
            label={child.book.title || "Untitled"}
            selected={child.id === activeBookId}
            onClick={() => {
              setActiveBook(child.id);
            }}
          >
            {child.book.icon ? (
              <DocumentIcon icon={child.book.icon} size={SIDEBAR_ICON_SIZE} />
            ) : (
              <BookIcon size={SIDEBAR_ICON_SIZE} />
            )}
          </CollapsedRailButton>
        ) : (
          <CollapsedRailButton
            key={child.id}
            label={child.folder.name}
            indicator
            onClick={() => {
              setFolderExpanded(child.id, true);
              setSidebarCollapsed(false);
            }}
          >
            <FolderIcon size={SIDEBAR_ICON_SIZE} />
          </CollapsedRailButton>
        ),
      )}
    </div>
  );
}
