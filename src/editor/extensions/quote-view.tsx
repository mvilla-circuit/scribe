import {
  NodeViewContent,
  type NodeViewProps,
  NodeViewWrapper,
} from "@tiptap/react";
import { type CSSProperties, useEffect, useRef, useState } from "react";

import { Tooltip } from "@/components/ui/tooltip";
import { BlockColorPopover } from "@/editor/block-color-popover";
import { AttributionIcon } from "@/editor/icons";
import { QUOTE_ACCENTS } from "@/editor/palette";
import { cn } from "@/lib/utils";

// The quote's writing surface: a tinted/ruled/pull-quote block (driven by the
// `variant` class) whose accent color flows through the `--quote-accent` CSS
// variable so every variant retints from one swatch choice. A quiet control
// cluster fades in on hover/focus with an accent palette and a toggle for the
// optional, right-aligned attribution line. Every control writes back via
// updateAttributes, so edits persist with the document.
export function QuoteView({ node, updateAttributes, editor }: NodeViewProps) {
  const variant = (node.attrs.variant as string) || "accentquote";
  const color = (node.attrs.color as string | null) ?? null;
  const attribution = (node.attrs.attribution as string) || "";
  const showAttribution = Boolean(node.attrs.showAttribution);
  const editable = editor.isEditable;

  const [colorOpen, setColorOpen] = useState(false);
  const citeRef = useRef<HTMLInputElement>(null);

  // Focus the citation field the moment it's switched on, so the writer can
  // start typing the attribution without a second click.
  const justEnabled = useRef(false);
  useEffect(() => {
    if (showAttribution && justEnabled.current) {
      citeRef.current?.focus();
      justEnabled.current = false;
    }
  }, [showAttribution]);

  const wrapperStyle: CSSProperties | undefined = color
    ? { "--quote-accent": color }
    : undefined;

  return (
    <NodeViewWrapper
      className={cn("scribe-quote", `scribe-quote--${variant}`, "group/quote")}
      data-quote=""
      data-variant={variant}
      style={wrapperStyle}
    >
      <NodeViewContent className="scribe-quote-body" />

      {showAttribution && (editable || attribution) && (
        <div className="scribe-quote-cite" contentEditable={false}>
          {editable ? (
            <span
              className="scribe-quote-cite-field"
              data-value={attribution || "Add a citation…"}
            >
              <input
                ref={citeRef}
                type="text"
                // size=1 keeps the input's own intrinsic width tiny so the
                // invisible grid sizer (the field's ::after, set to the text)
                // drives the width. Otherwise the input's default 20-char width
                // inflates the auto track and the text floats left of the edge.
                size={1}
                value={attribution}
                placeholder="Add a citation…"
                onChange={(e) => {
                  updateAttributes({ attribution: e.target.value });
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                className="scribe-quote-cite-input"
                aria-label="Quote attribution"
              />
            </span>
          ) : (
            <span className="scribe-quote-cite-input">{attribution}</span>
          )}
        </div>
      )}

      {editable && (
        <div
          className="scribe-block-controls scribe-quote-controls"
          contentEditable={false}
          data-open={colorOpen || undefined}
        >
          <Tooltip
            content={showAttribution ? "Hide attribution" : "Show attribution"}
          >
            <button
              type="button"
              aria-pressed={showAttribution}
              aria-label={
                showAttribution ? "Hide attribution" : "Show attribution"
              }
              onClick={() => {
                justEnabled.current = !showAttribution;
                updateAttributes({ showAttribution: !showAttribution });
              }}
              className="scribe-block-btn"
            >
              <AttributionIcon size={15} />
            </button>
          </Tooltip>

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
            triggerLabel="Style"
            triggerAriaLabel="Quote style"
          />
        </div>
      )}
    </NodeViewWrapper>
  );
}
