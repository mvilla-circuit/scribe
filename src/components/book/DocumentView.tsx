import { useMemo, useState } from "react";
import { useUIStore } from "../../store/ui";
import type { Book } from "../../data/books";
import {
  useRenameDocument,
  useUpdateDocumentContent,
  type Document,
} from "../../data/documents";
import { EditableText } from "./EditableText";
import { Editor } from "../../editor/Editor";
import { SaveStatus } from "../../editor/SaveStatus";
import type { SaveState } from "../../editor/useAutosave";

type DocumentViewProps = {
  book: Book;
  document: Document;
  documents: Document[];
};

// A single document page: breadcrumb trail, an editable serif title, and a body
// region reserved for the Phase 4 TipTap editor.
export function DocumentView({ book, document, documents }: DocumentViewProps) {
  const renameDocument = useRenameDocument(book.id);
  const updateContent = useUpdateDocumentContent(book.id);
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const ancestors = useMemo(() => {
    const byId = new Map(documents.map((d) => [d.id, d]));
    const chain: Document[] = [];
    let parentId = document.parent_document_id;
    const guard = new Set<string>();
    while (parentId && !guard.has(parentId)) {
      guard.add(parentId);
      const parent = byId.get(parentId);
      if (!parent || parent.is_title_page) break;
      chain.unshift(parent);
      parentId = parent.parent_document_id;
    }
    return chain;
  }, [documents, document]);

  return (
    <article className="mx-auto w-full max-w-[68ch] px-8 py-12 sm:py-16">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <button
          type="button"
          onClick={() => setActiveDoc(null)}
          className="rounded-sm px-1 outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
        >
          {book.title}
        </button>
        {ancestors.map((parent) => (
          <span key={parent.id} className="flex items-center gap-1">
            <BreadcrumbSep />
            <button
              type="button"
              onClick={() => setActiveDoc(parent.id)}
              className="max-w-[16ch] truncate rounded-sm px-1 outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
            >
              {parent.title || "Untitled"}
            </button>
          </span>
        ))}
        <BreadcrumbSep />
        <span className="max-w-[20ch] truncate px-1 text-text">
          {document.title || "Untitled"}
        </span>
        <span className="ml-auto pl-3">
          <SaveStatus state={saveState} />
        </span>
      </nav>

      <EditableText
        value={document.title}
        ariaLabel="Document title"
        placeholder="Untitled"
        onCommit={(title) => renameDocument.mutate({ id: document.id, title })}
        className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-text"
        style={{ fontFamily: "var(--font-serif)" }}
      />

      <div className="mt-8">
        <Editor
          key={document.id}
          documentId={document.id}
          initialContent={document.content}
          onPersist={(content) =>
            updateContent.mutateAsync({ id: document.id, content })
          }
          onSaveStateChange={setSaveState}
        />
      </div>
    </article>
  );
}

function BreadcrumbSep() {
  return <span className="select-none text-muted/50">/</span>;
}
