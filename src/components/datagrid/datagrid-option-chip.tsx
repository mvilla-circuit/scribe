import { StaticChip } from "@/components/ui/chip";
import type { DatagridSelectOption } from "@/lib/datagrid-schema";

/** Quiet swatch-washed chip matching table select/status display. */
export function DatagridOptionChip({
  option,
  className,
}: {
  option: DatagridSelectOption;
  className?: string;
}) {
  return (
    <StaticChip name={option.name} color={option.color} className={className} />
  );
}
