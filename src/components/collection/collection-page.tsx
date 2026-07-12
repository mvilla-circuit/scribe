import { useMemo, useState } from "react";

import { EditableText } from "@/components/book/editable-text";
import { PageIcon } from "@/components/book/icons";
import { Masthead } from "@/components/book/masthead";
import { NavHistoryControls } from "@/components/book/nav-history-controls";
import {
  BookIcon,
  BookPlusIcon,
  CollectionIcon,
  CollectionPlusIcon,
  DatagridIcon,
  PlusIcon,
  RemoveFromCollectionIcon,
  TrashIcon,
  WhiteboardIcon,
} from "@/components/sidebar/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddCoverButton, PageCover } from "@/components/ui/page-cover";
import { type RowAction } from "@/components/ui/row-action-menu";
import { useBooks, useCreateBook, useMoveBook } from "@/data/books";
import {
  parseCollectionView,
  serializeCollectionView,
} from "@/data/collection-view";
import {
  useCollections,
  useCreateCollection,
  useMoveCollection,
  useRenameCollection,
  useUpdateCollection,
} from "@/data/collections";
import { deleteCoverObject, useUploadCover } from "@/data/cover-upload";
import { useCreateDatagrid, useDatagrids } from "@/data/datagrids";
import { useCreateEntry, useDeleteEntry, useEntries } from "@/data/entries";
import { useFolders } from "@/data/folders";
import { endPositionFor } from "@/data/ordering";
import {
  tagsForCollection,
  useCollectionTaggables,
  useTags,
} from "@/data/tags";
import { buildTree, childrenOf, collectionAncestors, ROOT } from "@/data/tree";
import {
  useCreateWhiteboard,
  useDeleteWhiteboard,
  useWhiteboards,
} from "@/data/whiteboards";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";

import {
  filterGalleryChildren,
  type GalleryChild,
  galleryChildMeta,
  galleryCoverAspect,
  isGalleryChild,
  sortGalleryChildren,
} from "./collection-gallery";
import { CollectionListRow } from "./collection-list-row";
import { CollectionTagsSection } from "./collection-tags-section";
import { CollectionToolbar } from "./collection-toolbar";
import { CoverCard } from "./cover-card";
import { type GalleryTag } from "./tag-chips-row";

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
  const entriesQuery = useEntries();
  const datagridsQuery = useDatagrids();
  const whiteboardsQuery = useWhiteboards();
  const tagsQuery = useTags();
  const taggablesQuery = useCollectionTaggables();

  const collections = useMemo(
    () => collectionsQuery.data ?? [],
    [collectionsQuery.data],
  );
  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
  const datagrids = useMemo(
    () => datagridsQuery.data ?? [],
    [datagridsQuery.data],
  );
  const whiteboards = useMemo(
    () => whiteboardsQuery.data ?? [],
    [whiteboardsQuery.data],
  );
  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);
  const taggables = useMemo(
    () => taggablesQuery.data ?? [],
    [taggablesQuery.data],
  );

  const collection = collections.find((c) => c.id === collectionId) ?? null;

  const model = useMemo(
    () =>
      buildTree(folders, books, collections, entries, datagrids, whiteboards),
    [folders, books, collections, entries, datagrids, whiteboards],
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
  const setActiveEntry = useUIStore((s) => s.setActiveEntry);
  const setActiveDatagrid = useUIStore((s) => s.setActiveDatagrid);
  const setActiveWhiteboard = useUIStore((s) => s.setActiveWhiteboard);
  const setFolderExpanded = useUIStore((s) => s.setFolderExpanded);

  const renameCollection = useRenameCollection();
  const updateCollection = useUpdateCollection();
  const createBook = useCreateBook();
  const createCollection = useCreateCollection();
  const moveBook = useMoveBook();
  const moveCollection = useMoveCollection();
  const createEntry = useCreateEntry();
  const deleteEntry = useDeleteEntry();
  const createDatagrid = useCreateDatagrid();
  const createWhiteboard = useCreateWhiteboard();
  const deleteWhiteboard = useDeleteWhiteboard();
  const uploadCover = useUploadCover();
  const [query, setQuery] = useState("");

  const view = parseCollectionView(collection?.view);
  const visibleChildren = useMemo(
    () => sortGalleryChildren(filterGalleryChildren(children, query)),
    [children, query],
  );
  const childCollections = visibleChildren.filter(
    (c) => c.kind === "collection",
  );
  const childBooks = visibleChildren.filter((c) => c.kind === "book");
  const childEntries = visibleChildren.filter((c) => c.kind === "entry");
  const childDatagrids = visibleChildren.filter((c) => c.kind === "datagrid");
  const childWhiteboards = visibleChildren.filter(
    (c) => c.kind === "whiteboard",
  );

  const rootPosition = () => endPositionFor(childrenOf(model, ROOT));

  const setCover = async (file: File) => {
    const previous = collection?.cover_url ?? null;
    const coverUrl = await uploadCover.mutateAsync(file);
    await updateCollection.mutateAsync({
      id: collectionId,
      cover_url: coverUrl,
    });
    void deleteCoverObject(previous);
    return coverUrl;
  };

  const clearCover = () => {
    const previous = collection?.cover_url ?? null;
    updateCollection.mutate(
      { id: collectionId, cover_url: null },
      {
        onSuccess: () => {
          void deleteCoverObject(previous);
        },
      },
    );
  };

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

  const handleNewEntry = () => {
    const id = crypto.randomUUID();
    createEntry.mutate({
      id,
      title: "Untitled",
      collection_id: collectionId,
      position: endPositionFor(children),
    });
    setFolderExpanded(collectionId, true);
    setActiveEntry(id, collectionId);
  };

  const handleNewDatagrid = () => {
    const id = crypto.randomUUID();
    createDatagrid.mutate({
      id,
      collection_id: collectionId,
      name: "Untitled",
      position: endPositionFor(children),
      viewId: crypto.randomUUID(),
    });
    setFolderExpanded(collectionId, true);
    setActiveDatagrid(id);
  };

  const handleNewWhiteboard = () => {
    const id = crypto.randomUUID();
    createWhiteboard.mutate({
      id,
      collection_id: collectionId,
      name: "Untitled",
      position: endPositionFor(children),
    });
    setFolderExpanded(collectionId, true);
    setActiveWhiteboard(id);
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

  const entryActions = (id: string): RowAction[] => [
    {
      icon: <TrashIcon size={15} />,
      label: "Delete",
      danger: true,
      onSelect: () => {
        deleteEntry.mutate({ id });
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
  const galleryChildren = visibleChildren.filter(isGalleryChild);
  const showSections = view.layout === "grid" && query === "";

  const openChild = (child: GalleryChild) => {
    switch (child.kind) {
      case "collection":
        setActiveCollection(child.id);
        break;
      case "book":
        setActiveBook(child.id);
        break;
      case "entry":
        setActiveEntry(child.id, collectionId);
        break;
      case "datagrid":
        setActiveDatagrid(child.id);
        break;
      case "whiteboard":
        setActiveWhiteboard(child.id);
        break;
    }
  };

  // Only collections carry tags today; other gallery kinds simply have no
  // tags prop passed, regardless of what the taggables cache holds.
  const tagsFor = (child: GalleryChild): GalleryTag[] | undefined =>
    child.kind === "collection"
      ? tagsForCollection(tags, taggables, child.id)
      : undefined;

  const actionsFor = (child: GalleryChild): RowAction[] => {
    switch (child.kind) {
      case "collection":
        return collectionActions(child.id);
      case "book":
        return bookActions(child.id);
      case "entry":
        return entryActions(child.id);
      case "datagrid":
        // Track D wires datagrid row actions; none in the gallery yet.
        return [];
      case "whiteboard":
        return [
          {
            icon: <TrashIcon size={15} />,
            label: "Delete",
            danger: true,
            onSelect: () => {
              deleteWhiteboard.mutate({ id: child.id });
            },
          },
        ];
    }
  };

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
        <span className="ml-auto flex shrink-0 items-center justify-end">
          <CollectionCreateSplitButton
            onNewBook={handleNewBook}
            onNewDoc={handleNewEntry}
            onNewCollection={handleNewCollection}
            onNewDatagrid={handleNewDatagrid}
            onNewWhiteboard={handleNewWhiteboard}
          />
        </span>
      </nav>

      <PageCover
        coverUrl={collection.cover_url}
        onUpload={setCover}
        onRemove={clearCover}
      />

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
          actions={
            collection.cover_url ? undefined : (
              <AddCoverButton onUpload={setCover} />
            )
          }
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
          <CollectionTagsSection collectionId={collection.id} />
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
              Add a doc to start writing, or gather books and nested collections
              here.
            </p>
            <div className="mt-4 flex justify-center">
              <CollectionCreateSplitButton
                onNewBook={handleNewBook}
                onNewDoc={handleNewEntry}
                onNewCollection={handleNewCollection}
                onNewDatagrid={handleNewDatagrid}
                onNewWhiteboard={handleNewWhiteboard}
              />
            </div>
          </div>
        ) : (
          <div className="mt-10 flex flex-col gap-10">
            <CollectionToolbar
              query={query}
              layout={view.layout}
              onQueryChange={setQuery}
              onLayoutChange={(layout) => {
                const next = serializeCollectionView({ ...view, layout });
                updateCollection.mutate({
                  id: collection.id,
                  view: { layout: next.layout },
                });
              }}
            />
            {galleryChildren.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">No matches</p>
            ) : view.layout === "list" ? (
              <div className="flex flex-col gap-1.5">
                {galleryChildren.map((child) => (
                  <CollectionListRow
                    key={child.id}
                    child={child}
                    onOpen={() => {
                      openChild(child);
                    }}
                    actions={actionsFor(child)}
                    tags={tagsFor(child)}
                  />
                ))}
              </div>
            ) : showSections ? (
              <>
                {childCollections.length > 0 && (
                  <CardGrid heading="Collections">
                    {childCollections.map((child) => (
                      <GalleryCoverCard
                        key={child.id}
                        child={child}
                        onOpen={() => {
                          openChild(child);
                        }}
                        actions={actionsFor(child)}
                        tags={tagsFor(child)}
                      />
                    ))}
                  </CardGrid>
                )}
                {childBooks.length > 0 && (
                  <CardGrid heading="Books">
                    {childBooks.map((child) => (
                      <GalleryCoverCard
                        key={child.id}
                        child={child}
                        onOpen={() => {
                          openChild(child);
                        }}
                        actions={actionsFor(child)}
                        tags={tagsFor(child)}
                      />
                    ))}
                  </CardGrid>
                )}
                {childEntries.length > 0 && (
                  <CardGrid heading="Docs">
                    {childEntries.map((child) => (
                      <GalleryCoverCard
                        key={child.id}
                        child={child}
                        onOpen={() => {
                          openChild(child);
                        }}
                        actions={actionsFor(child)}
                        tags={tagsFor(child)}
                      />
                    ))}
                  </CardGrid>
                )}
                {childDatagrids.length > 0 && (
                  <CardGrid heading="Datagrids">
                    {childDatagrids.map((child) => (
                      <GalleryCoverCard
                        key={child.id}
                        child={child}
                        onOpen={() => {
                          openChild(child);
                        }}
                        actions={actionsFor(child)}
                        tags={tagsFor(child)}
                      />
                    ))}
                  </CardGrid>
                )}
                {childWhiteboards.length > 0 && (
                  <CardGrid heading="Whiteboards">
                    {childWhiteboards.map((child) => (
                      <GalleryCoverCard
                        key={child.id}
                        child={child}
                        onOpen={() => {
                          openChild(child);
                        }}
                        actions={actionsFor(child)}
                        tags={tagsFor(child)}
                      />
                    ))}
                  </CardGrid>
                )}
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {galleryChildren.map((child) => (
                  <GalleryCoverCard
                    key={child.id}
                    child={child}
                    onOpen={() => {
                      openChild(child);
                    }}
                    actions={actionsFor(child)}
                    tags={tagsFor(child)}
                  />
                ))}
              </div>
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

function galleryFallback(child: GalleryChild) {
  switch (child.kind) {
    case "collection":
      return <CollectionIcon size={28} />;
    case "book":
      return <BookIcon size={28} />;
    case "entry":
      return <PageIcon size={28} />;
    case "datagrid":
      return <DatagridIcon size={28} />;
    case "whiteboard":
      return <WhiteboardIcon size={28} />;
  }
}

function GalleryCoverCard({
  child,
  onOpen,
  actions,
  tags,
}: {
  child: GalleryChild;
  onOpen: () => void;
  actions: RowAction[];
  tags?: GalleryTag[];
}) {
  const { title, subtitle, icon, coverUrl } = galleryChildMeta(child);
  return (
    <CoverCard
      title={title}
      subtitle={subtitle}
      icon={icon}
      coverUrl={coverUrl}
      fallback={galleryFallback(child)}
      onOpen={onOpen}
      actions={actions}
      aspect={galleryCoverAspect(child)}
      tags={tags}
    />
  );
}

/**
 * Segmented primary create control: the main face creates a book; the attached
 * "+" opens a menu for the quieter options (doc, nested collection) so the
 * toolbar stays one calm control instead of three equal CTAs.
 */
function CollectionCreateSplitButton({
  onNewBook,
  onNewDoc,
  onNewCollection,
  onNewDatagrid,
  onNewWhiteboard,
}: {
  onNewBook: () => void;
  onNewDoc: () => void;
  onNewCollection: () => void;
  onNewDatagrid: () => void;
  onNewWhiteboard: () => void;
}) {
  const segment =
    "inline-flex items-center justify-center gap-1.5 text-sm font-medium " +
    "outline-none focus-visible:z-10 focus-visible:ring-2 " +
    "focus-visible:ring-inset focus-visible:ring-ring";

  return (
    <div className="inline-flex overflow-hidden rounded-md bg-accent text-white transition-opacity hover:opacity-90">
      <button
        type="button"
        onClick={onNewBook}
        className={cn(segment, "px-3 py-1.5")}
      >
        <BookPlusIcon size={15} />
        New book
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More create options"
            className={cn(segment, "border-l border-white/25 px-2 py-1.5")}
          >
            <PlusIcon size={15} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onNewDoc}>
            <PageIcon size={15} />
            New doc
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onNewCollection}>
            <CollectionPlusIcon size={15} />
            New collection
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onNewDatagrid}>
            <DatagridIcon size={15} />
            New datagrid
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onNewWhiteboard}>
            <WhiteboardIcon size={15} />
            New whiteboard
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
