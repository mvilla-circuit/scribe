/**
 * Compatibility re-exports of `@/lib/swatches` for datagrid call sites.
 * Prefer importing from `@/lib/swatches` in new code (data layer must).
 *
 * @lintignore `DatagridSwatch` is re-exported for existing callers; not
 * imported by this name from this shim today.
 */
export type { DatagridSwatch } from "@/lib/swatches";
export {
  DATAGRID_SWATCHES,
  DEFAULT_SWATCH,
  isDatagridSwatch,
  swatchChipStyle,
  swatchDotStyle,
  swatchForIndex,
} from "@/lib/swatches";
