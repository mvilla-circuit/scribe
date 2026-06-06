import { getPositionBetween } from "../../data/ordering";
import { useRenameBook, useUpdateBook, type Book } from "../../data/books";
import {
  useCreateDocument,
  type Document,
} from "../../data/documents";
import { useUIStore } from "../../store/ui";
import { EditableText } from "./EditableText";
import { TableOfContents } from "./TableOfContents";

type TitlePageProps = {
  book: Book;
  documents: Document[];
  loading: boolean;
};

// The book's editable cover page: title + subtitle in editorial serif, hosting
// the auto Table of Contents. The freeform body becomes editable in Phase 4.
export function TitlePage({ book, documents, loading }: TitlePageProps) {
  const renameBook = useRenameBook();
  const updateBook = useUpdateBook();
  const createDocument = useCreateDocument(book.id);
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);

  const createFirstPage = () => {
    const id = crypto.randomUUID();
    const siblings = documents.filter(
      (d) => !d.is_title_page && d.parent_document_id === null
    );
    const last = siblings[siblings.length - 1];
    createDocument.mutate({
      id,
      title: "Untitled",
      parent_document_id: null,
      position: getPositionBetween(last?.position, undefined),
    });
    setActiveDoc(id);
  };

  return (
    <article className="mx-auto w-full max-w-[68ch] px-8 py-16 sm:py-24">
      <header>
        <EditableText
          value={book.title}
          ariaLabel="Book title"
          placeholder="Untitled"
          onCommit={(title) => renameBook.mutate({ id: book.id, title })}
          className="text-[2.75rem] font-semibold leading-tight tracking-tight text-text"
          style={{ fontFamily: "var(--font-serif)" }}
        />
        <EditableText
          value={book.subtitle ?? ""}
          ariaLabel="Book subtitle"
          placeholder="Add a subtitle"
          allowEmpty
          onCommit={(subtitle) =>
            updateBook.mutate({ id: book.id, subtitle: subtitle || null })
          }
          className="mt-3 text-xl leading-snug text-muted"
          style={{ fontFamily: "var(--font-serif)" }}
        />
      </header>

      <TableOfContents
        documents={documents}
        loading={loading}
        onCreateFirst={createFirstPage}
      />
    </article>
  );
}
