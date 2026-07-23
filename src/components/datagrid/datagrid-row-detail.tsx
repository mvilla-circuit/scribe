import { X } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EditableText } from "@/components/ui/editable-text";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { AddCoverButton, PageCover } from "@/components/ui/page-cover";
import { useDragResize } from "@/components/ui/use-drag-resize";
import { SaveStatus } from "@/editor/save-status";
import type { SaveState } from "@/editor/use-autosave";
import { displayTitleStyle } from "@/fonts/display-title-style";
import { cn } from "@/lib/utils";

import { DatagridRowBody } from "./datagrid-row-body";
import { DatagridRowBreadcrumbs } from "./datagrid-row-breadcrumbs";
import { DatagridRowFieldsBar } from "./datagrid-row-fields-bar";
import { RowOpenModeControl } from "./datagrid-row-open-mode-control";
import { DatagridRowProperties } from "./datagrid-row-properties";
import { useDatagridRowDetail } from "./use-datagrid-row-detail";

const SPLIT_MIN = 340;
const SPLIT_MAX = 720;
const SPLIT_DEFAULT = 460;
const clampSplit = (w: number) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, w));

const CLOSE_BUTTON_CLASS =
  "flex size-7 items-center justify-center rounded-md text-muted outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring";

const PANEL_STYLES = {
  modal: {
    headerClassName: "flex items-center gap-2 border-b border-border px-8 py-3",
    titleClassName: "text-text",
    bodyClassName: "min-h-0 flex-1 overflow-y-auto px-8 pb-8 pt-8",
    propertiesClassName: "mt-6",
    editorClassName: "mt-8 border-t border-border pt-6",
  },
  split: {
    headerClassName:
      "flex items-center gap-2 border-b border-border px-6 py-2.5",
    titleClassName: "text-text",
    bodyClassName: "min-h-0 flex-1 overflow-y-auto bg-bg px-6 pb-6 pt-6",
    propertiesClassName: "mt-5",
    editorClassName: "mt-6 border-t border-border pt-5",
  },
} as const;

type PanelVariant = keyof typeof PANEL_STYLES;

function RowPanelChrome({
  saveState,
  onClose,
  headerClassName,
  datagridId,
  children,
}: {
  saveState: SaveState;
  onClose: () => void;
  headerClassName: string;
  datagridId: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className={headerClassName}>
        <DatagridRowBreadcrumbs datagridId={datagridId} />
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <SaveStatus state={saveState} />
          <RowOpenModeControl />
          <button
            type="button"
            aria-label="Close row"
            onClick={onClose}
            className={CLOSE_BUTTON_CLASS}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </span>
      </div>
      {children}
    </>
  );
}

/** Shared modal/split body: detail hook, save state, chrome, and property form. */
function RowPanelContent({
  datagridId,
  rowId,
  onClose,
  variant,
  onViewCover,
}: {
  datagridId: string;
  rowId: string;
  onClose: () => void;
  variant: PanelVariant;
  /**
   * When provided (row modal), View cover is lifted so the parent can show a
   * single Dialog at a time instead of nesting ImageLightbox inside the modal.
   */
  onViewCover?: (src: string) => void;
}) {
  const {
    row,
    fields,
    properties,
    relationTargets,
    rename,
    setCover,
    setCoverPosition,
    clearCover,
    patchProperty,
  } = useDatagridRowDetail(datagridId, rowId);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const styles = PANEL_STYLES[variant];
  const title = row?.title ?? "Untitled";
  const coverUrl = row?.cover_url ?? null;

  return (
    <>
      {variant === "modal" && (
        <DialogTitle className="sr-only">{title}</DialogTitle>
      )}
      <RowPanelChrome
        saveState={saveState}
        onClose={onClose}
        headerClassName={styles.headerClassName}
        datagridId={datagridId}
      >
        <PageCover
          coverUrl={coverUrl}
          coverPosition={row?.cover_position ?? 50}
          onUpload={setCover}
          onRemove={clearCover}
          onPositionChange={setCoverPosition}
          onViewCover={onViewCover}
        />
        <div className={styles.bodyClassName} data-testid="row-panel-body">
          {!coverUrl && (
            <div className="group/masthead mb-3">
              <AddCoverButton onUpload={setCover} />
            </div>
          )}
          <EditableText
            value={title}
            ariaLabel="Row title"
            placeholder="Untitled"
            onCommit={rename}
            className={styles.titleClassName}
            style={displayTitleStyle()}
          />
          <div className={styles.propertiesClassName}>
            <DatagridRowProperties
              fields={fields}
              properties={properties}
              createdAt={row?.created_at ?? ""}
              updatedAt={row?.updated_at ?? ""}
              relationTargets={relationTargets}
              onPatch={patchProperty}
            />
            <DatagridRowFieldsBar datagridId={datagridId} fields={fields} />
          </div>
          <div
            className={styles.editorClassName}
            data-testid="row-panel-editor"
            style={{ fontFamily: "var(--font-text)" }}
          >
            <DatagridRowBody rowId={rowId} onSaveStateChange={setSaveState} />
          </div>
        </div>
      </RowPanelChrome>
    </>
  );
}

/**
 * A datagrid row opened as a centered, widened modal: a definition-list of
 * properties above a TipTap body, in a calm reading rhythm. Reuses the shared
 * Dialog (matching overlay + `scribe-dialog-in`).
 */
export function DatagridRowModal({
  datagridId,
  rowId,
  onClose,
}: {
  datagridId: string;
  rowId: string;
  onClose: () => void;
}) {
  // Only one Dialog at a time: suspend the row modal (forceMount keeps the
  // editor mounted) while the cover lightbox is open.
  const [coverLightboxSrc, setCoverLightboxSrc] = useState<string | null>(null);
  const coverLightboxOpen = coverLightboxSrc !== null;

  return (
    <>
      <Dialog
        open={!coverLightboxOpen}
        onOpenChange={(o) => {
          if (!o) onClose();
        }}
      >
        <DialogContent
          forceMount
          aria-describedby={undefined}
          className={cn(
            "flex max-h-[85vh] w-[min(40rem,calc(100vw-2rem))] flex-col overflow-hidden p-0",
            coverLightboxOpen && "hidden",
          )}
        >
          <RowPanelContent
            key={rowId}
            datagridId={datagridId}
            rowId={rowId}
            onClose={onClose}
            variant="modal"
            onViewCover={setCoverLightboxSrc}
          />
        </DialogContent>
      </Dialog>
      <ImageLightbox
        open={coverLightboxOpen}
        onOpenChange={(open) => {
          if (!open) setCoverLightboxSrc(null);
        }}
        src={coverLightboxSrc ?? ""}
        alt="Page cover"
      />
    </>
  );
}

/**
 * A datagrid row opened as a right-hand split panel beside the grid. Draggable
 * left edge resizes it (committed once on release, per the sidebar pattern);
 * a compact masthead carries the save status and open-mode switcher.
 */
export function DatagridRowSplit({
  datagridId,
  rowId,
  onClose,
}: {
  datagridId: string;
  rowId: string;
  onClose: () => void;
}) {
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [storedWidth, setStoredWidth] = useState(SPLIT_DEFAULT);
  const width = dragWidth ?? storedWidth;

  const { onMouseDown } = useDragResize({
    onResize: (clientX) => {
      setDragWidth(clampSplit(window.innerWidth - clientX));
    },
    onCommit: (clientX) => {
      setStoredWidth(clampSplit(window.innerWidth - clientX));
      setDragWidth(null);
    },
  });

  return (
    <aside
      aria-label="Row"
      style={{ width }}
      className="relative flex h-full min-h-0 shrink-0 flex-col border-l border-border bg-surface"
    >
      {/* Pointer-driven resize splitter; the separator role carries the resize
          semantics for assistive tech. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- The separator role intentionally carries resize semantics for this pointer-driven splitter. */}
      <div
        onMouseDown={onMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize row panel"
        aria-valuenow={Math.round(width)}
        aria-valuemin={SPLIT_MIN}
        aria-valuemax={SPLIT_MAX}
        className="absolute left-0 top-0 z-10 h-full w-1 -translate-x-1/2 cursor-col-resize hover:bg-accent/30"
      />
      <RowPanelContent
        key={rowId}
        datagridId={datagridId}
        rowId={rowId}
        onClose={onClose}
        variant="split"
      />
    </aside>
  );
}
