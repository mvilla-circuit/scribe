import { useRef, useState } from "react";

import { LinkIcon } from "@/components/sidebar/icons";
import {
  EditableText,
  type EditableTextHandle,
} from "@/components/ui/editable-text";
import { IconButton } from "@/components/ui/icon-button";
import { Masthead } from "@/components/ui/masthead";
import { AddCoverButton, PageCover } from "@/components/ui/page-cover";
import { SkeletonText } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import type { Book } from "@/data/books";
import { deleteCoverObject, useUploadCover } from "@/data/cover-upload";
import {
  docSpellcheckIgnores,
  type DocumentMeta,
  useDocumentContent,
  useRenameDocument,
  useUpdateDocument,
  useUpdateDocumentContent,
  useUpdateDocumentFontOverrides,
} from "@/data/documents";
import {
  profileDictionary,
  useProfile,
  useUpdateProfileDictionary,
} from "@/data/profile";
import { copyPageLink } from "@/editor/copy-page-link";
import { Editor, type EditorHandle } from "@/editor/lazy-editor";
import type { OutlineHeading } from "@/editor/outline";
import type { SaveState } from "@/editor/use-autosave";
import { useCascadedFonts } from "@/fonts/use-cascaded-fonts";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import { useUIStore } from "@/store/ui";

import { DocumentBreadcrumb } from "./document-breadcrumb";
import { EditorBridgeHost } from "./editor-bridge-host";
import { NavHistoryControls } from "./nav-history-controls";
import { PageBanner } from "./page-banner";
import { PageOutline } from "./page-outline";
import { PageSettingsToolbar } from "./page-settings-toolbar";
import { TableOfContents } from "./table-of-contents";

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
  const uploadCover = useUploadCover();
  const updateContent = useUpdateDocumentContent();
  const updateFontOverrides = useUpdateDocumentFontOverrides(book.id);
  const contentQuery = useDocumentContent(document.id);
  const profileQuery = useProfile();
  const updateDictionary = useUpdateProfileDictionary();
  const dictionary = profileDictionary(profileQuery.data);
  // Hold the editor (and its spellcheck) until the account-wide dictionary has
  // settled, so a word the writer added isn't briefly flagged as a misspelling
  // before the profile query resolves. The profile is fetched app-wide (fonts),
  // so it's already cached on all but the very first page load; on error or when
  // signed out the query isn't loading, so this never blocks indefinitely.
  const dictionaryReady = !profileQuery.isLoading;
  const docIgnores = docSpellcheckIgnores(document);
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [headings, setHeadings] = useState<OutlineHeading[]>([]);

  const editorRef = useRef<EditorHandle>(null);
  const titleRef = useRef<EditableTextHandle>(null);
  const proseContainerRef = useRef<HTMLDivElement>(null);

  // Reserve the outline gutter from first paint on the stable page flag rather
  // than waiting for async headings, so the reading column keeps a constant
  // width and the auto-grown title isn't remeasured-then-clipped when the editor
  // reports its outline. `PageOutline` renders nothing until headings arrive, so
  // the reserved column simply starts empty.
  const reserveOutline = document.show_outline;

  // A parent page (one with child pages) can render its subtree as an inline
  // table of contents, mirroring the book cover.
  const hasChildren = documents.some(
    (d) => d.parent_document_id === document.id && !d.is_title_page,
  );
  const showContents = document.show_contents && hasChildren;

  // Contents expansion is local + session-scoped and opens collapsed, matching
  // the Title Page's Table of Contents.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleContentsRow = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const setCover = async (file: File) => {
    const previous = document.cover_url;
    const coverUrl = await uploadCover.mutateAsync(file);
    await updateDocument.mutateAsync({
      id: document.id,
      cover_url: coverUrl,
      banner_color: null,
      banner_text: null,
    });
    void deleteCoverObject(previous);
    return coverUrl;
  };

  const clearCover = () => {
    const previous = document.cover_url;
    updateDocument.mutate(
      { id: document.id, cover_url: null },
      {
        onSuccess: () => {
          void deleteCoverObject(previous);
        },
      },
    );
  };

  const titleBlock = (
    <>
      <div className="group/title relative">
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

        {/* Notion-style quiet affordance: hidden until the title is hovered or
            the button is focused, and inert at rest so it never intercepts
            clicks meant for the editable title. */}
        <IconButton
          label="Copy link to page"
          size="sm"
          onClick={() => {
            void copyPageLink("document", document.id);
          }}
          className="absolute right-0 top-1 h-8 w-8 opacity-0 transition-opacity pointer-events-none group-hover/title:pointer-events-auto group-hover/title:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 motion-reduce:transition-none"
        >
          <LinkIcon size={18} />
        </IconButton>
      </div>

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
        <NavHistoryControls />
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
          hasChildren={hasChildren}
          onToggleContents={() => {
            updateDocument.mutate({
              id: document.id,
              show_contents: !document.show_contents,
            });
          }}
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
          onToggleSpellcheck={() => {
            updateDocument.mutate({
              id: document.id,
              spellcheck_enabled: !document.spellcheck_enabled,
            });
          }}
          onBannerChange={(bannerColor) => {
            const previousCover = document.cover_url;
            updateDocument.mutate(
              {
                id: document.id,
                banner_color: bannerColor,
                ...(bannerColor !== null ? { cover_url: null } : {}),
                // Clear any caption when the banner is removed so a re-added
                // banner starts fresh instead of resurfacing old text.
                ...(bannerColor === null ? { banner_text: null } : {}),
              },
              {
                onSuccess: () => {
                  if (bannerColor !== null) {
                    void deleteCoverObject(previousCover);
                  }
                },
              },
            );
          }}
        />
      </nav>

      <PageCover
        coverUrl={document.cover_url}
        onUpload={setCover}
        onRemove={clearCover}
      />

      {!document.cover_url && (
        <PageBanner
          color={document.banner_color}
          text={document.banner_text}
          reserveOutline={reserveOutline}
          onCommitText={(bannerText) => {
            updateDocument.mutate({
              id: document.id,
              banner_text: bannerText || null,
            });
          }}
        />
      )}

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
            actions={
              document.cover_url ? undefined : (
                <AddCoverButton onUpload={setCover} />
              )
            }
          >
            {titleBlock}
          </Masthead>

          {showContents && (
            <TableOfContents
              documents={documents}
              loading={false}
              rootId={document.id}
              expandedIds={expandedIds}
              onToggle={toggleContentsRow}
            />
          )}

          <div
            ref={proseContainerRef}
            className="mt-8"
            style={{ fontFamily: bodyFont }}
          >
            {contentQuery.isSuccess && dictionaryReady ? (
              <EditorBridgeHost>
                <Editor
                  ref={editorRef}
                  key={document.id}
                  documentId={document.id}
                  initialContent={contentQuery.data}
                  editable
                  spellcheckEnabled={document.spellcheck_enabled}
                  docIgnores={docIgnores}
                  dictionary={dictionary}
                  onIgnoreWord={(word) => {
                    if (docIgnores.includes(word)) return;
                    updateDocument.mutate({
                      id: document.id,
                      spellcheck_ignores: [...docIgnores, word],
                    });
                  }}
                  onAddToDictionary={(word) => {
                    if (dictionary.includes(word)) return;
                    updateDictionary.mutate([...dictionary, word]);
                  }}
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
              // mount, so hold it back until the content query resolves (and the
              // dictionary has settled) rather than mounting it empty and never
              // picking the body up.
              <div className="flex flex-col gap-6" aria-hidden>
                <SkeletonText lines={3} lineHeight="0.85rem" />
                <SkeletonText lines={4} lineHeight="0.85rem" />
              </div>
            )}
          </div>
        </article>

        {reserveOutline && (
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
