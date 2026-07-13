import { createCallbackStore } from "./callback-store";

/** A datagrid row chosen in the "Datagrid card" picker. */
export interface DatagridRowPickTarget {
  datagridId: string;
  rowId: string;
  label: string;
}

/**
 * Imperative store backing the two-step "Datagrid card" picker. The slash item
 * calls `open(cb)`; the `<DatagridRowPicker>` rendered alongside the editor
 * shows while `callback` is set and invokes it with the chosen row.
 */
export const useDatagridRowPicker =
  createCallbackStore<DatagridRowPickTarget>();
