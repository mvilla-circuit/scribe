import { useMemo, useRef, useState } from "react";

import { BannerControl } from "@/components/ui/banner-control";
import { SubtitleToggle } from "@/components/ui/subtitle-toggle";
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
import { Editor, type EditorHandle } from "@/editor/editor";
import type { OutlineHeading } from "@/editor/outline";
import { SaveStatus } from "@/editor/save-status";
import type { SaveState } from "@/editor/use-autosave";
import type { FontMap, FontRole } from "@/fonts/catalog";
import { resolveFonts } from "@/fonts/resolve";
import { useScopedFonts } from "@/fonts/use-scoped-fonts";
import { cn, formatDateTime, formatRelativeTime } from "@/lib/utils";
import { useUIStore } from "@/store/ui";

import { EditableText, type EditableTextHandle } from "./editable-text";
import { EditorBridgeHost } from "./editor-bridge-host";
import { FontControl } from "./font-control";
import { ListIcon } from "./icons";
import { Masthead } from "./masthead";
import { PageOutline } from "./page-outline";

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

  const writePageFonts = (fonts: FontMap | null) => {
    updateFontOverrides.mutate({ id: document.id, font_overrides: fonts });
  };
  const setPageFont = (role: FontRole, fontId: string) => {
    writePageFonts({ ...overrides, [role]: fontId });
  };
  const clearPageFont = (role: FontRole) => {
    const { [role]: _removed, ...rest } = overrides;
    writePageFonts(Object.keys(rest).length > 0 ? rest : null);
  };

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
        <button
          type="button"
          onClick={() => {
            setActiveDoc(null);
          }}
          className="rounded-sm px-1 outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
        >
          {book.title}
        </button>
        {ancestors.map((parent) => (
          <span key={parent.id} className="flex items-center gap-1">
            <BreadcrumbSep />
            <button
              type="button"
              onClick={() => {
                setActiveDoc(parent.id);
              }}
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
          <Tooltip
            content={document.show_outline ? "Hide outline" : "Show outline"}
          >
            <button
              type="button"
              onClick={() => {
                updateDocument.mutate({
                  id: document.id,
                  show_outline: !document.show_outline,
                });
              }}
              aria-pressed={document.show_outline}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                document.show_outline
                  ? "bg-selected text-text"
                  : "text-muted hover:bg-hover hover:text-text",
              )}
            >
              <ListIcon size={16} />
            </button>
          </Tooltip>
          <SubtitleToggle
            active={document.show_subtitle}
            onToggle={() => {
              updateDocument.mutate({
                id: document.id,
                show_subtitle: !document.show_subtitle,
              });
            }}
          />
          <BannerControl
            value={document.banner_color}
            onChange={(bannerColor) => {
              updateDocument.mutate({
                id: document.id,
                banner_color: bannerColor,
                // Clear any caption when the banner is removed so a re-added
                // banner starts fresh instead of resurfacing old text.
                ...(bannerColor === null ? { banner_text: null } : {}),
              });
            }}
          />
          <FontControl
            heading="Page fonts"
            inheritLabel="book"
            overrides={overrides}
            inherited={resolveFonts(globalFonts, bookOverrides)}
            onSet={setPageFont}
            onClear={clearPageFont}
            onClearAll={() => {
              writePageFonts(null);
            }}
          />
        </span>
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

// The full-width banner band shown directly below the breadcrumbs when a page
// has a `banner_color`. It bleeds to the section edges; an inner wrapper matches
// the content column so the optional caption settles into the band's bottom-left
// corner, aligned with the page title below. The band is a bold solid color
// carrying light text, and the
// caption shows no placeholder (text is optional) — the writer clicks the band
// to add a line, which EditableText commits on Enter/blur so it stays one line.
function PageBanner({
  color,
  text,
  bodyFont,
  reserveOutline,
  onCommitText,
}: {
  color: string | null;
  text: string | null;
  bodyFont: string;
  reserveOutline: boolean;
  onCommitText: (text: string) => void;
}) {
  if (!color) return null;
  return (
    <div
      className="flex w-full items-end"
      style={{ background: color, minHeight: "7rem" }}
    >
      {/* Mirror the content row exactly (same centred article + optional outline
          spacer) so the caption's left edge lands flush with the page title and
          body below, regardless of whether the outline is showing. */}
      <div className="mx-auto flex w-full max-w-[1120px] justify-center gap-12 px-8">
        <div className="w-full min-w-0 max-w-[68ch] pb-3">
          <EditableText
            value={text ?? ""}
            ariaLabel="Banner caption"
            allowEmpty
            onCommit={onCommitText}
            className="text-sm font-medium tracking-[0.08em]"
            style={{ color: "rgba(255, 255, 255, 0.95)", fontFamily: bodyFont }}
          />
        </div>
        {reserveOutline && (
          <div className="hidden w-52 shrink-0 md:block" aria-hidden />
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

function BreadcrumbSep() {
  return <span className="select-none text-muted/50">/</span>;
}
