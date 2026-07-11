import { useMemo } from "react";

import { DocumentIcon } from "@/components/ui/document-icon";
import { useBooks } from "@/data/books";
import { useCollections } from "@/data/collections";
import { useFolders } from "@/data/folders";
import { buildTree, childrenOf, ROOT } from "@/data/tree";
import { useUIStore } from "@/store/ui";

import { CollapsedRailButton } from "./collapsed-rail-button";
import { AlertIcon, BookIcon, CollectionIcon, FolderIcon } from "./icons";
import { SIDEBAR_ICON_SIZE } from "./sidebar-row";

/**
 * The collapsed sidebar's Library view: an icon-only rail of the root-level
 * books, collections, and folders. Books and collections open in place;
 * folders can't show their contents in the narrow rail, so clicking one
 * expands that folder and re-opens the full sidebar.
 */
export function CollapsedLibraryRail() {
  const foldersQuery = useFolders();
  const booksQuery = useBooks();
  const collectionsQuery = useCollections();

  const activeBookId = useUIStore((s) => s.activeBookId);
  const activeCollectionId = useUIStore((s) => s.activeCollectionId);
  const setActiveBook = useUIStore((s) => s.setActiveBook);
  const setActiveCollection = useUIStore((s) => s.setActiveCollection);
  const setFolderExpanded = useUIStore((s) => s.setFolderExpanded);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);

  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);
  const collections = useMemo(
    () => collectionsQuery.data ?? [],
    [collectionsQuery.data],
  );
  const rootChildren = useMemo(
    () => childrenOf(buildTree(folders, books, collections), ROOT),
    [folders, books, collections],
  );

  // A full retry card doesn't fit the narrow rail, so surface a single warning
  // affordance that re-opens the sidebar where the expanded tree shows the
  // proper error state with a retry action.
  if (foldersQuery.isError || booksQuery.isError || collectionsQuery.isError) {
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
      {rootChildren.map((child) => {
        if (child.kind === "book") {
          return (
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
          );
        }
        if (child.kind === "collection") {
          return (
            <CollapsedRailButton
              key={child.id}
              label={child.collection.name || "Untitled"}
              selected={child.id === activeCollectionId}
              onClick={() => {
                setActiveCollection(child.id);
              }}
            >
              {child.collection.icon ? (
                <DocumentIcon
                  icon={child.collection.icon}
                  size={SIDEBAR_ICON_SIZE}
                />
              ) : (
                <CollectionIcon size={SIDEBAR_ICON_SIZE} />
              )}
            </CollapsedRailButton>
          );
        }
        return (
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
        );
      })}
    </div>
  );
}
