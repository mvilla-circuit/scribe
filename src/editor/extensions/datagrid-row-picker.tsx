import { memo, useMemo, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  type DatagridLinkOption,
  type DatagridRowLinkOption,
  useEditorBridge,
} from "@/editor/editor-bridge";
import { useKeyboardList } from "@/editor/use-keyboard-list";
import { cn } from "@/lib/utils";

import { useDatagridRowPicker } from "./datagrid-row-picker-store";

type Step = "datagrid" | "row";

/**
 * Two-step picker: choose a datagrid, then a row. Opened by the "Datagrid
 * card" slash item; selecting a row hands `{ datagridId, rowId, label }` back
 * through the callback store, which inserts a datagridRowCard.
 */
export const DatagridRowPicker = memo(function DatagridRowPicker() {
  const onSelect = useDatagridRowPicker((s) => s.callback);
  const close = useDatagridRowPicker((s) => s.close);
  const open = onSelect !== null;

  const { datagridLinkOptions, datagridRowLinkOptions } = useEditorBridge();

  const [step, setStep] = useState<Step>("datagrid");
  const [selectedDatagridId, setSelectedDatagridId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");

  const datagridRows = useMemo(
    () =>
      selectedDatagridId ? datagridRowLinkOptions(selectedDatagridId) : [],
    [datagridRowLinkOptions, selectedDatagridId],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source: (DatagridLinkOption | DatagridRowLinkOption)[] =
      step === "datagrid" ? datagridLinkOptions : datagridRows;
    const filtered = q
      ? source.filter(
          (r) =>
            r.label.toLowerCase().includes(q) ||
            r.subtitle.toLowerCase().includes(q),
        )
      : source;
    return filtered.slice(0, 50);
  }, [step, datagridLinkOptions, datagridRows, query]);

  const { active, setActive, listRef, move } = useKeyboardList(rows.length);

  // Reset transient state during render when the picker opens / step changes.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStep("datagrid");
      setSelectedDatagridId(null);
      setQuery("");
      setActive(0);
    }
  }
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setActive(0);
  }
  const [prevStep, setPrevStep] = useState(step);
  if (step !== prevStep) {
    setPrevStep(step);
    setQuery("");
    setActive(0);
  }

  const chooseDatagrid = (row: DatagridLinkOption) => {
    setSelectedDatagridId(row.datagridId);
    setStep("row");
  };

  const chooseRow = (row: DatagridRowLinkOption) => {
    onSelect?.({
      datagridId: row.datagridId,
      rowId: row.rowId,
      label: row.label,
    });
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && step === "row") {
      e.preventDefault();
      setStep("datagrid");
      setSelectedDatagridId(null);
      return;
    }
    if (move(e.key)) {
      e.preventDefault();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[active];
      if (!row) return;
      if (step === "datagrid" && "datagridId" in row && !("rowId" in row)) {
        chooseDatagrid(row);
      } else if ("rowId" in row) {
        chooseRow(row);
      }
    }
  };

  const title = step === "datagrid" ? "Choose a datagrid" : "Choose a card";
  const placeholder =
    step === "datagrid" ? "Search datagrids…" : "Search cards…";
  const empty = step === "datagrid" ? "No datagrids found." : "No cards found.";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="p-0">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="border-b border-border p-2.5">
          <Input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="h-9"
          />
        </div>
        <div ref={listRef} className="max-h-[20rem] overflow-y-auto p-1.5">
          {rows.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted">{empty}</p>
          ) : (
            rows.map((row, idx) => {
              const key =
                "rowId" in row
                  ? `${row.datagridId}:${row.rowId}`
                  : row.datagridId;
              return (
                <button
                  key={key}
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => {
                    setActive(idx);
                  }}
                  onClick={() => {
                    if ("rowId" in row) chooseRow(row);
                    else chooseDatagrid(row);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-none transition-colors",
                    idx === active ? "bg-selected" : "hover:bg-hover",
                  )}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center text-sm text-muted">
                    {row.icon ?? "▦"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text">
                      {row.label}
                    </span>
                    {row.subtitle && (
                      <span className="block truncate text-xs text-muted">
                        {row.subtitle}
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});
