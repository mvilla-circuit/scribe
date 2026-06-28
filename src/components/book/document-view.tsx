import { useRef, useState } from "react";

import { Tooltip } from "@/components/ui/tooltip";
import type { Book } from "@/data/books";
import { bookFontOverrides } from "@/data/books";
import {
  docFontOverrides,
  type Document,
  useRenameDocument,
  useUpdateDocument,
  useUpdateDocumentContent,
  useUpdateDocumentFontOverrides,
} from "@/data/documents";
import { profileFonts, useProfile } from "@/data/profile";
import { Editor, type EditorHandle } from "@/editor/lazy-editor";
import type { OutlineHeading } from "@/editor/outline";
import type { SaveState } from "@/editor/use-autosave";
import { resolveFonts } from "@/fonts/resolve";
import { useFontOverrides } from "@/fonts/use-font-overrides";
import { useScopedFonts } from "@/fonts/use-scoped-fonts";
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
  document: Document;
  documents: Document[];
}

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
  const titleRef = useRef<EditableTextHandle>(null);
  const proseContainerRef = useRef<HTMLDivElement>(null);

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

  const pageFonts = useFontOverrides({
    overrides,
    collapseEmpty: true,
    onChange: (fonts) => {
      updateFontOverrides.mutate({ id: document.id, font_overrides: fonts });
    },
  });

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
          className="mt-2 text-xl leading-snug text-muted"
          style={{ fontFamily: bodyFont }}
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
          inheritedFonts={resolveFonts(globalFonts, bookOverrides)}
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
        bodyFont={bodyFont}
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
            <EditorBridgeHost>
              <Editor
                ref={editorRef}
                key={document.id}
                documentId={document.id}
                initialContent={document.content}
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
