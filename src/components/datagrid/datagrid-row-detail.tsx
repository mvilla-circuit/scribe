import { X } from "lucide-react";
import { type ReactNode, useState } from "react";

import { EditableText } from "@/components/book/editable-text";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useDragResize } from "@/components/ui/use-drag-resize";
import { SaveStatus } from "@/editor/save-status";
import type { SaveState } from "@/editor/use-autosave";

import { DatagridRowBody } from "./datagrid-row-body";
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
    headerClassName:
      "flex items-center gap-2 border-b border-border px-5 py-2.5",
    titleClassName:
      "text-2xl font-semibold leading-tight tracking-tight text-text",
    bodyClassName: "min-h-0 flex-1 overflow-y-auto px-6 py-5",
    propertiesClassName: "mt-5",
    editorClassName: "mt-6 border-t border-border pt-5",
  },
  split: {
    headerClassName:
      "flex items-center gap-2 border-b border-border px-4 py-2.5",
    titleClassName:
      "text-xl font-semibold leading-tight tracking-tight text-text",
    bodyClassName: "min-h-0 flex-1 overflow-y-auto bg-bg px-5 py-4",
    propertiesClassName: "mt-4",
    editorClassName: "mt-5 border-t border-border pt-4",
  },
} as const;

type PanelVariant = keyof typeof PANEL_STYLES;

function RowPanelChrome({
  saveState,
  onClose,
  headerClassName,
  children,
}: {
  saveState: SaveState;
  onClose: () => void;
  headerClassName: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className={headerClassName}>
        <SaveStatus state={saveState} />
        <div className="ml-auto flex items-center gap-1.5">
          <RowOpenModeControl />
          <button
            type="button"
            aria-label="Close row"
            onClick={onClose}
            className={CLOSE_BUTTON_CLASS}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
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
}: {
  datagridId: string;
  rowId: string;
  onClose: () => void;
  variant: PanelVariant;
}) {
  const { row, fields, properties, relationTargets, rename, patchProperty } =
    useDatagridRowDetail(datagridId, rowId);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const styles = PANEL_STYLES[variant];
  const title = row?.title ?? "Untitled";

  return (
    <>
      {variant === "modal" && (
        <DialogTitle className="sr-only">{title}</DialogTitle>
      )}
      <RowPanelChrome
        saveState={saveState}
        onClose={onClose}
        headerClassName={styles.headerClassName}
      >
        <div className={styles.bodyClassName}>
          <EditableText
            value={title}
            ariaLabel="Row title"
            placeholder="Untitled"
            onCommit={rename}
            className={styles.titleClassName}
            style={{ fontFamily: "var(--font-display)" }}
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
          </div>
          <div
            className={styles.editorClassName}
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
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[85vh] w-[min(40rem,calc(100vw-2rem))] flex-col overflow-hidden p-0"
      >
        <RowPanelContent
          key={rowId}
          datagridId={datagridId}
          rowId={rowId}
          onClose={onClose}
          variant="modal"
        />
      </DialogContent>
    </Dialog>
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
