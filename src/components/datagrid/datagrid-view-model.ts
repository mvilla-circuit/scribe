import type { DatagridQueryRow } from "@/lib/datagrid-query";

/**
 * A query row enriched with the display-only chrome (icon, cover) the gallery
 * and board layouts render but the pure query engine doesn't need. Built by the
 * page container from a row's metadata and passed to the card-based views.
 */
export interface DatagridDisplayRow extends DatagridQueryRow {
  icon: string | null;
  cover_url: string | null;
}
