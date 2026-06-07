// Selection-toolbar and color-control icons, backed by Lucide so the editor
// chrome shares the same icon set as the rest of the app. The shared `makeIcon`
// factory preserves the local `{ size, className }` API and a uniform stroke
// weight, so call sites stay unchanged.
import {
  Ban,
  Bold,
  Book,
  Bookmark,
  ChevronDown,
  Code,
  Columns2,
  Columns3,
  Copy,
  ExternalLink,
  FileText,
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
  Palette,
  Plus,
  RefreshCw,
  Smile,
  Strikethrough,
  Table,
  TextQuote,
  Trash2,
  Type,
  Underline,
  X,
} from "lucide-react";
import { makeIcon } from "../lib/makeIcon";

export const BoldIcon = makeIcon(Bold);
export const ItalicIcon = makeIcon(Italic);
export const UnderlineIcon = makeIcon(Underline);
export const StrikeIcon = makeIcon(Strikethrough);
export const CodeIcon = makeIcon(Code);
export const LinkIcon = makeIcon(Link);
export const ChevronDownIcon = makeIcon(ChevronDown);
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
export const CodeBlockIcon = makeIcon(Code);
export const DividerIcon = makeIcon(Minus);
export const CalloutIcon = makeIcon(Info);
export const Columns2Icon = makeIcon(Columns2);
export const Columns3Icon = makeIcon(Columns3);
export const TableIcon = makeIcon(Table);
export const BookmarkIcon = makeIcon(Bookmark);
export const PageLinkIcon = makeIcon(FileText);
export const BookIcon = makeIcon(Book);

// Inline block-control icons (open / copy / refresh / add / remove / emoji).
export const ExternalLinkIcon = makeIcon(ExternalLink);
export const CopyIcon = makeIcon(Copy);
export const RefreshIcon = makeIcon(RefreshCw);
export const TrashIcon = makeIcon(Trash2);
export const PlusIcon = makeIcon(Plus);
export const CloseIcon = makeIcon(X);
export const EmojiIcon = makeIcon(Smile);
export const PaletteIcon = makeIcon(Palette);
