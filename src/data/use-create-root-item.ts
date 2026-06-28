import { useBooks, useCreateBook } from "./books";
import { useCreateFolder, useFolders } from "./folders";
import { endPositionFor } from "./ordering";
import { buildTree, childrenOf, ROOT } from "./tree";

/** Creates a top-level book or folder, returning its new id. */
export interface CreateRootItem {
  /** Append a new "Untitled" book at the root; returns its id. */
  createBook: () => string;
  /** Append a new "New folder" at the root; returns its id. */
  createFolder: () => string;
}

/**
 * Encapsulates the "add a new item to the top level" policy — fresh id, default
 * title, and a position past the last root-level sibling (books and folders
 * interleave, so it walks the same tree model the sidebar renders). Callers
 * decide what to do with the returned id (select it, start a rename, ...).
 */
export function useCreateRootItem(): CreateRootItem {
  const { data: books } = useBooks();
  const { data: folders } = useFolders();
  const createBook = useCreateBook();
  const createFolder = useCreateFolder();

  const rootPosition = () =>
    endPositionFor(childrenOf(buildTree(folders ?? [], books ?? []), ROOT));

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
  };
}
