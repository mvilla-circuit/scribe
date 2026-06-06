// Sidebar chrome icons, backed by Lucide so the Library tree and in-book Outline
// share one consistent, professionally drawn icon set. Thin wrappers preserve
// the local `{ size, className }` API (and a uniform stroke weight) used across
// the sidebar, so call sites stay unchanged.
import {
  Book,
  BookPlus,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  type LucideProps,
} from "lucide-react";

type IconProps = { className?: string; size?: number };

// Slightly lighter than Lucide's default 2px stroke to match the app's refined,
// low-weight aesthetic.
const STROKE_WIDTH = 1.75;

function makeIcon(Component: React.ComponentType<LucideProps>) {
  return function Icon({ className, size = 16 }: IconProps) {
    return (
      <Component
        size={size}
        className={className}
        strokeWidth={STROKE_WIDTH}
        aria-hidden
      />
    );
  };
}

export const FolderIcon = makeIcon(Folder);
export const FolderOpenIcon = makeIcon(FolderOpen);
export const BookIcon = makeIcon(Book);
export const PlusIcon = makeIcon(Plus);
export const MoreIcon = makeIcon(MoreHorizontal);
export const PencilIcon = makeIcon(Pencil);
export const TrashIcon = makeIcon(Trash2);
export const FolderPlusIcon = makeIcon(FolderPlus);
export const BookPlusIcon = makeIcon(BookPlus);
