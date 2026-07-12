/**
 * Morandi swatch helpers for datagrid select/status options.
 *
 * Re-exported from `@/lib/swatches` so the data layer and collection tags can
 * share the same palette without importing from `components/`.
 */
/**
 * @lintignore Re-exported for existing callers; not imported by this name
 * from this shim today.
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
