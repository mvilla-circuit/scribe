import { Plus, Upload } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { FontControl } from "@/components/book/font-control";
import { NavHistoryControls } from "@/components/book/nav-history-controls";
import { leafDeleteTitle } from "@/components/leaf-delete-copy";
import { DatagridIcon } from "@/components/sidebar/icons";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbSep,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EditableText } from "@/components/ui/editable-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Masthead } from "@/components/ui/masthead";
import { AddCoverButton, PageCover } from "@/components/ui/page-cover";
import { SubtitleToggle } from "@/components/ui/subtitle-toggle";
import { useCollections } from "@/data/collections";
import { deleteCoverObject, useUploadCover } from "@/data/cover-upload";
import {
  datagridFontOverrides,
  datagridShowSubtitle,
  useRenameDatagrid,
  useUpdateDatagrid,
} from "@/data/datagrids";
import { profileFonts, useProfile } from "@/data/profile";
import { resolveFonts } from "@/fonts/resolve";
import { useFontOverrides } from "@/fonts/use-font-overrides";
import { useScopedFonts } from "@/fonts/use-scoped-fonts";
import { useUIStore } from "@/store/ui";

import { DatagridBoardView } from "./datagrid-board-view";
import { DatagridBulkToolbar } from "./datagrid-bulk-toolbar";
import {
  DatagridExportDialog,
  DatagridImportDialog,
} from "./datagrid-csv-dialogs";
import { FieldManager } from "./datagrid-field-manager";
import { DatagridGalleryView } from "./datagrid-gallery-view";
import { DatagridPageToolbar } from "./datagrid-page-toolbar";
import { DatagridRowModal, DatagridRowSplit } from "./datagrid-row-detail";
import { DatagridTableView } from "./datagrid-table-view";
import { DatagridViewTabs } from "./datagrid-view-tabs";
import { useDatagridPageModel } from "./use-datagrid-page-model";

/**
 * The datagrid surface: a masthead, a compact toolbar (search, view options,
 * New), and the active layout view (table/gallery/board) over the datagrid's
 * rows. Filter/sort/group/columns, layout, fields, and CSV live in the options
 * menu. Opening a row updates the UI store for modal/split/full presentation.
 */
export function DatagridPage({ datagridId }: { datagridId: string }) {
  const {
    activeView,
    boardField,
    bulkSetProperty,
    clearSelection,
    config,
    csvRows,
    datagrid,
    datagridsQuery,
    deleteRow,
    deleteSelected,
    fields,
    handleCreateRow,
    handleDeleteView,
    handleImport,
    handleNewView,
    isTrulyEmpty,
    orderedRows,
    patchProperty,
    persistConfig,
    persistFields,
    query,
    relationTargets,
    selectedIds,
    setActiveViewId,
    setQuery,
    toggleSelect,
    toggleSelectAll,
    updateRow,
    views,
    visibleFields,
  } = useDatagridPageModel(datagridId);
  const collectionsQuery = useCollections();

  const renameDatagrid = useRenameDatagrid();
  const updateDatagrid = useUpdateDatagrid();
  const uploadCover = useUploadCover();

  const setActiveCollection = useUIStore((s) => s.setActiveCollection);
  const setActiveDatagridRow = useUIStore((s) => s.setActiveDatagridRow);
  const navigateTo = useUIStore((s) => s.navigateTo);
  const activeRowId = useUIStore((s) => s.activeDatagridRowId);
  const rowOpenMode = useUIStore((s) => s.rowOpenMode);

  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Fonts cascade global -> datagrid (book parity; no page-level layer here).
  const { data: profile } = useProfile();
  const datagridOverrides = useMemo(
    () => (datagrid ? datagridFontOverrides(datagrid) : {}),
    [datagrid],
  );
  const { inherited, resolved } = useMemo(() => {
    const globalFonts = profileFonts(profile);
    return {
      inherited: resolveFonts(globalFonts),
      resolved: resolveFonts(globalFonts, datagridOverrides),
    };
  }, [profile, datagridOverrides]);
  const fontVars = useScopedFonts(resolved);
  const fontHandlers = useFontOverrides({
    overrides: datagridOverrides,
    onChange: (fonts) => {
      if (!datagrid) return;
      updateDatagrid.mutate({
        id: datagrid.id,
        themePatch: { fonts: fonts ?? {} },
      });
    },
  });

  if (!datagrid) {
    const status = datagridsQuery.isLoading
      ? { title: "Loading datagrid…", body: null }
      : datagridsQuery.isError
        ? {
            title: "Couldn't load this datagrid",
            body: "Check your connection and try again.",
          }
        : {
            title: "Datagrid not found",
            body: "It may have been deleted or moved to another place.",
          };
    return (
      <div className="flex h-full flex-col bg-bg">
        <nav
          aria-label="Datagrid"
          data-tauri-drag-region
          className="sticky top-0 z-20 flex items-center gap-3 bg-bg px-8 py-3"
        >
          <NavHistoryControls />
        </nav>
        <div className="flex flex-1 items-center justify-center px-8 pb-16">
          <div className="text-center">
            <p className="text-sm font-medium text-text">{status.title}</p>
            {status.body && (
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {status.body}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const collection =
    collectionsQuery.data?.find((c) => c.id === datagrid.collection_id) ?? null;

  const layout = config.layout;
  const showSubtitle = datagridShowSubtitle(datagrid);
  const toggleSubtitle = () => {
    updateDatagrid.mutate({
      id: datagridId,
      themePatch: { showSubtitle: !showSubtitle },
    });
  };

  const setCover = async (file: File) => {
    const previous = datagrid.cover_url;
    const coverUrl = await uploadCover.mutateAsync(file);
    await updateDatagrid.mutateAsync({ id: datagridId, cover_url: coverUrl });
    void deleteCoverObject(previous);
    return coverUrl;
  };

  const clearCover = () => {
    const previous = datagrid.cover_url;
    updateDatagrid.mutate(
      { id: datagridId, cover_url: null },
      {
        onSuccess: () => {
          void deleteCoverObject(previous);
        },
      },
    );
  };

  const setRowCover = async (rowId: string, file: File) => {
    const previous =
      orderedRows.find((row) => row.id === rowId)?.cover_url ?? null;
    const coverUrl = await uploadCover.mutateAsync(file);
    await updateRow.mutateAsync({ id: rowId, cover_url: coverUrl });
    void deleteCoverObject(previous);
    return coverUrl;
  };

  const openRow = (rowId: string) => {
    setActiveDatagridRow(rowId, datagridId);
  };

  const closeRow = () => {
    navigateTo({ datagridId });
  };

  const confirmPendingDelete = () => {
    const target = pendingDelete;
    if (!target) return;
    if (activeRowId === target.id) closeRow();
    deleteRow(target.id);
  };

  let layoutView: ReactNode;
  if (isTrulyEmpty) {
    layoutView = (
      <EmptyState
        className="mt-4"
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tree-group text-muted">
            <DatagridIcon size={20} />
          </div>
        }
        title="This datagrid is empty"
        body={
          layout === "gallery" || layout === "board"
            ? "Add a card to start building records, or import existing data from a CSV."
            : "Add a row to start building records, or import existing data from a CSV."
        }
        cta={
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleCreateRow}>
              <Plus className="size-4" aria-hidden="true" />
              {layout === "gallery" || layout === "board"
                ? "New card"
                : "New row"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setImportOpen(true);
              }}
            >
              <Upload className="size-4" aria-hidden="true" />
              Import CSV
            </Button>
          </div>
        }
      />
    );
  } else if (orderedRows.length === 0 && layout !== "board") {
    layoutView = (
      <p className="py-6 text-center text-sm text-muted">No matches</p>
    );
  } else if (layout === "gallery") {
    layoutView = (
      <DatagridGalleryView
        rows={orderedRows}
        fields={visibleFields}
        onOpenRow={openRow}
        onCreateRow={handleCreateRow}
        onUploadCover={setRowCover}
        onDeleteRow={(rowId) => {
          const row = orderedRows.find((candidate) => candidate.id === rowId);
          setPendingDelete({
            id: rowId,
            title: row?.title || "Untitled",
          });
        }}
        relationTargets={relationTargets}
      />
    );
  } else if (layout === "board") {
    layoutView = (
      <DatagridBoardView
        rows={orderedRows}
        boardField={boardField}
        chipFields={visibleFields}
        onOpenRow={openRow}
        onCreateRow={handleCreateRow}
        onMoveCard={(rowId, key) => {
          if (boardField) {
            patchProperty(rowId, boardField.id, key);
          }
        }}
        onConfigureFields={() => {
          setFieldsOpen(true);
        }}
        relationTargets={relationTargets}
      />
    );
  } else {
    layoutView = (
      <DatagridTableView
        rows={orderedRows}
        fields={visibleFields}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onOpenRow={openRow}
        onCreateRow={handleCreateRow}
        onCommitTitle={(id, title) => {
          updateRow.mutate({ id, title });
        }}
        onCommitCell={(id, fieldId, value) => {
          patchProperty(id, fieldId, value);
        }}
        columnWidths={config.columnWidths}
        onResizeColumn={(columnId, width) => {
          persistConfig((prev) => ({
            ...prev,
            columnWidths: { ...prev.columnWidths, [columnId]: width },
          }));
        }}
        relationTargets={relationTargets}
      />
    );
  }

  return (
    <div style={fontVars} className="flex h-full min-h-0">
      <div className="h-full min-w-0 flex-1 overflow-y-auto bg-bg">
        <nav
          aria-label="Datagrid"
          data-tauri-drag-region
          className="sticky top-0 z-20 flex items-center gap-3 bg-bg px-8 py-2"
        >
          <NavHistoryControls />
          <Breadcrumb label="Breadcrumb" className="flex-1">
            <BreadcrumbLink
              onClick={() => {
                setActiveCollection(datagrid.collection_id);
              }}
            >
              {collection?.name || "Collection"}
            </BreadcrumbLink>
            <BreadcrumbSep />
            <span className="min-w-0 shrink truncate px-1 text-text">
              {datagrid.name || "Untitled"}
            </span>
          </Breadcrumb>
          <span className="ml-auto flex items-center gap-1">
            <SubtitleToggle active={showSubtitle} onToggle={toggleSubtitle} />
            <FontControl
              heading="Datagrid fonts"
              inheritLabel="global"
              overrides={datagridOverrides}
              inherited={inherited}
              onSet={fontHandlers.setFont}
              onClear={fontHandlers.clearFont}
              onClearAll={fontHandlers.clearAll}
            />
          </span>
        </nav>

        <PageCover
          coverUrl={datagrid.cover_url}
          onUpload={setCover}
          onRemove={clearCover}
        />

        <div className="mx-auto w-full max-w-6xl px-8 pb-10 pt-3">
          <Masthead
            icon={datagrid.icon}
            onSelectIcon={(icon) => {
              updateDatagrid.mutate({ id: datagridId, icon });
            }}
            onRemoveIcon={() => {
              updateDatagrid.mutate({ id: datagridId, icon: null });
            }}
            changeIconLabel="Change datagrid icon"
            actions={
              datagrid.cover_url ? undefined : (
                <AddCoverButton onUpload={setCover} />
              )
            }
          >
            <EditableText
              value={datagrid.name}
              ariaLabel="Datagrid name"
              placeholder="Untitled"
              onCommit={(name) => {
                renameDatagrid.mutate({ id: datagridId, name });
              }}
              className="text-2xl font-semibold leading-tight tracking-tight text-text"
              style={{ fontFamily: "var(--font-display)" }}
            />
            {showSubtitle && (
              <EditableText
                value={datagrid.subtitle ?? ""}
                ariaLabel="Datagrid subtitle"
                placeholder="Add a subtitle"
                allowEmpty
                onCommit={(subtitle) => {
                  updateDatagrid.mutate({
                    id: datagridId,
                    subtitle: subtitle || null,
                  });
                }}
                className="mt-1.5 text-base leading-snug text-muted"
                style={{ fontFamily: "var(--font-text)" }}
              />
            )}
          </Masthead>

          <div className="mt-3 flex flex-col gap-2.5">
            <DatagridViewTabs
              views={views}
              activeViewId={activeView?.id ?? null}
              onSelect={setActiveViewId}
              onCreateView={handleNewView}
              onDelete={handleDeleteView}
            />

            <DatagridPageToolbar
              query={query}
              onQueryChange={setQuery}
              fields={fields}
              config={config}
              onChangeConfig={persistConfig}
              onOpenFields={() => {
                setFieldsOpen(true);
              }}
              onOpenImport={() => {
                setImportOpen(true);
              }}
              onOpenExport={() => {
                setExportOpen(true);
              }}
              onCreateRow={handleCreateRow}
              onCreateView={handleNewView}
            />

            {layoutView}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="pointer-events-none sticky bottom-6 z-30 flex justify-center px-8">
            <div className="pointer-events-auto">
              <DatagridBulkToolbar
                count={selectedIds.size}
                onClear={clearSelection}
                onDelete={deleteSelected}
                fields={fields}
                onApplyField={bulkSetProperty}
                relationTargets={relationTargets}
              />
            </div>
          </div>
        )}

        <FieldManager
          open={fieldsOpen}
          onOpenChange={setFieldsOpen}
          fields={fields}
          onChange={persistFields}
        />
        <DatagridImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          fields={fields}
          onImport={handleImport}
        />
        <DatagridExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          name={datagrid.name}
          rows={csvRows}
          fields={fields}
        />
      </div>

      {activeRowId && rowOpenMode === "split" && (
        <DatagridRowSplit
          datagridId={datagridId}
          rowId={activeRowId}
          onClose={closeRow}
        />
      )}
      {activeRowId && rowOpenMode === "modal" && (
        <DatagridRowModal
          datagridId={datagridId}
          rowId={activeRowId}
          onClose={closeRow}
        />
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={pendingDelete ? leafDeleteTitle(pendingDelete.title) : ""}
        description="This permanently deletes the card."
        confirmLabel="Delete"
        danger
        onConfirm={confirmPendingDelete}
      />
    </div>
  );
}
