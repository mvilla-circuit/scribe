import { Chip, StaticChip } from "@/components/ui/chip";

/** Minimal tag shape shared by editable and read-only chip surfaces. */
export interface TagChipData {
  id: string;
  name: string;
  color: string | null;
}

/**
 * Editorial shelf-label chip for a tag: a quiet swatch-washed pill matching
 * `DatagridOptionChip`, rendered as a button so it can trigger a popover (see
 * `CollectionTags`). Accepts the usual button props (`onClick`, `aria-label`,
 * …) so it composes directly as a Radix `DropdownMenuTrigger` child.
 *
 * @alias Collection-facing name for the shared `Chip` primitive.
 */
export const TagChip = Chip;

/**
 * Non-interactive rendering of a tag chip: the same swatch-washed pill as
 * `TagChip`, but a plain `<span>` for read-only display contexts (gallery
 * cover cards, list rows) where a button's click/focus semantics — and the
 * recolor/remove dropdown it triggers — don't apply.
 *
 * @alias Collection-facing name for the shared `StaticChip` primitive.
 */
export const StaticTagChip = StaticChip;
