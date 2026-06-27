// Sidebar chrome icons, backed by Lucide so the Library tree and in-book Outline
// share one consistent, professionally drawn icon set. The shared `makeIcon`
// factory preserves the local `{ size, className }` API and uniform stroke
// weight, so call sites stay unchanged.
import {
  Book,
  BookPlus,
  Copy,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { makeIcon } from "@/lib/makeIcon";

export const FolderIcon = makeIcon(Folder);
export const FolderOpenIcon = makeIcon(FolderOpen);
export const BookIcon = makeIcon(Book);
export const PlusIcon = makeIcon(Plus);
export const PencilIcon = makeIcon(Pencil);
export const TrashIcon = makeIcon(Trash2);
export const DuplicateIcon = makeIcon(Copy);
export const FolderPlusIcon = makeIcon(FolderPlus);
export const BookPlusIcon = makeIcon(BookPlus);
