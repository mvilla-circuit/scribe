import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type DatagridCsvRow,
  type DatagridParsedRow,
  parseDatagridCsv,
  serializeDatagridCsv,
} from "@/lib/datagrid-csv";
import type { DatagridField } from "@/lib/datagrid-schema";

/** Triggers a client-side download of `text` as a `.csv` file, best-effort. */
function downloadCsv(name: string, text: string) {
  try {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("CSV download failed", err);
  }
}

/**
 * Export dialog: serializes the datagrid's rows to CSV (a Title column plus one
 * per field), showing a preview the user can review before downloading.
 */
export function DatagridExportDialog({
  open,
  onOpenChange,
  name,
  rows,
  fields,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  rows: DatagridCsvRow[];
  fields: DatagridField[];
}) {
  const csv = useMemo(() => serializeDatagridCsv(rows, fields), [rows, fields]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(40rem,calc(100vw-2rem))]">
        <DialogTitle>Export CSV</DialogTitle>
        <DialogDescription>
          {rows.length} row{rows.length === 1 ? "" : "s"} will be exported.
        </DialogDescription>
        <textarea
          readOnly
          aria-label="CSV preview"
          value={csv}
          className="mt-4 h-48 w-full resize-none rounded-md border border-border bg-bg p-2 font-code text-xs text-text outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              downloadCsv(name || "datagrid", csv);
              onOpenChange(false);
            }}
          >
            Download CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Import dialog: parses pasted CSV against the datagrid's fields (matching
 * columns to fields by name), previews how many rows are valid and any per-cell
 * problems, then hands the parsed rows to the caller to insert.
 */
export function DatagridImportDialog({
  open,
  onOpenChange,
  fields,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: DatagridField[];
  onImport: (rows: DatagridParsedRow[]) => void;
}) {
  const [text, setText] = useState("");

  const result = useMemo(
    () => (text.trim() === "" ? null : parseDatagridCsv(text, fields)),
    [text, fields],
  );

  const close = () => {
    setText("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setText("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[min(40rem,calc(100vw-2rem))]">
        <DialogTitle>Import CSV</DialogTitle>
        <DialogDescription>
          Paste CSV with a Title column. Other columns match your fields by
          name.
        </DialogDescription>
        <textarea
          aria-label="CSV to import"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
          }}
          placeholder="Title,Notes&#10;First,Hello"
          className="mt-4 h-40 w-full resize-none rounded-md border border-border bg-bg p-2 font-code text-xs text-text outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {result && (
          <div className="mt-2 text-xs text-muted">
            <p>
              {result.rows.length} row{result.rows.length === 1 ? "" : "s"}{" "}
              ready to import.
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-1 max-h-24 list-disc overflow-y-auto pl-4 text-danger">
                {result.errors.map((error) => (
                  <li key={`${error.row}:${error.message}`}>
                    {error.row > 0 ? `Row ${error.row}: ` : ""}
                    {error.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!result || result.rows.length === 0}
            onClick={() => {
              if (result) onImport(result.rows);
              close();
            }}
          >
            Import
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
