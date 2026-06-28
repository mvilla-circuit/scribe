import {
  NodeViewContent,
  type NodeViewProps,
  NodeViewWrapper,
} from "@tiptap/react";
import { type CSSProperties, useState } from "react";

import { EditableText } from "@/components/book/editable-text";
import { DocumentIcon } from "@/components/ui/document-icon";
import { IconPicker } from "@/components/ui/icon-picker";
import { SubtitleToggle } from "@/components/ui/subtitle-toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { BlockColorPopover } from "@/editor/block-color-popover";
import { BlockControls } from "@/editor/block-controls";
import { EmojiIcon } from "@/editor/icons";
import { QUOTE_ACCENTS } from "@/editor/palette";

// The essay's writing surface: a long-form section framed top and bottom by
// horizontal accent rules, with the whole thing (a header of optional icon +
// title + optional subtitle, then the rich body) living between the two lines.
// The header fields are plain-text node attributes edited through the shared
// auto-growing `EditableText` field; the `block+` body lives in NodeViewContent.
// A quiet control cluster fades in on hover/focus with an icon button and an
// accent palette. Every control writes back via updateAttributes, so edits
// persist with the document; the accent color flows through `--essay-accent` so
// the rules retint from one swatch.
export function EssayView({ node, updateAttributes, editor }: NodeViewProps) {
  const title = (node.attrs.title as string) || "";
  const titleItalic = Boolean(node.attrs.titleItalic);
  const subtitle = (node.attrs.subtitle as string) || "";
  const subtitleItalic = Boolean(node.attrs.subtitleItalic);
  const showSubtitle = Boolean(node.attrs.showSubtitle);
  const icon = (node.attrs.icon as string | null) || null;
  const color = (node.attrs.color as string | null) || null;
  const editable = editor.isEditable;

  const [colorOpen, setColorOpen] = useState(false);

  const wrapperStyle: CSSProperties | undefined = color
    ? { "--essay-accent": color }
    : undefined;

  // When not editable an entirely empty header would render as dead space, so
  // only show it when there's something to display. While editing it always
  // shows so the writer can fill in the title/subtitle.
  const showHeader =
    editable || Boolean(icon || title || (showSubtitle && subtitle));

  return (
    <NodeViewWrapper
      className="scribe-essay group/essay"
      data-essay=""
      style={wrapperStyle}
    >
      {showHeader && (
        <div className="scribe-essay-header" contentEditable={false}>
          {icon && (
            <div className="scribe-essay-icon">
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
                      aria-label="Change essay icon"
                      className="scribe-essay-icon-btn"
                    >
                      <DocumentIcon icon={icon} size={34} />
                    </button>
                  </Tooltip>
                </IconPicker>
              ) : (
                <span className="scribe-essay-icon-btn" aria-hidden>
                  <DocumentIcon icon={icon} size={34} />
                </span>
              )}
            </div>
          )}

          <div className="scribe-essay-heading">
            {editable ? (
              <EditableText
                className="scribe-essay-title"
                value={title}
                placeholder="Title"
                ariaLabel="Essay title"
                allowEmpty
                style={{ fontStyle: titleItalic ? "italic" : "normal" }}
                onToggleItalic={() => {
                  updateAttributes({ titleItalic: !titleItalic });
                }}
                onCommit={(value) => {
                  updateAttributes({ title: value });
                }}
              />
            ) : (
              title && (
                <h1
                  className="scribe-essay-title"
                  style={{ fontStyle: titleItalic ? "italic" : "normal" }}
                >
                  {title}
                </h1>
              )
            )}

            {showSubtitle &&
              (editable ? (
                <EditableText
                  className="scribe-essay-subtitle"
                  value={subtitle}
                  placeholder="Add a subtitle…"
                  ariaLabel="Essay subtitle"
                  allowEmpty
                  style={{ fontStyle: subtitleItalic ? "italic" : "normal" }}
                  onToggleItalic={() => {
                    updateAttributes({ subtitleItalic: !subtitleItalic });
                  }}
                  onCommit={(value) => {
                    updateAttributes({ subtitle: value });
                  }}
                />
              ) : (
                subtitle && (
                  <p
                    className="scribe-essay-subtitle"
                    style={{ fontStyle: subtitleItalic ? "italic" : "normal" }}
                  >
                    {subtitle}
                  </p>
                )
              ))}
          </div>
        </div>
      )}

      <NodeViewContent className="scribe-essay-body" />

      {editable && (
        <BlockControls className="scribe-essay-controls" open={colorOpen}>
          <SubtitleToggle
            active={showSubtitle}
            onToggle={() => {
              updateAttributes({ showSubtitle: !showSubtitle });
            }}
            variant="block"
          />

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
                aria-label={icon ? "Change essay icon" : "Add essay icon"}
                className="scribe-block-btn"
              >
                <EmojiIcon size={15} />
              </button>
            </Tooltip>
          </IconPicker>

          <BlockColorPopover
            swatches={QUOTE_ACCENTS}
            value={color}
            onChange={(value) => {
              updateAttributes({ color: value });
            }}
            open={colorOpen}
            onOpenChange={setColorOpen}
            label="Accent"
            clearLabel="Default accent"
            triggerLabel="Accent color"
            triggerAriaLabel="Essay accent color"
          />
        </BlockControls>
      )}
    </NodeViewWrapper>
  );
}
