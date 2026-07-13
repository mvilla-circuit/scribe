import type { Editor } from "@tiptap/core";

import { dataAnchorBlock } from "./data-anchor-block";
import { stringAttr } from "./data-attr";
import { DatagridRowCardView } from "./datagrid-row-card-view";

/**
 * An embedded datagrid-row card: an atom block storing `datagridId` + `rowId`
 * (plus a stale `label` fallback). Display data live-resolves via
 * {@link EditorBridge.resolveDatagridRow}; attrs alone persist in document
 * content jsonb — no FK migration.
 */
export const DatagridRowCard = dataAnchorBlock({
  name: "datagridRowCard",
  marker: "datagrid-row-card",
  attributes: () => ({
    datagridId: stringAttr("datagridId"),
    rowId: stringAttr("rowId"),
    label: stringAttr("label"),
  }),
  renderAttrs: () => ({}),
  text: (node) => (node.attrs.label as string) || "Untitled card",
  view: DatagridRowCardView,
});

/**
 * Insert a datagrid-row embed card at the current selection.
 */
export function insertDatagridRowCard(
  editor: Editor,
  attrs: {
    datagridId: string;
    rowId: string;
    label?: string | null;
  },
) {
  editor
    .chain()
    .focus()
    .insertContent({ type: "datagridRowCard", attrs })
    .run();
}
