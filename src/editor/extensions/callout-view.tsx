import {
  NodeViewContent,
  type NodeViewProps,
  NodeViewWrapper,
} from "@tiptap/react";
import { useState } from "react";

import { DocumentIcon } from "@/components/ui/document-icon";
import { IconPicker } from "@/components/ui/icon-picker";
import { Tooltip } from "@/components/ui/tooltip";
import { BlockColorPopover } from "@/editor/block-color-popover";
import { BlockIconControl } from "@/editor/block-control-presets";
import { BlockControls } from "@/editor/block-controls";
import { CALLOUT_COLORS } from "@/editor/palette";

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
        <BlockControls className="scribe-callout-controls" open={colorOpen}>
          <BlockIconControl
            noun="callout"
            icon={icon}
            onSelect={(next) => {
              updateAttributes({ icon: next });
            }}
            onRemove={() => {
              updateAttributes({ icon: null });
            }}
          />

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
        </BlockControls>
      )}
    </NodeViewWrapper>
  );
}
