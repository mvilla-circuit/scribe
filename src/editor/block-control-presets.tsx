import { IconPicker } from "@/components/ui/icon-picker";
import { Tooltip } from "@/components/ui/tooltip";
import { BlockColorPopover } from "@/editor/block-color-popover";
import { EmojiIcon } from "@/editor/icons";
import { QUOTE_ACCENTS } from "@/editor/palette";

// Presets for the controls that recur across the framed block node views
// (callout, quote, essay): a hover/focus cluster's icon button and the accent
// swatch popover. Each bakes in the shared markup/labels so the views declare
// only the bits that differ (the block's noun, the bound value, and setters).

/**
 * The icon button in a block's control cluster: opens the shared icon picker and
 * writes the chosen glyph/emoji/upload back, or clears it. `noun` names the
 * block in the accessible label, e.g. "callout" → "Add/Change callout icon".
 */
export function BlockIconControl({
  noun,
  icon,
  onSelect,
  onRemove,
}: {
  noun: string;
  icon: string | null;
  onSelect: (icon: string) => void;
  onRemove: () => void;
}) {
  return (
    <IconPicker
      value={icon}
      onSelect={onSelect}
      onRemove={onRemove}
      align="end"
    >
      <Tooltip content={icon ? "Change icon" : "Add icon"}>
        <button
          type="button"
          aria-label={icon ? `Change ${noun} icon` : `Add ${noun} icon`}
          className="scribe-block-btn"
        >
          <EmojiIcon size={15} />
        </button>
      </Tooltip>
    </IconPicker>
  );
}

/**
 * The accent-color popover shared by the quote and essay views: a
 * {@link BlockColorPopover} preconfigured with the accent swatches and the
 * "Accent" / "Default accent" labels. The trigger labels still vary per block.
 */
export function AccentColorPopover({
  color,
  onChange,
  open,
  onOpenChange,
  triggerLabel,
  triggerAriaLabel,
}: {
  color: string | null;
  onChange: (value: string | null) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel: string;
  triggerAriaLabel: string;
}) {
  return (
    <BlockColorPopover
      swatches={QUOTE_ACCENTS}
      value={color}
      onChange={onChange}
      open={open}
      onOpenChange={onOpenChange}
      label="Accent"
      clearLabel="Default accent"
      triggerLabel={triggerLabel}
      triggerAriaLabel={triggerAriaLabel}
    />
  );
}
