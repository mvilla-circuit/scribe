// Sidebar chrome icons, backed by Lucide so the Library tree and in-book Outline
// share one consistent, professionally drawn icon set. The shared `makeIcon`
// factory preserves the local `{ size, className }` API and uniform stroke
// weight, so call sites stay unchanged.
import {
  Book,
  BookPlus,
  Copy,
  CornerUpLeft,
  Folder,
  FolderOpen,
  FolderPlus,
  Library,
  Link,
  Pencil,
  Plus,
  Table2,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { makeIcon } from "@/lib/make-icon";

export const FolderIcon = makeIcon(Folder);
export const FolderOpenIcon = makeIcon(FolderOpen);
export const BookIcon = makeIcon(Book);
export const CollectionIcon = makeIcon(Library);
export const DatagridIcon = makeIcon(Table2);
export const PlusIcon = makeIcon(Plus);
export const PencilIcon = makeIcon(Pencil);
export const TrashIcon = makeIcon(Trash2);
export const DuplicateIcon = makeIcon(Copy);
export const FolderPlusIcon = makeIcon(FolderPlus);
export const CollectionPlusIcon = makeIcon(Library);
export const BookPlusIcon = makeIcon(BookPlus);
export const LinkIcon = makeIcon(Link);
export const RemoveFromCollectionIcon = makeIcon(CornerUpLeft);
export const AlertIcon = makeIcon(TriangleAlert);
