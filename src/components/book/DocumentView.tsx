import { useMemo, useRef, useState } from "react";
import { useUIStore } from "../../store/ui";
import type { Book } from "../../data/books";
import {
  docFontOverrides,
  useRenameDocument,
  useUpdateDocument,
  useUpdateDocumentContent,
  useUpdateDocumentFontOverrides,
  type Document,
} from "../../data/documents";
import { bookFontOverrides } from "../../data/books";
import { profileFonts, useProfile } from "../../data/profile";
import { cn, formatDateTime, formatRelativeTime } from "../../lib/utils";
import { resolveFonts } from "../../fonts/resolve";
import { useScopedFonts } from "../../fonts/useScopedFonts";
import type { FontMap, FontRole } from "../../fonts/catalog";
import { EditableText } from "./EditableText";
import { FontControl } from "./FontControl";
import { PageOutline } from "./PageOutline";
import { IconPicker } from "../ui/IconPicker";
import { DocumentIcon } from "../ui/DocumentIcon";
import { ListIcon, SubtitleIcon } from "./icons";
import { Tooltip } from "../ui/Tooltip";
import { Editor, type EditorHandle } from "../../editor/Editor";
import { SaveStatus } from "../../editor/SaveStatus";
import type { SaveState } from "../../editor/useAutosave";
import type { OutlineHeading } from "../../editor/outline";

type DocumentViewProps = {
  book: Book;
  document: Document;
  documents: Document[];
};

// A single document page: breadcrumb trail, page settings (icon, subtitle and
// outline visibility), an always-editable serif title, and the TipTap editor.
export function DocumentView({ book, document, documents }: DocumentViewProps) {
  const renameDocument = useRenameDocument(book.id);
  const updateDocument = useUpdateDocument(book.id);
  const updateContent = useUpdateDocumentContent(book.id);
  const updateFontOverrides = useUpdateDocumentFontOverrides(book.id);
  const { data: profile } = useProfile();
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [headings, setHeadings] = useState<OutlineHeading[]>([]);

  const editorRef = useRef<EditorHandle>(null);
  const proseContainerRef = useRef<HTMLDivElement>(null);

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

  const showOutline = document.show_outline && headings.length > 0;

  // Fonts cascade global -> book -> page, resolved live so changes apply without
  // a reload. Title uses the Display role, body prose the Text role, code the
  // Code role; the resolved stacks are scoped onto this view via CSS variables.
  const globalFonts = profileFonts(profile);
  const bookOverrides = bookFontOverrides(book);
  const overrides = docFontOverrides(document);
  const resolved = resolveFonts(globalFonts, bookOverrides, overrides);
  const fontVars = useScopedFonts(resolved);
  const titleFont = "var(--font-display)";
  const bodyFont = "var(--font-text)";

  const writePageFonts = (fonts: FontMap | null) =>
    updateFontOverrides.mutate({ id: document.id, font_overrides: fonts });
  const setPageFont = (role: FontRole, fontId: string) =>
    writePageFonts({ ...overrides, [role]: fontId });
  const clearPageFont = (role: FontRole) => {
    const { [role]: _removed, ...rest } = overrides;
    writePageFonts(Object.keys(rest).length > 0 ? rest : null);
  };

  return (
    <div style={fontVars} className="flex min-h-full flex-col">
      <nav
        aria-label="Breadcrumb"
        data-tauri-drag-region
        className="sticky top-0 z-20 flex items-center gap-1 bg-bg px-8 py-3 text-sm text-muted"
      >
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
        <span className="ml-auto flex items-center gap-1 pl-3">
          <span className="mr-2">
            <SaveStatus state={saveState} />
          </span>
          <Tooltip content={document.show_outline ? "Hide outline" : "Show outline"}>
            <button
              type="button"
              onClick={() =>
                updateDocument.mutate({
                  id: document.id,
                  show_outline: !document.show_outline,
                })
              }
              aria-pressed={document.show_outline}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                document.show_outline
                  ? "bg-selected text-text"
                  : "text-muted hover:bg-hover hover:text-text"
              )}
            >
              <ListIcon size={16} />
            </button>
          </Tooltip>
          <Tooltip
            content={document.show_subtitle ? "Hide subtitle" : "Show subtitle"}
          >
            <button
              type="button"
              onClick={() =>
                updateDocument.mutate({
                  id: document.id,
                  show_subtitle: !document.show_subtitle,
                })
              }
              aria-pressed={document.show_subtitle}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                document.show_subtitle
                  ? "bg-selected text-text"
                  : "text-muted hover:bg-hover hover:text-text"
              )}
            >
              <SubtitleIcon size={16} />
            </button>
          </Tooltip>
          <FontControl
            heading="Page fonts"
            inheritLabel="book"
            overrides={overrides}
            inherited={resolveFonts(globalFonts, bookOverrides)}
            onSet={setPageFont}
            onClear={clearPageFont}
            onClearAll={() => writePageFonts(null)}
          />
        </span>
      </nav>

      <div className="mx-auto flex w-full max-w-[1120px] justify-center gap-12 px-8 py-12 sm:py-16">
        <article className="w-full min-w-0 max-w-[68ch]">
          <header className="group/page">
            <PageIconControl
              icon={document.icon}
              onSelect={(icon) => updateDocument.mutate({ id: document.id, icon })}
              onRemove={() => updateDocument.mutate({ id: document.id, icon: null })}
            />

            <EditableText
              value={document.title}
              ariaLabel="Document title"
              placeholder="Untitled"
              onCommit={(title) => renameDocument.mutate({ id: document.id, title })}
              className="text-4xl font-semibold leading-tight tracking-tight text-text"
              style={{ fontFamily: titleFont }}
            />

            {document.show_subtitle && (
              <EditableText
                value={document.subtitle ?? ""}
                ariaLabel="Document subtitle"
                placeholder="Add a subtitle"
                allowEmpty
                onCommit={(subtitle) =>
                  updateDocument.mutate({
                    id: document.id,
                    subtitle: subtitle || null,
                  })
                }
                className="mt-2 text-xl leading-snug text-muted"
                style={{ fontFamily: titleFont }}
              />
            )}

            <PageMeta document={document} />
          </header>

          <div
            ref={proseContainerRef}
            className="mt-8"
            style={{ fontFamily: bodyFont }}
          >
            <Editor
              ref={editorRef}
              key={document.id}
              documentId={document.id}
              initialContent={document.content}
              editable
              onOutlineChange={setHeadings}
              onPersist={(content) =>
                updateContent.mutateAsync({ id: document.id, content })
              }
              onSaveStateChange={setSaveState}
            />
          </div>
        </article>

        {showOutline && (
          <aside className="hidden w-52 shrink-0 md:block">
            <PageOutline
              headings={headings}
              containerRef={proseContainerRef}
              onSelect={(pos) => editorRef.current?.scrollToPos(pos)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

function PageIconControl({
  icon,
  onSelect,
  onRemove,
}: {
  icon: string | null;
  onSelect: (icon: string) => void;
  onRemove: () => void;
}) {
  if (icon) {
    return (
      <IconPicker value={icon} onSelect={onSelect} onRemove={onRemove}>
        <button
          type="button"
          aria-label="Change page icon"
          className="mb-3 rounded-md leading-none outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <DocumentIcon icon={icon} size={48} />
        </button>
      </IconPicker>
    );
  }

  return (
    <IconPicker value={icon} onSelect={onSelect} onRemove={onRemove}>
      <button
        type="button"
        className="mb-2 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-muted opacity-0 outline-none transition-opacity hover:bg-hover hover:text-text focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/page:opacity-100"
      >
        <span className="text-base leading-none">☺</span>
        Add icon
      </button>
    </IconPicker>
  );
}

function PageMeta({ document }: { document: Document }) {
  const updated = formatRelativeTime(document.updated_at);
  if (!updated) return null;
  return (
    <p className="mt-3 text-xs text-muted">
      <Tooltip content={`Created ${formatDateTime(document.created_at)}`}>
        <span className="cursor-default">Updated {updated}</span>
      </Tooltip>
    </p>
  );
}

function BreadcrumbSep() {
  return <span className="select-none text-muted/50">/</span>;
}
