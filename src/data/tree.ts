import type { Book } from "./books";
import type { Collection } from "./collections";
import type { EntryMeta } from "./entries";
import type { Folder } from "./folders";
import { byPosition } from "./ordering";

/**
 * Sentinel container id for the sidebar's top level — the bucket that holds
 * folders, collections, and books with no parent, keyed alongside real folder
 * and collection ids in the {@link TreeModel}.
 */
export const ROOT = "__root__";

/**
 * A child of a container (a folder, a collection, or the root), tagged by kind.
 * Folders, collections, and books share one ordered list per container, sorted
 * by `position`. The position columns live in different tables but share the
 * same numeric scale, so we can interleave them freely -- position is purely a
 * sort key here.
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
      kind: "collection";
      id: string;
      position: number;
      created_at: string;
      collection: Collection;
    }
  | {
      kind: "book";
      id: string;
      position: number;
      created_at: string;
      book: Book;
    }
  | {
      kind: "entry";
      id: string;
      position: number;
      created_at: string;
      entry: EntryMeta;
    };

/** The sidebar tree: a map from container id (folder/collection id or ROOT) to its children. */
export interface TreeModel {
  // container id (folder id, collection id, or ROOT) -> ordered children
  children: Map<string, TreeChild[]>;
}

/**
 * Builds the sidebar tree model by bucketing folders, collections, and books
 * under their container. A book's container is `collection_id`, else `folder_id`,
 * else the root (the three are mutually exclusive in the UI); a collection's
 * container is its `parent_collection_id`, else the root.
 */
export function buildTree(
  folders: Folder[],
  books: Book[],
  collections: Collection[] = [],
  entries: EntryMeta[] = [],
): TreeModel {
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
  for (const c of collections) {
    push(c.parent_collection_id ?? ROOT, {
      kind: "collection",
      id: c.id,
      position: c.position,
      created_at: c.created_at,
      collection: c,
    });
  }
  for (const b of books) {
    push(b.collection_id ?? b.folder_id ?? ROOT, {
      kind: "book",
      id: b.id,
      position: b.position,
      created_at: b.created_at,
      book: b,
    });
  }
  for (const e of entries) {
    push(e.collection_id, {
      kind: "entry",
      id: e.id,
      position: e.position,
      created_at: e.created_at,
      entry: e,
    });
  }

  for (const list of children.values()) list.sort(byPosition);
  return { children };
}

/** The ordered children directly inside a container (folder, collection, or ROOT). */
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

/**
 * Number of direct children (books + child collections) inside a container.
 * Used to describe what a collection delete will reparent to the top level —
 * only direct children move; deeper descendants stay with their surviving
 * parent (the `ON DELETE SET NULL` FKs null one level).
 */
export function countChildren(model: TreeModel, containerId: string): number {
  return childrenOf(model, containerId).length;
}

/**
 * The ancestor chain of a collection, root-first and excluding the collection
 * itself, walking `parent_collection_id`. Guards against a malformed cycle so a
 * corrupted chain can never loop forever (defensive; the DB trigger blocks
 * cycles at write time).
 */
export function collectionAncestors(
  collections: Collection[],
  collectionId: string,
): Collection[] {
  const byId = new Map(collections.map((c) => [c.id, c]));
  const chain: Collection[] = [];
  const guard = new Set<string>();
  let parentId = byId.get(collectionId)?.parent_collection_id ?? null;
  while (parentId && !guard.has(parentId)) {
    guard.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    chain.unshift(parent);
    parentId = parent.parent_collection_id;
  }
  return chain;
}

/**
 * The set of collection ids nested (at any depth) under `collectionId`,
 * excluding the collection itself. Used to keep a "move into collection" menu
 * cycle-safe — a collection can't move into itself or one of its descendants.
 */
export function collectionDescendants(
  collections: Collection[],
  collectionId: string,
): Set<string> {
  const byParent = new Map<string, string[]>();
  for (const c of collections) {
    if (!c.parent_collection_id) continue;
    const siblings = byParent.get(c.parent_collection_id) ?? [];
    siblings.push(c.id);
    byParent.set(c.parent_collection_id, siblings);
  }
  const out = new Set<string>();
  const stack = [collectionId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined) break;
    for (const child of byParent.get(id) ?? []) {
      if (!out.has(child)) {
        out.add(child);
        stack.push(child);
      }
    }
  }
  return out;
}
