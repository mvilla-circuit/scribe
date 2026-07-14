import { useState } from "react";

import { NavHistoryControls } from "@/components/book/nav-history-controls";
import { EditableText } from "@/components/ui/editable-text";
import { Masthead } from "@/components/ui/masthead";
import { AddCoverButton, PageCover } from "@/components/ui/page-cover";
import { SaveStatus } from "@/editor/save-status";
import type { SaveState } from "@/editor/use-autosave";

import { DatagridRowBody } from "./datagrid-row-body";
import { DatagridRowBreadcrumbs } from "./datagrid-row-breadcrumbs";
import { DatagridRowFieldsBar } from "./datagrid-row-fields-bar";
import { RowOpenModeControl } from "./datagrid-row-open-mode-control";
import { DatagridRowProperties } from "./datagrid-row-properties";
import { useDatagridRowDetail } from "./use-datagrid-row-detail";

/**
 * A datagrid row opened as a full-window surface (EntryView-like): a sticky
 * breadcrumb nav with the save status and open-mode switcher, a display title
 * and its properties, and a comfortable `max-w-[68ch]` TipTap body.
 */
export function DatagridRowFull({
  datagridId,
  rowId,
}: {
  datagridId: string;
  rowId: string;
}) {
  const {
    row,
    fields,
    properties,
    relationTargets,
    rename,
    setIcon,
    setCover,
    clearCover,
    patchProperty,
    isLoading,
  } = useDatagridRowDetail(datagridId, rowId);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const bar = (
    <nav
      aria-label="Datagrid row"
      data-tauri-drag-region
      className="sticky top-0 z-20 flex items-center gap-1 bg-bg px-8 py-3 text-sm text-muted"
    >
      <NavHistoryControls />
      <DatagridRowBreadcrumbs datagridId={datagridId} label={false} />
      <span className="ml-auto flex shrink-0 items-center gap-2">
        <SaveStatus state={saveState} />
        <RowOpenModeControl />
      </span>
    </nav>
  );

  if (!row) {
    return (
      <section
        aria-label="Datagrid row"
        data-datagrid-id={datagridId}
        data-row-id={rowId}
        className="flex h-full min-h-0 flex-col overflow-hidden bg-bg"
      >
        {bar}
        <div className="flex flex-1 items-center justify-center px-8 pb-16">
          <p className="text-sm font-medium text-text">
            {isLoading ? "Loading row…" : "Row not found"}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Datagrid row"
      data-datagrid-id={datagridId}
      data-row-id={rowId}
      className="h-full min-h-0 overflow-y-auto bg-bg"
    >
      {bar}

      <PageCover
        coverUrl={row.cover_url}
        onUpload={setCover}
        onRemove={clearCover}
      />

      <article className="mx-auto w-full max-w-[68ch] px-8 py-12 sm:py-16">
        <Masthead
          icon={row.icon}
          onSelectIcon={setIcon}
          onRemoveIcon={() => {
            setIcon(null);
          }}
          changeIconLabel="Change row icon"
          actions={
            row.cover_url ? undefined : <AddCoverButton onUpload={setCover} />
          }
        >
          <EditableText
            value={row.title || "Untitled"}
            ariaLabel="Row title"
            placeholder="Untitled"
            onCommit={rename}
            className="leading-tight tracking-tight text-text"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--font-display-size)",
              fontWeight: "var(--font-display-regular)",
            }}
          />
        </Masthead>

        <div className="mt-6">
          {fields.length > 0 && (
            <DatagridRowProperties
              fields={fields}
              properties={properties}
              createdAt={row.created_at}
              updatedAt={row.updated_at}
              relationTargets={relationTargets}
              onPatch={patchProperty}
            />
          )}
          <DatagridRowFieldsBar datagridId={datagridId} fields={fields} />
        </div>

        <div
          className="mt-8 border-t border-border pt-6"
          style={{ fontFamily: "var(--font-text)" }}
        >
          <DatagridRowBody rowId={rowId} onSaveStateChange={setSaveState} />
        </div>
      </article>
    </section>
  );
}
