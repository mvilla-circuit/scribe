import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  DatagridField,
  DatagridPropertyValue,
} from "@/lib/datagrid-schema";

import { DatagridFieldEditor } from "./datagrid-field-editor";
import type { RelationTargets } from "./datagrid-relations";

// Computed-time fields are read-only, so they can't be bulk-set.
const READ_ONLY_TYPES = new Set(["created_time", "updated_time"]);

interface BulkToolbarProps {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  /** Editable fields offered for a bulk property set. */
  fields?: DatagridField[];
  /** Sets one field to the given value across every selected row. */
  onApplyField?: (fieldId: string, value: DatagridPropertyValue) => void;
  relationTargets?: RelationTargets;
}

/**
 * A calm floating toolbar shown while one or more rows are selected: it names
 * the selection count, offers a bulk delete, and — when fields are supplied —
 * lets the user pick one property and set it across every selected row. Mirrors
 * the app's quiet feedback chrome rather than a loud action bar.
 */
export function DatagridBulkToolbar({
  count,
  onClear,
  onDelete,
  fields,
  onApplyField,
  relationTargets,
}: BulkToolbarProps) {
  const [editField, setEditField] = useState<DatagridField | null>(null);
  const [draft, setDraft] = useState<DatagridPropertyValue>(null);

  if (count === 0) return null;

  const editable = (fields ?? []).filter((f) => !READ_ONLY_TYPES.has(f.type));
  const canBulkEdit = editable.length > 0 && onApplyField !== undefined;

  const beginEdit = (field: DatagridField) => {
    setEditField(field);
    setDraft(null);
  };

  const cancelEdit = () => {
    setEditField(null);
    setDraft(null);
  };

  const applyEdit = () => {
    if (!editField) return;
    onApplyField?.(editField.id, draft);
    cancelEdit();
  };

  return (
    <div
      role="toolbar"
      aria-label="Selection actions"
      className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-2 py-1.5 shadow-popover"
    >
      <button
        type="button"
        aria-label="Clear selection"
        onClick={() => {
          cancelEdit();
          onClear();
        }}
        className="flex size-6 items-center justify-center rounded text-muted outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      <span className="text-sm font-medium text-text">{count} selected</span>

      {editField ? (
        <div className="ml-1 flex items-center gap-1.5 border-l border-border pl-2">
          <span className="text-xs text-muted">{editField.name}</span>
          <div className="min-w-40">
            <DatagridFieldEditor
              field={editField}
              value={draft}
              relationTargets={relationTargets}
              onCommit={setDraft}
            />
          </div>
          <button
            type="button"
            onClick={applyEdit}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-accent outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Check className="size-4" aria-hidden="true" />
            Apply
          </button>
          <button
            type="button"
            aria-label="Cancel edit"
            onClick={cancelEdit}
            className="flex size-6 items-center justify-center rounded text-muted outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        canBulkEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring">
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {editable.map((field) => (
                <DropdownMenuItem
                  key={field.id}
                  onSelect={() => {
                    beginEdit(field);
                  }}
                >
                  {field.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      )}

      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-danger outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Delete
      </button>
    </div>
  );
}
