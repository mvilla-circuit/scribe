import {
  NodeViewContent,
  type NodeViewProps,
  NodeViewWrapper,
} from "@tiptap/react";
import { useState } from "react";

import { DocumentIcon } from "../../components/ui/DocumentIcon";
import { IconPicker } from "../../components/ui/IconPicker";
import { Tooltip } from "../../components/ui/Tooltip";
import { BlockColorPopover } from "../BlockColorPopover";
import { EmojiIcon } from "../icons";
import { CALLOUT_COLORS } from "../palette";

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
              onSelect={(next) => {
                updateAttributes({ icon: next });
              }}
              onRemove={() => {
                updateAttributes({ icon: null });
              }}
            >
              <Tooltip content="Change icon">
                <button
                  type="button"
                  aria-label="Change callout icon"
                  className="scribe-callout-emoji-btn"
                >
                  <DocumentIcon icon={icon} size={18} />
                </button>
              </Tooltip>
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
            onSelect={(next) => {
              updateAttributes({ icon: next });
            }}
            onRemove={() => {
              updateAttributes({ icon: null });
            }}
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

          <BlockColorPopover
            swatches={CALLOUT_COLORS}
            value={color}
            onChange={(value) => {
              updateAttributes({ color: value });
            }}
            open={colorOpen}
            onOpenChange={setColorOpen}
            label="Background"
            clearLabel="No color"
            triggerLabel="Background color"
            triggerAriaLabel="Callout background color"
          />
        </div>
      )}
    </NodeViewWrapper>
  );
}
