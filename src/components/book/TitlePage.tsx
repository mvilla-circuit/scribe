import { getPositionBetween } from "../../data/ordering";
import {
  bookFontOverrides,
  bookTheme,
  useRenameBook,
  useUpdateBook,
  type Book,
} from "../../data/books";
import {
  useCreateDocument,
  type Document,
} from "../../data/documents";
import { profileFonts, useProfile } from "../../data/profile";
import { useUIStore } from "../../store/ui";
import { resolveFonts } from "../../fonts/resolve";
import { useScopedFonts } from "../../fonts/useScopedFonts";
import type { FontMap, FontRole } from "../../fonts/catalog";
import { EditableText } from "./EditableText";
import { FontControl } from "./FontControl";
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
  const { data: profile } = useProfile();

  // Fonts cascade global -> book; the Title Page has no page-level layer.
  const globalFonts = profileFonts(profile);
  const bookOverrides = bookFontOverrides(book);
  const resolved = resolveFonts(globalFonts, bookOverrides);
  const fontVars = useScopedFonts(resolved);
  const titleFont = "var(--font-display)";

  const writeBookFonts = (fonts: FontMap) =>
    updateBook.mutate({ id: book.id, theme: { ...bookTheme(book), fonts } });
  const setBookFont = (role: FontRole, fontId: string) =>
    writeBookFonts({ ...bookOverrides, [role]: fontId });
  const clearBookFont = (role: FontRole) => {
    const { [role]: _removed, ...rest } = bookOverrides;
    writeBookFonts(rest);
  };

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
    <article
      style={fontVars}
      className="group/title relative mx-auto w-full max-w-[68ch] px-8 py-16 sm:py-24"
    >
      <div className="absolute right-6 top-5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/title:opacity-100">
        <FontControl
          heading="Book fonts"
          inheritLabel="global"
          overrides={bookOverrides}
          inherited={resolveFonts(globalFonts)}
          onSet={setBookFont}
          onClear={clearBookFont}
          onClearAll={() => writeBookFonts({})}
        />
      </div>
      <header>
        <EditableText
          value={book.title}
          ariaLabel="Book title"
          placeholder="Untitled"
          onCommit={(title) => renameBook.mutate({ id: book.id, title })}
          className="text-[2.75rem] font-semibold leading-tight tracking-tight text-text"
          style={{ fontFamily: titleFont }}
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
          style={{ fontFamily: titleFont }}
        />
      </header>

      <TableOfContents
        documents={documents}
        loading={loading}
        onCreateFirst={createFirstPage}
        titleFont={titleFont}
      />
    </article>
  );
}
