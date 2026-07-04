// Outline/book chrome icons, backed by Lucide so the in-book Outline sidebar and
// page header controls share the same consistent icon set as the rest of the
// app. The shared `makeIcon` factory preserves the local `{ size, className }`
// API and uniform stroke weight, so call sites stay unchanged.
import {
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileText,
  List,
  ListTree,
  Plus,
  SpellCheck,
} from "lucide-react";

import { makeIcon } from "@/lib/make-icon";

export const ChevronRightIcon = makeIcon(ChevronRight);
export const ChevronLeftIcon = makeIcon(ChevronLeft);
export const ChevronsDownUpIcon = makeIcon(ChevronsDownUp);
export const ChevronsUpDownIcon = makeIcon(ChevronsUpDown);
export const PageIcon = makeIcon(FileText);
export const PlusIcon = makeIcon(Plus);
export const ListIcon = makeIcon(List);
export const ListTreeIcon = makeIcon(ListTree);
export const SpellCheckIcon = makeIcon(SpellCheck);
