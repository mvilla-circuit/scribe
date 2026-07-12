import { Check, Link2, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { normalizeRelationRefs } from "@/lib/datagrid-relation";
import type { DatagridRelationRef } from "@/lib/datagrid-schema";
import { matchesNormalizedQuery } from "@/lib/text-match";
import { cn } from "@/lib/utils";

import type { RelationTargets } from "./datagrid-relations";

interface RelationFieldProps {
  fieldName: string;
  value: DatagridRelationRef[];
  targets: RelationTargets;
  onChange: (refs: DatagridRelationRef[]) => void;
}

const refKey = (ref: DatagridRelationRef) => `${ref.type}:${ref.id}`;

/**
 * The editor for a relation property: quiet chips for each linked record (each
 * navigable) with an inline picker to add or remove links. Prioritizes
 * same-collection rows via the injected {@link RelationTargets}.
 */
export function RelationField({
  fieldName,
  value,
  targets,
  onChange,
}: RelationFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedKeys = useMemo(() => new Set(value.map(refKey)), [value]);

  const filtered = useMemo(
    () =>
      targets.options.filter(
        (o) =>
          matchesNormalizedQuery(o.label, query) ||
          matchesNormalizedQuery(o.subtitle, query),
      ),
    [targets.options, query],
  );

  const toggle = (ref: DatagridRelationRef) => {
    const key = refKey(ref);
    if (selectedKeys.has(key)) {
      onChange(value.filter((v) => refKey(v) !== key));
    } else {
      onChange(normalizeRelationRefs([...value, ref]));
    }
  };

  const remove = (ref: DatagridRelationRef) => {
    onChange(value.filter((v) => refKey(v) !== refKey(ref)));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((ref) => {
        const resolved = targets.resolveLabel(ref);
        return (
          <span
            key={refKey(ref)}
            className="group/chip inline-flex items-center gap-0.5 rounded-full bg-tree-group py-0.5 pl-2 pr-1 text-xs font-medium text-text"
          >
            <button
              type="button"
              aria-label={`Open ${resolved}`}
              onClick={() => {
                targets.navigate(ref);
              }}
              className="max-w-[16rem] truncate rounded-sm outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              {resolved}
            </button>
            <button
              type="button"
              aria-label={`Remove ${resolved}`}
              onClick={() => {
                remove(ref);
              }}
              className="flex size-4 items-center justify-center rounded-full text-muted opacity-60 outline-none hover:text-danger hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        );
      })}

      <button
        type="button"
        aria-label={`Add ${fieldName}`}
        onClick={() => {
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs font-medium text-muted outline-none hover:border-border hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-3" aria-hidden="true" />
        Link
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0">
          <DialogTitle className="sr-only">Add {fieldName}</DialogTitle>
          <div className="border-b border-border p-2.5">
            <Input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              placeholder="Search records…"
              className="h-9"
            />
          </div>
          <div className="max-h-[20rem] overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted">
                No records found.
              </p>
            ) : (
              filtered.map((option) => {
                const checked = selectedKeys.has(refKey(option.ref));
                return (
                  <button
                    key={refKey(option.ref)}
                    type="button"
                    onClick={() => {
                      toggle(option.ref);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      checked ? "bg-selected" : "hover:bg-hover",
                    )}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center text-muted">
                      {checked ? (
                        <Check
                          className="size-4 text-accent"
                          aria-hidden="true"
                        />
                      ) : (
                        <Link2 className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text">
                        {option.label}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {option.subtitle}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
