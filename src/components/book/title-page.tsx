import { useMemo, useState } from "react";

import { SubtitleToggle } from "@/components/ui/subtitle-toggle";
import { Tooltip } from "@/components/ui/tooltip";
import {
  type Book,
  bookShowSubtitle,
  bookTheme,
  useRenameBook,
  useUpdateBook,
} from "@/data/books";
import { buildDocTree, expandableDocIds } from "@/data/doc-tree";
import { type DocumentMeta, useCreateDocument } from "@/data/documents";
import { endPositionFor } from "@/data/ordering";
import { useCascadedFonts } from "@/fonts/use-cascaded-fonts";
import { useUIStore } from "@/store/ui";

import { EditableText } from "./editable-text";
import { FontControl } from "./font-control";
import { ChevronsDownUpIcon, ChevronsUpDownIcon } from "./icons";
import { Masthead } from "./masthead";
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
  const createDocument = useCreateDocument(book.id);
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);

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
    const siblings = documents.filter(
      (d) => !d.is_title_page && d.parent_document_id === null,
    );
    createDocument.mutate({
      id,
      title: "Untitled",
      parent_document_id: null,
      position: endPositionFor(siblings),
    });
    setActiveDoc(id);
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
        className="sticky top-0 z-20 flex items-center bg-bg px-8 py-3"
      >
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
