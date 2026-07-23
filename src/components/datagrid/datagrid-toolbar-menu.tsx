import {
  Columns3,
  Download,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  SlidersHorizontal,
  Table2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import type {
  DatagridField,
  DatagridLayout,
  DatagridViewConfig,
} from "@/lib/datagrid-schema";
import { cn } from "@/lib/utils";

import { DatagridViewControls } from "./datagrid-view-controls";

const LAYOUT_OPTIONS: {
  value: DatagridLayout;
  label: string;
  Icon: typeof Table2;
}[] = [
  { value: "table", label: "Table", Icon: Table2 },
  { value: "gallery", label: "Gallery", Icon: LayoutGrid },
  { value: "board", label: "Board", Icon: Columns3 },
];

interface DatagridToolbarMenuProps {
  fields: DatagridField[];
  config: DatagridViewConfig;
  onChange: (update: (prev: DatagridViewConfig) => DatagridViewConfig) => void;
  onCreateView: () => void;
  onOpenFields: () => void;
  onImportCsv: () => void;
  onExportCsv: () => void;
  /** When false, Layout is disabled (persistConfig no-ops without a view). */
  layoutEnabled?: boolean;
}

/**
 * Overflow menu for datagrid view chrome: create view, filter/sort/group/
 * columns, layout, fields manager, and CSV import/export. Keeps the toolbar
 * to search + New.
 */
export function DatagridToolbarMenu({
  fields,
  config,
  onChange,
  onCreateView,
  onOpenFields,
  onImportCsv,
  onExportCsv,
  layoutEnabled = true,
}: DatagridToolbarMenuProps) {
  const setLayout = (layout: DatagridLayout) => {
    onChange((prev) => ({ ...prev, layout }));
  };

  return (
    <DropdownMenu>
      <Tooltip content="View options">
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" aria-label="View options">
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem onSelect={onCreateView}>
          <Plus className="size-4" aria-hidden="true" />
          New view
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DatagridViewControls
          fields={fields}
          config={config}
          onChange={onChange}
        />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={!layoutEnabled}>
            <Table2 className="size-4" aria-hidden="true" />
            Layout
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {LAYOUT_OPTIONS.map(({ value, label, Icon }) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => {
                  setLayout(value);
                }}
                className={cn(config.layout === value && "text-accent")}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={onOpenFields}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Fields
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onImportCsv}>
          <Upload className="size-4" aria-hidden="true" />
          Import CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onExportCsv}>
          <Download className="size-4" aria-hidden="true" />
          Export CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
