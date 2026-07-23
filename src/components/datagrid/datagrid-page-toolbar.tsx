import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import type { DatagridField, DatagridViewConfig } from "@/lib/datagrid-schema";

import { DatagridToolbarMenu } from "./datagrid-toolbar-menu";

interface DatagridPageToolbarProps {
  config: DatagridViewConfig;
  fields: DatagridField[];
  layoutEnabled?: boolean;
  onChangeConfig: (
    update: (prev: DatagridViewConfig) => DatagridViewConfig,
  ) => void;
  onCreateRow: () => void;
  onCreateView: () => void;
  onOpenExport: () => void;
  onOpenFields: () => void;
  onOpenImport: () => void;
  onQueryChange: (query: string) => void;
  query: string;
}

export function DatagridPageToolbar({
  config,
  fields,
  layoutEnabled = true,
  onChangeConfig,
  onCreateRow,
  onCreateView,
  onOpenExport,
  onOpenFields,
  onOpenImport,
  onQueryChange,
  query,
}: DatagridPageToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchField
        label="Search rows"
        value={query}
        onChange={onQueryChange}
        className="min-w-44"
      />

      <DatagridToolbarMenu
        fields={fields}
        config={config}
        layoutEnabled={layoutEnabled}
        onChange={onChangeConfig}
        onCreateView={onCreateView}
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
