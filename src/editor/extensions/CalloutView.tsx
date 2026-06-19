import { useState } from "react";
import * as RPopover from "@radix-ui/react-popover";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { cn } from "../../lib/utils";
import { Tooltip } from "../../components/ui/Tooltip";
import { IconPicker } from "../../components/ui/IconPicker";
import { DocumentIcon } from "../../components/ui/DocumentIcon";
import { CALLOUT_COLORS } from "../palette";
import { EmojiIcon, NoColorIcon, PaletteIcon } from "../icons";

// The callout's writing surface: a tinted box with an optional leading icon and
// a quiet control cluster in the top-right that fades in on hover/focus. The
// leading icon (when present) and the cluster's icon button both open the same
// icon picker pages use (Lucide glyphs, emoji, uploads); the cluster's palette
// button opens the background-color swatches. Every control only ever writes
// `icon`/`color` back onto the node via updateAttributes, so edits persist.
// Removing the icon stores `null`, which drops the leading column entirely so
// the body sits flush-left with no reserved padding.
export function CalloutView({ node, updateAttributes, editor }: NodeViewProps) {
  const color = (node.attrs.color as string | null) || null;
  const icon = (node.attrs.icon as string | null) || null;
  const editable = editor.isEditable;

  const [colorOpen, setColorOpen] = useState(false);

  return (
    <NodeViewWrapper
      className="scribe-callout group/callout"
      data-callout=""
      style={color ? { background: color } : undefined}
    >
      {icon && (
        <div className="scribe-callout-emoji" contentEditable={false}>
          {editable ? (
            <IconPicker
              value={icon}
              onSelect={(next) => updateAttributes({ icon: next })}
              onRemove={() => updateAttributes({ icon: null })}
            >
              <button
                type="button"
                aria-label="Change callout icon"
                className="scribe-callout-emoji-btn"
              >
                <DocumentIcon icon={icon} size={18} />
              </button>
            </IconPicker>
          ) : (
            <span className="scribe-callout-emoji-btn" aria-hidden>
              <DocumentIcon icon={icon} size={18} />
            </span>
          )}
        </div>
      )}

      <NodeViewContent className="scribe-callout-body" />

      {editable && (
        <div
          className="scribe-block-controls scribe-callout-controls"
          contentEditable={false}
          data-open={colorOpen || undefined}
        >
          <IconPicker
            value={icon}
            onSelect={(next) => updateAttributes({ icon: next })}
            onRemove={() => updateAttributes({ icon: null })}
            align="end"
          >
            <Tooltip content={icon ? "Change icon" : "Add icon"}>
              <button
                type="button"
                aria-label={icon ? "Change callout icon" : "Add callout icon"}
                className="scribe-block-btn"
              >
                <EmojiIcon size={15} />
              </button>
            </Tooltip>
          </IconPicker>

          <RPopover.Root open={colorOpen} onOpenChange={setColorOpen}>
            <Tooltip content="Background color">
              <RPopover.Trigger asChild>
                <button
                  type="button"
                  aria-label="Callout background color"
                  className="scribe-block-btn"
                >
                  <PaletteIcon size={15} />
                </button>
              </RPopover.Trigger>
            </Tooltip>
            <RPopover.Portal>
              <RPopover.Content
                align="end"
                sideOffset={6}
                className="scribe-pop z-50 w-[15rem] rounded-lg border border-border bg-elevated p-3 text-text shadow-popover outline-none"
              >
                <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.07em] text-muted">
                  Background
                </div>
                <div className="flex flex-wrap gap-2">
                  <Tooltip content="No color">
                    <button
                      type="button"
                      aria-label="No color"
                      aria-pressed={!color}
                      onClick={() => updateAttributes({ color: null })}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-muted outline-none transition-all duration-150",
                        "focus-visible:ring-2 focus-visible:ring-ring",
                        !color
                          ? "ring-2 ring-ring ring-offset-2 ring-offset-elevated"
                          : "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] hover:scale-110 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
                      )}
                    >
                      <NoColorIcon size={16} />
                    </button>
                  </Tooltip>
                  {CALLOUT_COLORS.map((s) => {
                    const active = color === s.value;
                    return (
                      <Tooltip key={s.value} content={s.name}>
                        <button
                          type="button"
                          aria-label={s.name}
                          aria-pressed={active}
                          onClick={() => updateAttributes({ color: s.value })}
                          className={cn(
                            "h-6 w-6 rounded-full outline-none transition-all duration-150",
                            "focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "ring-2 ring-ring ring-offset-2 ring-offset-elevated"
                              : "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] hover:scale-110 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
                          )}
                          style={{ background: s.value }}
                        />
                      </Tooltip>
                    );
                  })}
                </div>
              </RPopover.Content>
            </RPopover.Portal>
          </RPopover.Root>
        </div>
      )}
    </NodeViewWrapper>
  );
}
