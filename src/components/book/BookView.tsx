import { useUIStore } from "../../store/ui";
import type { Book } from "../../data/books";
import { useDocuments, useEnsureTitlePage } from "../../data/documents";
import { TitlePage } from "./TitlePage";
import { DocumentView } from "./DocumentView";

// The warm editorial reading surface. Navigation lives in the main sidebar's
// Outline (drilled in from the Library), so this is a single full-width column
// routed between the Title Page and a document.
export function BookView({ book }: { book: Book }) {
  useEnsureTitlePage(book.id);
  const documentsQuery = useDocuments(book.id);
  const documents = documentsQuery.data ?? [];

  const activeDocId = useUIStore((s) => s.activeDocId);
  const activeDoc = documents.find((d) => d.id === activeDocId) ?? null;
  const showTitlePage = !activeDoc || activeDoc.is_title_page;

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div
        key={showTitlePage ? "title-page" : activeDoc.id}
        className="scribe-surface-in"
      >
        {showTitlePage ? (
          <>
            {/* The title page has no breadcrumb bar, so this invisible strip
                keeps the window draggable from its title-bar zone. */}
            <div data-tauri-drag-region className="sticky top-0 z-20 h-8 bg-bg" />
            <TitlePage
              book={book}
              documents={documents}
              loading={documentsQuery.isLoading}
            />
          </>
        ) : (
          <DocumentView book={book} document={activeDoc} documents={documents} />
        )}
      </div>
    </div>
  );
}
