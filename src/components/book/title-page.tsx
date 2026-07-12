import { useMemo, useState } from "react";

import { EditableText } from "@/components/ui/editable-text";
import { Masthead } from "@/components/ui/masthead";
import { AddCoverButton, PageCover } from "@/components/ui/page-cover";
import { SubtitleToggle } from "@/components/ui/subtitle-toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { outlinePositionSiblings } from "@/data/book-outline-tree";
import {
  type Book,
  bookShowSubtitle,
  bookTheme,
  useRenameBook,
  useUpdateBook,
} from "@/data/books";
import { useCollections } from "@/data/collections";
import { deleteCoverObject, useUploadCover } from "@/data/cover-upload";
import { buildDocTree, expandableDocIds } from "@/data/doc-tree";
import { type DocumentMeta, useCreateDocument } from "@/data/documents";
import { endPositionFor } from "@/data/ordering";
import { collectionAncestors } from "@/data/tree";
import { useWhiteboards } from "@/data/whiteboards";
import { useCascadedFonts } from "@/fonts/use-cascaded-fonts";
import { useUIStore } from "@/store/ui";

import { FontControl } from "./font-control";
import { ChevronsDownUpIcon, ChevronsUpDownIcon } from "./icons";
import { NavHistoryControls } from "./nav-history-controls";
import { TableOfContents } from "./table-of-contents";

interface TitlePageProps {
  book: Book;
  documents: DocumentMeta[];
  loading: boolean;
}

// The book's editable cover page: title + subtitle in editorial serif, hosting
// the auto Table of Contents. The freeform body becomes editable in Phase 4.
export function TitlePage({ book, documents, loading }: TitlePageProps) {
  const renameBook = useRenameBook();
  const updateBook = useUpdateBook();
  const uploadCover = useUploadCover();
  const createDocument = useCreateDocument(book.id);
  const whiteboardsQuery = useWhiteboards();
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);
  const setActiveCollection = useUIStore((s) => s.setActiveCollection);

  // When the book lives in a collection, surface the full collection chain
  // (ancestors + the immediate parent) as a clickable breadcrumb so the reader
  // can climb back out to where the book is filed.
  const collectionsQuery = useCollections();
  const collectionCrumbs = useMemo(() => {
    const collections = collectionsQuery.data ?? [];
    if (!book.collection_id) return [];
    const parent = collections.find((c) => c.id === book.collection_id);
    if (!parent) return [];
    return [...collectionAncestors(collections, parent.id), parent];
  }, [collectionsQuery.data, book.collection_id]);

  // Fonts cascade global -> book; the Title Page has no page-level layer.
  const {
    fontVars,
    overrides: bookOverrides,
    inherited,
    handlers: bookFonts,
  } = useCascadedFonts({
    book,
    onChangeOverrides: (fonts) => {
      updateBook.mutate({
        id: book.id,
        theme: { ...bookTheme(book), fonts: fonts ?? {} },
      });
    },
  });
  const titleFont = "var(--font-display)";

  const showSubtitle = bookShowSubtitle(book);
  const toggleSubtitle = () => {
    updateBook.mutate({
      id: book.id,
      theme: { ...bookTheme(book), showSubtitle: !showSubtitle },
    });
  };

  // Contents expansion is local + session-scoped: the cover always opens
  // collapsed (only first-level pages visible). State lives here so the
  // page-level toolbar can drive "expand/collapse all" alongside per-row toggles
  // in the Table of Contents.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const expandable = useMemo(
    () => expandableDocIds(buildDocTree(documents)),
    [documents],
  );
  const allExpanded =
    expandable.length > 0 && expandable.every((id) => expandedIds.has(id));

  const toggleDoc = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setExpandedIds(allExpanded ? new Set() : new Set(expandable));
  };

  const createFirstPage = () => {
    const id = crypto.randomUUID();
    const bookWhiteboards = (whiteboardsQuery.data ?? []).filter(
      (whiteboard) => whiteboard.book_id === book.id,
    );
    createDocument.mutate({
      id,
      title: "Untitled",
      parent_document_id: null,
      position: endPositionFor(
        outlinePositionSiblings(documents, bookWhiteboards, null),
      ),
    });
    setActiveDoc(id);
  };

  const setCover = async (file: File) => {
    const previous = book.cover_url;
    const coverUrl = await uploadCover.mutateAsync(file);
    await updateBook.mutateAsync({ id: book.id, cover_url: coverUrl });
    void deleteCoverObject(previous);
    return coverUrl;
  };

  const clearCover = () => {
    const previous = book.cover_url;
    updateBook.mutate(
      { id: book.id, cover_url: null },
      {
        onSuccess: () => {
          void deleteCoverObject(previous);
        },
      },
    );
  };

  const titleBlock = (
    <>
      <EditableText
        value={book.title}
        ariaLabel="Book title"
        placeholder="Untitled"
        onCommit={(title) => {
          renameBook.mutate({ id: book.id, title });
        }}
        className="text-[2.75rem] font-semibold leading-tight tracking-tight text-text"
        style={{ fontFamily: titleFont }}
      />
      {showSubtitle && (
        <EditableText
          value={book.subtitle ?? ""}
          ariaLabel="Book subtitle"
          placeholder="Add a subtitle"
          allowEmpty
          onCommit={(subtitle) => {
            updateBook.mutate({ id: book.id, subtitle: subtitle || null });
          }}
          className="mt-3 text-xl leading-snug text-muted"
          style={{ fontFamily: "var(--font-text)" }}
        />
      )}
    </>
  );

  return (
    <div style={fontVars} className="flex min-h-full flex-col">
      {/* The title page has no breadcrumb, but mirrors the document view's sticky
          top bar so its settings sit flush with the top edge and the title-bar
          zone stays draggable. */}
      <nav
        aria-label="Book settings"
        data-tauri-drag-region
        className="sticky top-0 z-20 flex items-center gap-3 bg-bg px-8 py-3"
      >
        <NavHistoryControls />
        {collectionCrumbs.length > 0 && (
          <div
            aria-label="Breadcrumb"
            className="flex min-w-0 flex-1 items-center gap-1 text-sm text-muted"
          >
            {collectionCrumbs.map((crumb) => (
              <span key={crumb.id} className="flex min-w-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCollection(crumb.id);
                  }}
                  className="min-w-0 shrink truncate rounded-sm px-1 outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {crumb.name || "Untitled"}
                </button>
                <span className="shrink-0 select-none text-muted/50">/</span>
              </span>
            ))}
            <span className="min-w-0 shrink truncate px-1 text-text">
              {book.title || "Untitled"}
            </span>
          </div>
        )}
        <span className="ml-auto flex items-center gap-1">
          {expandable.length > 0 && (
            <Tooltip content={allExpanded ? "Collapse all" : "Expand all"}>
              <button
                type="button"
                onClick={toggleAll}
                aria-pressed={allExpanded}
                aria-label={allExpanded ? "Collapse all" : "Expand all"}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted outline-none transition-colors hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
              >
                {allExpanded ? (
                  <ChevronsDownUpIcon size={16} />
                ) : (
                  <ChevronsUpDownIcon size={16} />
                )}
              </button>
            </Tooltip>
          )}
          <SubtitleToggle active={showSubtitle} onToggle={toggleSubtitle} />
          <FontControl
            heading="Book fonts"
            inheritLabel="global"
            overrides={bookOverrides}
            inherited={inherited}
            onSet={bookFonts.setFont}
            onClear={bookFonts.clearFont}
            onClearAll={bookFonts.clearAll}
          />
        </span>
      </nav>

      <PageCover
        coverUrl={book.cover_url}
        onUpload={setCover}
        onRemove={clearCover}
      />

      <article className="mx-auto w-full max-w-[68ch] px-8 pb-16 pt-8 sm:pb-24 sm:pt-12">
        <Masthead
          icon={book.icon}
          onSelectIcon={(icon) => {
            updateBook.mutate({ id: book.id, icon });
          }}
          onRemoveIcon={() => {
            updateBook.mutate({ id: book.id, icon: null });
          }}
          changeIconLabel="Change book icon"
          actions={
            book.cover_url ? undefined : <AddCoverButton onUpload={setCover} />
          }
        >
          {titleBlock}
        </Masthead>

        <TableOfContents
          documents={documents}
          loading={loading}
          onCreateFirst={createFirstPage}
          titleFont={titleFont}
          expandedIds={expandedIds}
          onToggle={toggleDoc}
        />
      </article>
    </div>
  );
}
