import { useMemo } from "react";

import { EditableText } from "@/components/book/editable-text";
import { Masthead } from "@/components/book/masthead";
import { NavHistoryControls } from "@/components/book/nav-history-controls";
import {
  BookIcon,
  BookPlusIcon,
  CollectionIcon,
  CollectionPlusIcon,
  RemoveFromCollectionIcon,
} from "@/components/sidebar/icons";
import { Button } from "@/components/ui/button";
import { type RowAction } from "@/components/ui/row-action-menu";
import { useBooks, useCreateBook, useMoveBook } from "@/data/books";
import {
  useCollections,
  useCreateCollection,
  useMoveCollection,
  useRenameCollection,
  useUpdateCollection,
} from "@/data/collections";
import { useFolders } from "@/data/folders";
import { endPositionFor } from "@/data/ordering";
import {
  buildTree,
  childrenOf,
  collectionAncestors,
  ROOT,
  type TreeChild,
} from "@/data/tree";
import { useUIStore } from "@/store/ui";

import { CoverCard } from "./cover-card";

/**
 * A collection's own page: an editable masthead (icon, title, description) with
 * an ancestor breadcrumb, and grids of the sub-collections and books it holds.
 * Creating an item nests it inside this collection; "Remove from collection"
 * reparents an item back to the top level of the Library.
 */
export function CollectionPage({ collectionId }: { collectionId: string }) {
  const collectionsQuery = useCollections();
  const foldersQuery = useFolders();
  const booksQuery = useBooks();

  const collections = useMemo(
    () => collectionsQuery.data ?? [],
    [collectionsQuery.data],
  );
  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);

  const collection = collections.find((c) => c.id === collectionId) ?? null;

  const model = useMemo(
    () => buildTree(folders, books, collections),
    [folders, books, collections],
  );
  const children = useMemo(
    () => childrenOf(model, collectionId),
    [model, collectionId],
  );
  const ancestors = useMemo(
    () => collectionAncestors(collections, collectionId),
    [collections, collectionId],
  );

  const setActiveCollection = useUIStore((s) => s.setActiveCollection);
  const setActiveBook = useUIStore((s) => s.setActiveBook);
  const setFolderExpanded = useUIStore((s) => s.setFolderExpanded);

  const renameCollection = useRenameCollection();
  const updateCollection = useUpdateCollection();
  const createBook = useCreateBook();
  const createCollection = useCreateCollection();
  const moveBook = useMoveBook();
  const moveCollection = useMoveCollection();

  const childCollections = children.filter((c) => c.kind === "collection");
  const childBooks = children.filter((c) => c.kind === "book");

  const rootPosition = () => endPositionFor(childrenOf(model, ROOT));

  const handleNewBook = () => {
    const id = crypto.randomUUID();
    createBook.mutate({
      id,
      title: "Untitled",
      folder_id: null,
      collection_id: collectionId,
      position: endPositionFor(children),
    });
    setActiveBook(id);
  };

  const handleNewCollection = () => {
    const id = crypto.randomUUID();
    createCollection.mutate({
      id,
      name: "Untitled",
      parent_collection_id: collectionId,
      position: endPositionFor(children),
    });
    setFolderExpanded(collectionId, true);
    setActiveCollection(id);
  };

  const bookActions = (id: string): RowAction[] => [
    {
      icon: <RemoveFromCollectionIcon size={15} />,
      label: "Remove from collection",
      onSelect: () => {
        moveBook.mutate({
          id,
          folder_id: null,
          collection_id: null,
          position: rootPosition(),
        });
      },
    },
  ];

  const collectionActions = (id: string): RowAction[] => [
    {
      icon: <RemoveFromCollectionIcon size={15} />,
      label: "Remove from collection",
      onSelect: () => {
        moveCollection.mutate({
          id,
          parent_collection_id: null,
          position: rootPosition(),
        });
      },
    },
  ];

  // No resolved collection has three distinct causes — an in-flight fetch, a
  // failed fetch, and a genuinely missing id — so surface each rather than
  // flashing one ambiguous blank pane. The history controls stay mounted so
  // back/forward keep working from any of these states.
  if (!collection) {
    const status = collectionsQuery.isLoading
      ? { title: "Loading collection…", body: null }
      : collectionsQuery.isError
        ? {
            title: "Couldn't load this collection",
            body: "Check your connection and try again.",
          }
        : {
            title: "Collection not found",
            body: "It may have been deleted or moved to another place.",
          };
    return (
      <div className="flex h-full flex-col bg-bg">
        <nav
          aria-label="Collection settings"
          data-tauri-drag-region
          className="sticky top-0 z-20 flex items-center gap-3 bg-bg px-8 py-3"
        >
          <NavHistoryControls />
        </nav>
        <div className="flex flex-1 items-center justify-center px-8 pb-16">
          <div className="text-center">
            <p className="text-sm font-medium text-text">{status.title}</p>
            {status.body && (
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {status.body}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = children.length === 0;

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <nav
        aria-label="Collection settings"
        data-tauri-drag-region
        className="sticky top-0 z-20 flex items-center gap-3 bg-bg px-8 py-3"
      >
        <NavHistoryControls />
        {ancestors.length > 0 && (
          <div
            aria-label="Breadcrumb"
            className="flex min-w-0 flex-1 items-center gap-1 text-sm text-muted"
          >
            {ancestors.map((parent) => (
              <span key={parent.id} className="flex min-w-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCollection(parent.id);
                  }}
                  className="min-w-0 shrink truncate rounded-sm px-1 outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {parent.name || "Untitled"}
                </button>
                <span className="shrink-0 select-none text-muted/50">/</span>
              </span>
            ))}
            <span className="min-w-0 shrink truncate px-1 text-text">
              {collection.name || "Untitled"}
            </span>
          </div>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={handleNewCollection}>
            <CollectionPlusIcon size={15} />
            New collection
          </Button>
          <Button variant="primary" onClick={handleNewBook}>
            <BookPlusIcon size={15} />
            New book
          </Button>
        </span>
      </nav>

      <div className="mx-auto w-full max-w-5xl px-8 pb-16 pt-8 sm:pb-24">
        <Masthead
          icon={collection.icon}
          onSelectIcon={(icon) => {
            updateCollection.mutate({ id: collection.id, icon });
          }}
          onRemoveIcon={() => {
            updateCollection.mutate({ id: collection.id, icon: null });
          }}
          changeIconLabel="Change collection icon"
        >
          <EditableText
            value={collection.name}
            ariaLabel="Collection name"
            placeholder="Untitled"
            onCommit={(name) => {
              renameCollection.mutate({ id: collection.id, name });
            }}
            className="text-4xl font-semibold leading-tight tracking-tight text-text"
            style={{ fontFamily: "var(--font-display)" }}
          />
          <EditableText
            value={collection.description ?? ""}
            ariaLabel="Collection description"
            placeholder="Add a description"
            allowEmpty
            onCommit={(description) => {
              updateCollection.mutate({
                id: collection.id,
                description: description || null,
              });
            }}
            className="mt-3 text-base leading-relaxed text-muted"
          />
        </Masthead>

        {isEmpty ? (
          <div className="mt-12 flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tree-group text-muted">
              <CollectionIcon size={22} />
            </div>
            <p className="mt-4 text-sm font-medium text-text">
              This collection is empty
            </p>
            <p className="mt-1 max-w-[22rem] text-xs leading-relaxed text-muted">
              Add books to gather your writing, or nest another collection
              inside.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="primary" onClick={handleNewBook}>
                <BookPlusIcon size={15} />
                New book
              </Button>
              <Button variant="secondary" onClick={handleNewCollection}>
                <CollectionPlusIcon size={15} />
                New collection
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-10 flex flex-col gap-10">
            {childCollections.length > 0 && (
              <CardGrid heading="Collections">
                {childCollections.map((child) => (
                  <CollectionCoverCard
                    key={child.id}
                    child={child}
                    onOpen={setActiveCollection}
                    actions={collectionActions}
                  />
                ))}
              </CardGrid>
            )}
            {childBooks.length > 0 && (
              <CardGrid heading="Books">
                {childBooks.map((child) => (
                  <BookCoverCard
                    key={child.id}
                    child={child}
                    onOpen={setActiveBook}
                    actions={bookActions}
                  />
                ))}
              </CardGrid>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CardGrid({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
        {heading}
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

function CollectionCoverCard({
  child,
  onOpen,
  actions,
}: {
  child: Extract<TreeChild, { kind: "collection" }>;
  onOpen: (id: string) => void;
  actions: (id: string) => RowAction[];
}) {
  return (
    <CoverCard
      title={child.collection.name}
      icon={child.collection.icon}
      coverUrl={null}
      fallback={<CollectionIcon size={28} />}
      onOpen={() => {
        onOpen(child.id);
      }}
      actions={actions(child.id)}
    />
  );
}

function BookCoverCard({
  child,
  onOpen,
  actions,
}: {
  child: Extract<TreeChild, { kind: "book" }>;
  onOpen: (id: string) => void;
  actions: (id: string) => RowAction[];
}) {
  return (
    <CoverCard
      title={child.book.title}
      icon={child.book.icon}
      coverUrl={child.book.cover_url}
      fallback={<BookIcon size={28} />}
      onOpen={() => {
        onOpen(child.id);
      }}
      actions={actions(child.id)}
    />
  );
}
