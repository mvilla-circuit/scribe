import type { Book } from "./books";
import type { Folder } from "./folders";
import { byPosition } from "./ordering";

/**
 * Sentinel container id for the sidebar's top level — the bucket that holds
 * folders and books with no parent, keyed alongside real folder ids in the
 * {@link TreeModel}.
 */
export const ROOT = "__root__";

/**
 * A child of a container (a folder or the root), tagged by kind. Folders and
 * books share one ordered list per container, sorted by `position`. The two DB
 * position columns live in different tables but share the same numeric scale,
 * so we can interleave them freely -- position is purely a sort key here.
 */
export type TreeChild =
  | {
      kind: "folder";
      id: string;
      position: number;
      created_at: string;
      folder: Folder;
    }
  | {
      kind: "book";
      id: string;
      position: number;
      created_at: string;
      book: Book;
    };

/** The sidebar tree: a map from container id (folder id or ROOT) to its children. */
export interface TreeModel {
  // container id (folder id or ROOT) -> ordered children (folders + books)
  children: Map<string, TreeChild[]>;
}

/** Builds the sidebar tree model by bucketing folders and books under their container. */
export function buildTree(folders: Folder[], books: Book[]): TreeModel {
  const children = new Map<string, TreeChild[]>();
  const push = (key: string, child: TreeChild) => {
    const list = children.get(key) ?? [];
    list.push(child);
    children.set(key, list);
  };

  for (const f of folders) {
    push(f.parent_folder_id ?? ROOT, {
      kind: "folder",
      id: f.id,
      position: f.position,
      created_at: f.created_at,
      folder: f,
    });
  }
  for (const b of books) {
    push(b.folder_id ?? ROOT, {
      kind: "book",
      id: b.id,
      position: b.position,
      created_at: b.created_at,
      book: b,
    });
  }

  for (const list of children.values()) list.sort(byPosition);
  return { children };
}

/** The ordered children (folders + books) directly inside a container. */
export function childrenOf(model: TreeModel, containerId: string): TreeChild[] {
  return model.children.get(containerId) ?? [];
}

/**
 * Number of books directly inside a folder. Folders only ever live at the root
 * and contain books (no nested folders), so a direct count is exact.
 */
export function countBooksInFolder(model: TreeModel, folderId: string): number {
  let total = 0;
  for (const child of childrenOf(model, folderId)) {
    if (child.kind === "book") total += 1;
  }
  return total;
}
