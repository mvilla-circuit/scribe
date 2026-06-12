import { useEffect, useRef, type CSSProperties } from "react";
import * as RPopover from "@radix-ui/react-popover";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { cn } from "../../lib/utils";
import { Tooltip } from "../../components/ui/Tooltip";
import { QUOTE_ACCENTS } from "../palette";
import { PaletteIcon, NoColorIcon } from "../icons";

// The quote's writing surface: a tinted/ruled/pull-quote block (driven by the
// `variant` class) whose accent color flows through the `--quote-accent` CSS
// variable so every variant retints from one swatch choice. A quiet control
// cluster fades in on hover/focus with an accent palette and a toggle for the
// optional, right-aligned attribution line. Every control writes back via
// updateAttributes, so edits persist with the document.
export function QuoteView({ node, updateAttributes, editor }: NodeViewProps) {
  const variant = (node.attrs.variant as string) || "blockquote";
  const color = (node.attrs.color as string | null) ?? null;
  const attribution = (node.attrs.attribution as string) || "";
  const showAttribution = Boolean(node.attrs.showAttribution);
  const editable = editor.isEditable;

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

  const wrapperStyle = color
    ? ({ "--quote-accent": color } as CSSProperties)
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
                value={attribution}
                placeholder="Add a citation…"
                onChange={(e) =>
                  updateAttributes({ attribution: e.target.value })
                }
                onKeyDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
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
        >
          <ControlPopover
            color={color}
            showAttribution={showAttribution}
            onPickColor={(value) => updateAttributes({ color: value })}
            onToggleAttribution={() => {
              justEnabled.current = !showAttribution;
              updateAttributes({ showAttribution: !showAttribution });
            }}
          />
        </div>
      )}
    </NodeViewWrapper>
  );
}

function ControlPopover({
  color,
  showAttribution,
  onPickColor,
  onToggleAttribution,
}: {
  color: string | null;
  showAttribution: boolean;
  onPickColor: (value: string | null) => void;
  onToggleAttribution: () => void;
}) {
  return (
    <RPopover.Root>
      <Tooltip content="Style">
        <RPopover.Trigger asChild>
          <button type="button" aria-label="Quote style" className="scribe-block-btn">
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
            Accent
          </div>
          <div className="flex flex-wrap gap-2">
            {QUOTE_ACCENTS.map((s) => {
              const active = color === s.value;
              return (
                <Tooltip key={s.value} content={s.name}>
                  <button
                    type="button"
                    aria-label={s.name}
                    aria-pressed={active}
                    onClick={() => onPickColor(s.value)}
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
          <button
            type="button"
            onClick={() => onPickColor(null)}
            className={cn(
              "mt-3 flex w-full items-center gap-2 rounded-md px-1 py-1 text-xs text-muted outline-none transition-colors",
              "hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <NoColorIcon size={13} className="opacity-70" />
            Default accent
          </button>

          <div className="my-3 h-px bg-border" />

          <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1 py-1 text-sm text-text outline-none transition-colors hover:bg-hover">
            <span>Show attribution</span>
            <input
              type="checkbox"
              checked={showAttribution}
              onChange={onToggleAttribution}
              className="scribe-quote-toggle"
            />
          </label>
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}
