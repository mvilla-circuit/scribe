import { useRef, useState } from "react";

import { EditorBridgeHost } from "@/components/book/editor-bridge-host";
import { NavHistoryControls } from "@/components/book/nav-history-controls";
import { Breadcrumb, BreadcrumbLink } from "@/components/ui/breadcrumb";
import {
  EditableText,
  type EditableTextHandle,
} from "@/components/ui/editable-text";
import { Masthead } from "@/components/ui/masthead";
import { AddCoverButton, PageCover } from "@/components/ui/page-cover";
import { SkeletonText } from "@/components/ui/skeleton";
import { useCollections } from "@/data/collections";
import { deleteCoverObject, useUploadCover } from "@/data/cover-upload";
import {
  useEntries,
  useEntryContent,
  useRenameEntry,
  useUpdateEntry,
  useUpdateEntryContent,
} from "@/data/entries";
import { Editor, type EditorHandle } from "@/editor/lazy-editor";
import { SaveStatus } from "@/editor/save-status";
import type { SaveState } from "@/editor/use-autosave";
import { useUIStore } from "@/store/ui";

interface EntryViewProps {
  collectionId: string;
  entryId: string;
}

/**
 * A collection entry rendered as a document reading surface with an editable
 * title, rich-text body, quiet save status, and a breadcrumb back to its
 * collection gallery.
 */
export function EntryView({ collectionId, entryId }: EntryViewProps) {
  const entriesQuery = useEntries();
  const contentQuery = useEntryContent(entryId);
  const collectionsQuery = useCollections();
  const renameEntry = useRenameEntry();
  const updateEntry = useUpdateEntry();
  const uploadCover = useUploadCover();
  const updateContent = useUpdateEntryContent();
  const navigateTo = useUIStore((state) => state.navigateTo);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const editorRef = useRef<EditorHandle>(null);
  const titleRef = useRef<EditableTextHandle>(null);

  const entry = entriesQuery.data?.find((item) => item.id === entryId) ?? null;
  // Prefer the entry row's collection_id so a successful (or optimistic) move
  // keeps the breadcrumb honest even if the store axis hasn't caught up yet.
  const resolvedCollectionId = entry?.collection_id ?? collectionId;
  const collection =
    collectionsQuery.data?.find((item) => item.id === resolvedCollectionId) ??
    null;

  if (!entry) {
    const status = entriesQuery.isLoading
      ? "Loading doc…"
      : entriesQuery.isError
        ? "Couldn't load this doc"
        : "Doc not found";
    return (
      <div className="flex h-full flex-col bg-bg">
        <EntryBar
          collectionName={collection?.name}
          saveState={saveState}
          onOpenCollection={() => {
            navigateTo({ collectionId: resolvedCollectionId, entryId: null });
          }}
        />
        <div className="flex flex-1 items-center justify-center px-8 pb-16">
          <p className="text-sm font-medium text-text">{status}</p>
        </div>
      </div>
    );
  }

  const setCover = async (file: File) => {
    const previous = entry.cover_url;
    const coverUrl = await uploadCover.mutateAsync(file);
    await updateEntry.mutateAsync({ id: entry.id, cover_url: coverUrl });
    void deleteCoverObject(previous);
    return coverUrl;
  };

  const clearCover = () => {
    const previous = entry.cover_url;
    updateEntry.mutate(
      { id: entry.id, cover_url: null },
      {
        onSuccess: () => {
          void deleteCoverObject(previous);
        },
      },
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <EntryBar
        collectionName={collection?.name}
        saveState={saveState}
        onOpenCollection={() => {
          navigateTo({
            collectionId: entry.collection_id,
            entryId: null,
          });
        }}
      />

      <PageCover
        coverUrl={entry.cover_url}
        onUpload={setCover}
        onRemove={clearCover}
      />

      <article className="mx-auto w-full max-w-[68ch] px-8 py-12 sm:py-16">
        <Masthead
          icon={entry.icon}
          onSelectIcon={(icon) => {
            updateEntry.mutate({ id: entry.id, icon });
          }}
          onRemoveIcon={() => {
            updateEntry.mutate({ id: entry.id, icon: null });
          }}
          changeIconLabel="Change document icon"
          actions={
            entry.cover_url ? undefined : <AddCoverButton onUpload={setCover} />
          }
        >
          <EditableText
            ref={titleRef}
            value={entry.title || "Untitled"}
            ariaLabel="Document title"
            placeholder="Untitled"
            onCommit={(title) => {
              renameEntry.mutate({ id: entry.id, title });
            }}
            onEnter={() => editorRef.current?.focusStart()}
            className="leading-tight tracking-tight text-text"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--font-display-size)",
              fontWeight: "var(--font-display-regular)",
            }}
          />
        </Masthead>

        <div className="mt-8" style={{ fontFamily: "var(--font-text)" }}>
          {contentQuery.isSuccess ? (
            <EditorBridgeHost>
              <Editor
                ref={editorRef}
                key={entry.id}
                documentId={entry.id}
                initialContent={contentQuery.data}
                editable
                onLeaveStart={() => {
                  titleRef.current?.focus();
                  return true;
                }}
                onPersist={(content) =>
                  updateContent.mutateAsync({ id: entry.id, content })
                }
                onSaveStateChange={setSaveState}
              />
            </EditorBridgeHost>
          ) : (
            <div className="flex flex-col gap-6" aria-hidden>
              <SkeletonText lines={3} lineHeight="0.85rem" />
              <SkeletonText lines={4} lineHeight="0.85rem" />
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

function EntryBar({
  collectionName,
  saveState,
  onOpenCollection,
}: {
  collectionName: string | undefined;
  saveState: SaveState;
  onOpenCollection: () => void;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      data-tauri-drag-region
      className="sticky top-0 z-20 flex items-center gap-1 bg-bg px-8 py-3 text-sm text-muted"
    >
      <NavHistoryControls />
      {collectionName !== undefined && (
        <Breadcrumb>
          <BreadcrumbLink onClick={onOpenCollection}>
            {collectionName || "Untitled"}
          </BreadcrumbLink>
        </Breadcrumb>
      )}
      <span className="ml-auto shrink-0">
        <SaveStatus state={saveState} />
      </span>
    </nav>
  );
}
