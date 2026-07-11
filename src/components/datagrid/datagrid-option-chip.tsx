import type { DatagridSelectOption } from "@/lib/datagrid-schema";
import { cn } from "@/lib/utils";

import { swatchChipStyle } from "./datagrid-colors";

/** Shared classes for quiet select/status option chips. */
const CHIP_CLASS =
  "inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium";

/** Quiet swatch-washed chip matching table select/status display. */
export function DatagridOptionChip({
  option,
  className,
}: {
  option: DatagridSelectOption;
  className?: string;
}) {
  return (
    <span
      style={swatchChipStyle(option.color)}
      className={cn(CHIP_CLASS, className)}
    >
      {option.name}
    </span>
  );
}
