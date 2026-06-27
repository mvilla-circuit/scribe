import type { Book } from "../../data/books";
import { useDocuments, useEnsureTitlePage } from "../../data/documents";
import { useUIStore } from "../../store/ui";
import { DocumentSkeleton } from "./DocumentSkeleton";
import { DocumentView } from "./DocumentView";
import { TitlePage } from "./TitlePage";

// The warm editorial reading surface. Navigation lives in the main sidebar's
// Outline (drilled in from the Library), so this is a single full-width column
// routed between the Title Page and a document.
export function BookView({ book }: { book: Book }) {
  useEnsureTitlePage(book.id);
  const documentsQuery = useDocuments(book.id);
  const documents = documentsQuery.data ?? [];

  const activeDocId = useUIStore((s) => s.activeDocId);
  const activeDoc = documents.find((d) => d.id === activeDocId) ?? null;

  // On a cold load with a persisted deep page, the documents haven't arrived
  // yet so we can't resolve `activeDoc`. Rather than flash the Title Page, show
  // a document skeleton until the query settles.
  if (documentsQuery.isLoading && activeDocId !== null) {
    return (
      <div className="h-full overflow-y-auto bg-bg">
        <DocumentSkeleton />
      </div>
    );
  }

  const showTitlePage = !activeDoc || activeDoc.is_title_page;

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div
        key={showTitlePage ? "title-page" : activeDoc.id}
        className="scribe-surface-in"
      >
        {showTitlePage ? (
          <TitlePage
            book={book}
            documents={documents}
            loading={documentsQuery.isLoading}
          />
        ) : (
          <DocumentView
            book={book}
            document={activeDoc}
            documents={documents}
          />
        )}
      </div>
    </div>
  );
}
