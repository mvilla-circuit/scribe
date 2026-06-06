// Outline/book chrome icons, backed by Lucide so the in-book Outline sidebar and
// page header controls share the same consistent icon set as the rest of the
// app. Thin wrappers preserve the local `{ size, className }` API (and a uniform
// stroke weight), so call sites stay unchanged.
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  List,
  MoreHorizontal,
  Plus,
  Subtitles,
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

export const ChevronRightIcon = makeIcon(ChevronRight);
export const ChevronLeftIcon = makeIcon(ChevronLeft);
export const PageIcon = makeIcon(FileText);
export const PlusIcon = makeIcon(Plus);
export const MoreIcon = makeIcon(MoreHorizontal);
export const ListIcon = makeIcon(List);
export const EyeIcon = makeIcon(Eye);
export const SubtitleIcon = makeIcon(Subtitles);
