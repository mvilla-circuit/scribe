import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type DatagridView,
  useDatagridViews,
  useUpdateDatagridView,
} from "@/data/datagrid-views";
import { datagridViewsKey } from "@/data/query-keys";
import {
  type DatagridField,
  type DatagridViewConfig,
  parseDatagridViewConfig,
} from "@/lib/datagrid-schema";
import { cn } from "@/lib/utils";

import {
  pickCardVisibilityView,
  toggleVisibleFieldId,
} from "./datagrid-field-visibility";

/**
 * Quiet control that toggles which fields appear on gallery cards and embeds.
 * Persists to the datagrid's default (or first) view `visibleFieldIds` — the
 * same list Columns uses when that view is active.
 */
export function DatagridShownFields({
  datagridId,
  fields,
}: {
  datagridId: string;
  fields: DatagridField[];
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const viewsQuery = useDatagridViews(datagridId);
  const updateView = useUpdateDatagridView(datagridId);
  const targetView = useMemo(
    () => pickCardVisibilityView(viewsQuery.data ?? []),
    [viewsQuery.data],
  );
  const config = useMemo(
    () => parseDatagridViewConfig(targetView?.config ?? null),
    [targetView?.config],
  );

  const effectiveVisible = useMemo(() => {
    const ids =
      config.visibleFieldIds.length > 0
        ? config.visibleFieldIds
        : fields.map((f) => f.id);
    return new Set(ids);
  }, [config.visibleFieldIds, fields]);

  const hiddenCount = fields.filter((f) => !effectiveVisible.has(f.id)).length;

  const persist = useCallback(
    (update: (prev: DatagridViewConfig) => DatagridViewConfig) => {
      if (!targetView) return;
      const cached = qc
        .getQueryData<DatagridView[]>(datagridViewsKey(datagridId))
        ?.find((view) => view.id === targetView.id);
      const prev = parseDatagridViewConfig(cached?.config ?? targetView.config);
      updateView.mutate({ id: targetView.id, config: update(prev) });
    },
    [datagridId, qc, targetView, updateView],
  );

  const toggle = (fieldId: string) => {
    persist((prev) => ({
      ...prev,
      visibleFieldIds: toggleVisibleFieldId(
        fields,
        prev.visibleFieldIds,
        fieldId,
      ),
    }));
  };

  if (fields.length === 0 || !targetView) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="font-sans text-xs text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
        >
          Shown on cards
          {hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ""}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5">
        <p className="px-2 py-1.5 text-xs text-muted">
          Title is always shown. Hidden fields leave gallery and embed cards.
        </p>
        <ul className="flex list-none flex-col p-0">
          {fields.map((field) => {
            const visible = effectiveVisible.has(field.id);
            return (
              <li key={field.id}>
                <button
                  type="button"
                  onClick={() => {
                    toggle(field.id);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-3.5 shrink-0 rounded-sm border",
                      visible
                        ? "border-accent bg-accent"
                        : "border-border bg-transparent",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{field.name}</span>
                  <span className="text-xs text-muted">
                    {visible ? "Shown" : "Hidden"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
