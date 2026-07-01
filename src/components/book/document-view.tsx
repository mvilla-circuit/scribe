import { useRef, useState } from "react";

import { SkeletonText } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import type { Book } from "@/data/books";
import {
  type DocumentMeta,
  useDocumentContent,
  useRenameDocument,
  useUpdateDocument,
  useUpdateDocumentContent,
  useUpdateDocumentFontOverrides,
} from "@/data/documents";
import { Editor, type EditorHandle } from "@/editor/lazy-editor";
import type { OutlineHeading } from "@/editor/outline";
import type { SaveState } from "@/editor/use-autosave";
import { useCascadedFonts } from "@/fonts/use-cascaded-fonts";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import { useUIStore } from "@/store/ui";

import { DocumentBreadcrumb } from "./document-breadcrumb";
import { EditableText, type EditableTextHandle } from "./editable-text";
import { EditorBridgeHost } from "./editor-bridge-host";
import { Masthead } from "./masthead";
import { PageBanner } from "./page-banner";
import { PageOutline } from "./page-outline";
import { PageSettingsToolbar } from "./page-settings-toolbar";

interface DocumentViewProps {
  book: Book;
  document: DocumentMeta;
  documents: DocumentMeta[];
}

// A single document page: breadcrumb trail, page settings (icon, subtitle and
// outline visibility), an always-editable serif title, and the TipTap editor.
export function DocumentView({ book, document, documents }: DocumentViewProps) {
  const renameDocument = useRenameDocument(book.id);
  const updateDocument = useUpdateDocument(book.id);
  const updateContent = useUpdateDocumentContent();
  const updateFontOverrides = useUpdateDocumentFontOverrides(book.id);
  const contentQuery = useDocumentContent(document.id);
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [headings, setHeadings] = useState<OutlineHeading[]>([]);

  const editorRef = useRef<EditorHandle>(null);
  const titleRef = useRef<EditableTextHandle>(null);
  const proseContainerRef = useRef<HTMLDivElement>(null);

  const showOutline = document.show_outline && headings.length > 0;

  // Fonts cascade global -> book -> page, resolved live so changes apply without
  // a reload. Title uses the Display role, body prose the Text role, code the
  // Code role; the resolved stacks are scoped onto this view via CSS variables.
  const {
    fontVars,
    overrides,
    inherited,
    handlers: pageFonts,
  } = useCascadedFonts({
    book,
    document,
    onChangeOverrides: (fonts) => {
      updateFontOverrides.mutate({ id: document.id, font_overrides: fonts });
    },
  });
  const titleFont = "var(--font-display)";
  const bodyFont = "var(--font-text)";

  const titleBlock = (
    <>
      <EditableText
        ref={titleRef}
        value={document.title}
        ariaLabel="Document title"
        placeholder="Untitled"
        onCommit={(title) => {
          renameDocument.mutate({ id: document.id, title });
        }}
        onEnter={() => editorRef.current?.focusStart()}
        className="text-[2.6rem] font-semibold leading-tight tracking-tight text-text"
        style={{ fontFamily: titleFont }}
      />

      {document.show_subtitle && (
        <EditableText
          value={document.subtitle ?? ""}
          ariaLabel="Document subtitle"
          placeholder="Add a subtitle"
          allowEmpty
          onCommit={(subtitle) => {
            updateDocument.mutate({
              id: document.id,
              subtitle: subtitle || null,
            });
          }}
          className="mt-2 font-sans text-xl leading-snug text-muted"
        />
      )}

      <PageMeta document={document} />
    </>
  );

  return (
    <div style={fontVars} className="flex min-h-full flex-col">
      <nav
        aria-label="Breadcrumb"
        data-tauri-drag-region
        className="sticky top-0 z-20 flex items-center gap-1 bg-bg px-8 py-3 text-sm text-muted"
      >
        <DocumentBreadcrumb
          book={book}
          document={document}
          documents={documents}
          onNavigate={setActiveDoc}
        />
        <PageSettingsToolbar
          document={document}
          saveState={saveState}
          fontOverrides={overrides}
          inheritedFonts={inherited}
          fontHandlers={pageFonts}
          onToggleOutline={() => {
            updateDocument.mutate({
              id: document.id,
              show_outline: !document.show_outline,
            });
          }}
          onToggleSubtitle={() => {
            updateDocument.mutate({
              id: document.id,
              show_subtitle: !document.show_subtitle,
            });
          }}
          onBannerChange={(bannerColor) => {
            updateDocument.mutate({
              id: document.id,
              banner_color: bannerColor,
              // Clear any caption when the banner is removed so a re-added
              // banner starts fresh instead of resurfacing old text.
              ...(bannerColor === null ? { banner_text: null } : {}),
            });
          }}
        />
      </nav>

      <PageBanner
        color={document.banner_color}
        text={document.banner_text}
        reserveOutline={showOutline}
        onCommitText={(bannerText) => {
          updateDocument.mutate({
            id: document.id,
            banner_text: bannerText || null,
          });
        }}
      />

      <div className="mx-auto flex w-full max-w-[1120px] justify-center gap-12 px-8 py-12 sm:py-16">
        <article className="w-full min-w-0 max-w-[68ch]">
          <Masthead
            icon={document.icon}
            onSelectIcon={(icon) => {
              updateDocument.mutate({ id: document.id, icon });
            }}
            onRemoveIcon={() => {
              updateDocument.mutate({ id: document.id, icon: null });
            }}
            changeIconLabel="Change page icon"
          >
            {titleBlock}
          </Masthead>

          <div
            ref={proseContainerRef}
            className="mt-8"
            style={{ fontFamily: bodyFont }}
          >
            {contentQuery.isSuccess ? (
              <EditorBridgeHost>
                <Editor
                  ref={editorRef}
                  key={document.id}
                  documentId={document.id}
                  initialContent={contentQuery.data}
                  editable
                  onOutlineChange={setHeadings}
                  onLeaveStart={() => {
                    titleRef.current?.focus();
                    return true;
                  }}
                  onPersist={(content) =>
                    updateContent.mutateAsync({ id: document.id, content })
                  }
                  onSaveStateChange={setSaveState}
                />
              </EditorBridgeHost>
            ) : (
              // The editor is keyed by document id and reads its body once at
              // mount, so hold it back until the content query resolves rather
              // than mounting it empty and never picking the body up.
              <div className="flex flex-col gap-6" aria-hidden>
                <SkeletonText lines={3} lineHeight="0.85rem" />
                <SkeletonText lines={4} lineHeight="0.85rem" />
              </div>
            )}
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

function PageMeta({ document }: { document: DocumentMeta }) {
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
