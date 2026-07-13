// Selection-toolbar and color-control icons, backed by Lucide so the editor
// chrome shares the same icon set as the rest of the app. The shared `makeIcon`
// factory preserves the local `{ size, className }` API and a uniform stroke
// weight, so call sites stay unchanged.
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Ban,
  Bold,
  Book,
  Bookmark,
  Captions,
  Check,
  ChevronDown,
  ClipboardCopy,
  Code,
  Columns2,
  Columns3,
  Copy,
  ExternalLink,
  FileText,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Info,
  Italic,
  Link,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  MoveHorizontal,
  PaintBucket,
  Palette,
  PanelLeft,
  PanelTop,
  Pencil,
  Plus,
  Quote,
  RefreshCw,
  Rows3,
  ScrollText,
  Smile,
  Strikethrough,
  Table,
  Table2,
  TableCellsMerge,
  TableCellsSplit,
  TextQuote,
  Trash2,
  Type,
  Underline,
  X,
} from "lucide-react";

import { makeIcon } from "@/lib/make-icon";

export const BoldIcon = makeIcon(Bold);
export const ItalicIcon = makeIcon(Italic);
export const UnderlineIcon = makeIcon(Underline);
export const StrikeIcon = makeIcon(Strikethrough);
export const CodeIcon = makeIcon(Code);
export const LinkIcon = makeIcon(Link);
export const ChevronDownIcon = makeIcon(ChevronDown);
export const CheckIcon = makeIcon(Check);
// "No color" / clear: a slashed circle reads as the absence of a tint.
export const NoColorIcon = makeIcon(Ban);

// Slash-menu + block icons. Kept here so the editor chrome shares one icon set.
export const TextIcon = makeIcon(Type);
export const Heading1Icon = makeIcon(Heading1);
export const Heading2Icon = makeIcon(Heading2);
export const Heading3Icon = makeIcon(Heading3);
export const BulletListIcon = makeIcon(List);
export const OrderedListIcon = makeIcon(ListOrdered);
export const TaskListIcon = makeIcon(ListTodo);
export const QuoteIcon = makeIcon(TextQuote);
// Pull quote uses the filled quotation-mark glyph to distinguish it from the
// rule-based block/accent quotes (which share the TextQuote icon).
export const PullQuoteIcon = makeIcon(Quote);
// Toggles the quote's optional attribution/citation line.
export const AttributionIcon = makeIcon(Captions);
export const CodeBlockIcon = makeIcon(Code);
export const DividerIcon = makeIcon(Minus);
export const CalloutIcon = makeIcon(Info);
// Essay: a long-form titled section, evoked by a written scroll.
export const EssayIcon = makeIcon(ScrollText);
export const Columns2Icon = makeIcon(Columns2);
export const Columns3Icon = makeIcon(Columns3);
export const TableIcon = makeIcon(Table);
export const BookmarkIcon = makeIcon(Bookmark);
export const PageLinkIcon = makeIcon(FileText);
export const BookIcon = makeIcon(Book);
export const DatagridCardIcon = makeIcon(Table2);

// Inline block-control icons (open / copy / refresh / add / remove / emoji).
export const ExternalLinkIcon = makeIcon(ExternalLink);
export const CopyIcon = makeIcon(Copy);
export const CopyToClipboardIcon = makeIcon(ClipboardCopy);
export const RefreshIcon = makeIcon(RefreshCw);
export const PencilIcon = makeIcon(Pencil);
export const TrashIcon = makeIcon(Trash2);
export const PlusIcon = makeIcon(Plus);
export const MinusIcon = makeIcon(Minus);
// Reset table columns to fill the content column (clears manual colwidths).
export const FitWidthIcon = makeIcon(MoveHorizontal);
// Table header toggles: a highlighted top panel = header row, left = header column.
export const HeaderRowIcon = makeIcon(PanelTop);
export const HeaderColumnIcon = makeIcon(PanelLeft);
// Table border toggles: stacked rows show the horizontal (between-row) gridlines,
// stacked columns show the vertical (between-column) gridlines.
export const RowBordersIcon = makeIcon(Rows3);
export const ColumnBordersIcon = makeIcon(Columns3);
// Cell merge/split: combine the selected cells into one, or break a merged cell apart.
export const MergeCellsIcon = makeIcon(TableCellsMerge);
export const SplitCellIcon = makeIcon(TableCellsSplit);
// Horizontal text alignment for the selected cells.
export const AlignLeftIcon = makeIcon(AlignLeft);
export const AlignCenterIcon = makeIcon(AlignCenter);
export const AlignRightIcon = makeIcon(AlignRight);
// Vertical alignment for the selected cells' content (top / middle / bottom).
export const AlignTopIcon = makeIcon(AlignVerticalJustifyStart);
export const AlignMiddleIcon = makeIcon(AlignVerticalJustifyCenter);
export const AlignBottomIcon = makeIcon(AlignVerticalJustifyEnd);
export const CloseIcon = makeIcon(X);
export const EmojiIcon = makeIcon(Smile);
export const PaletteIcon = makeIcon(Palette);
// Cell fill: a paint bucket distinguishes the per-cell fill control from the
// table header-color palette button sitting beside it.
export const FillIcon = makeIcon(PaintBucket);
// Block gutter drag handle (Notion-style grip).
export const DragHandleIcon = makeIcon(GripVertical);
