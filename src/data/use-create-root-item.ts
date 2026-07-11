import { useBooks, useCreateBook } from "./books";
import { useCollections, useCreateCollection } from "./collections";
import { useCreateFolder, useFolders } from "./folders";
import { endPositionFor } from "./ordering";
import { buildTree, childrenOf, ROOT } from "./tree";

/** Creates a top-level book, folder, or collection, returning its new id. */
export interface CreateRootItem {
  /** Append a new "Untitled" book at the root; returns its id. */
  createBook: () => string;
  /** Append a new "New folder" at the root; returns its id. */
  createFolder: () => string;
  /** Append a new "Untitled" collection at the root; returns its id. */
  createCollection: () => string;
}

/**
 * Encapsulates the "add a new item to the top level" policy — fresh id, default
 * title, and a position past the last root-level sibling (books, folders, and
 * collections interleave, so it walks the same tree model the sidebar renders).
 * Callers decide what to do with the returned id (select it, start a rename, ...).
 */
export function useCreateRootItem(): CreateRootItem {
  const { data: books } = useBooks();
  const { data: folders } = useFolders();
  const { data: collections } = useCollections();
  const createBook = useCreateBook();
  const createFolder = useCreateFolder();
  const createCollection = useCreateCollection();

  const rootPosition = () =>
    endPositionFor(
      childrenOf(
        buildTree(folders ?? [], books ?? [], collections ?? []),
        ROOT,
      ),
    );

  return {
    createBook: () => {
      const id = crypto.randomUUID();
      createBook.mutate({
        id,
        title: "Untitled",
        folder_id: null,
        position: rootPosition(),
      });
      return id;
    },
    createFolder: () => {
      const id = crypto.randomUUID();
      createFolder.mutate({
        id,
        name: "New folder",
        parent_folder_id: null,
        position: rootPosition(),
      });
      return id;
    },
    createCollection: () => {
      const id = crypto.randomUUID();
      createCollection.mutate({
        id,
        name: "Untitled",
        parent_collection_id: null,
        position: rootPosition(),
      });
      return id;
    },
  };
}
