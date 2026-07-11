import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DatagridField, DatagridViewConfig } from "@/lib/datagrid-schema";

import { DatagridToolbarMenu } from "./datagrid-toolbar-menu";

interface DatagridPageToolbarProps {
  config: DatagridViewConfig;
  fields: DatagridField[];
  onChangeConfig: (
    update: (prev: DatagridViewConfig) => DatagridViewConfig,
  ) => void;
  onCreateRow: () => void;
  onOpenExport: () => void;
  onOpenFields: () => void;
  onOpenImport: () => void;
  onQueryChange: (query: string) => void;
  query: string;
}

export function DatagridPageToolbar({
  config,
  fields,
  onChangeConfig,
  onCreateRow,
  onOpenExport,
  onOpenFields,
  onOpenImport,
  onQueryChange,
  query,
}: DatagridPageToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex min-w-44 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-muted focus-within:ring-2 focus-within:ring-ring">
        <input
          type="search"
          aria-label="Search rows"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
          placeholder="Search"
          className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
        />
      </label>

      <DatagridToolbarMenu
        fields={fields}
        config={config}
        onChange={onChangeConfig}
        onOpenFields={onOpenFields}
        onImportCsv={onOpenImport}
        onExportCsv={onOpenExport}
      />

      <Button variant="primary" onClick={onCreateRow}>
        <Plus className="size-4" aria-hidden="true" />
        New
      </Button>
    </div>
  );
}
