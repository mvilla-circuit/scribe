import { useState } from "react";
import * as RPopover from "@radix-ui/react-popover";
import { EmojiPicker } from "frimousse";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { cn } from "../../lib/utils";
import { Tooltip } from "../../components/ui/Tooltip";
import { CALLOUT_COLORS, CALLOUT_VARIANTS } from "../palette";
import { PaletteIcon } from "../icons";

// The callout's writing surface: a tinted box with a leading emoji and a quiet
// control cluster in the top-right that fades in on hover/focus. The emoji
// button opens an emoji picker; the swatch button opens a popover holding the
// preset variants and the custom color washes. Every control only ever writes
// `color`/`icon` back onto the node via updateAttributes, so edits persist.
export function CalloutView({ node, updateAttributes, editor }: NodeViewProps) {
  const color = (node.attrs.color as string | null) ?? undefined;
  const icon = (node.attrs.icon as string) || "💡";
  const editable = editor.isEditable;

  const [emojiOpen, setEmojiOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  return (
    <NodeViewWrapper
      className="scribe-callout group/callout"
      data-callout=""
      style={color ? { background: color } : undefined}
    >
      <div className="scribe-callout-emoji" contentEditable={false}>
        {editable ? (
          <RPopover.Root open={emojiOpen} onOpenChange={setEmojiOpen}>
            <Tooltip content="Change emoji">
              <RPopover.Trigger asChild>
                <button
                  type="button"
                  aria-label="Change callout emoji"
                  className="scribe-callout-emoji-btn"
                >
                  {icon}
                </button>
              </RPopover.Trigger>
            </Tooltip>
            <RPopover.Portal>
              <RPopover.Content
                align="start"
                sideOffset={6}
                className="scribe-pop z-50 w-[19rem] overflow-hidden rounded-lg border border-border bg-elevated text-text shadow-popover outline-none"
              >
                <EmojiPicker.Root
                  className="flex h-[20rem] flex-col"
                  onEmojiSelect={({ emoji }) => {
                    updateAttributes({ icon: emoji });
                    setEmojiOpen(false);
                  }}
                >
                  <div className="border-b border-border p-2">
                    <EmojiPicker.Search
                      placeholder="Search emoji…"
                      className="h-8 w-full rounded-md border border-border bg-bg px-2.5 text-sm text-text outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <EmojiPicker.Viewport className="relative flex-1 outline-none">
                    <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-muted">
                      Loading…
                    </EmojiPicker.Loading>
                    <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-muted">
                      No emoji found.
                    </EmojiPicker.Empty>
                    <EmojiPicker.List
                      className="select-none pb-1.5"
                      components={{
                        CategoryHeader: ({ category, ...props }) => (
                          <div
                            className="bg-elevated px-2 pb-1 pt-2 text-xs font-medium text-muted"
                            {...props}
                          >
                            {category.label}
                          </div>
                        ),
                        Row: ({ children, ...props }) => (
                          <div className="scroll-my-1 px-1.5" {...props}>
                            {children}
                          </div>
                        ),
                        Emoji: ({ emoji, ...props }) => (
                          <button
                            type="button"
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-md text-lg outline-none",
                              emoji.isActive && "bg-hover"
                            )}
                            {...props}
                          >
                            {emoji.emoji}
                          </button>
                        ),
                      }}
                    />
                  </EmojiPicker.Viewport>
                </EmojiPicker.Root>
              </RPopover.Content>
            </RPopover.Portal>
          </RPopover.Root>
        ) : (
          <span className="scribe-callout-emoji-btn" aria-hidden>
            {icon}
          </span>
        )}
      </div>

      <NodeViewContent className="scribe-callout-body" />

      {editable && (
        <div
          className="scribe-block-controls scribe-callout-controls"
          contentEditable={false}
          data-open={colorOpen || undefined}
        >
          <RPopover.Root open={colorOpen} onOpenChange={setColorOpen}>
            <Tooltip content="Style">
              <RPopover.Trigger asChild>
                <button
                  type="button"
                  aria-label="Callout style"
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
                  Variant
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {CALLOUT_VARIANTS.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() =>
                        updateAttributes({ color: v.color, icon: v.icon })
                      }
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs outline-none transition-colors",
                        "hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring",
                        node.attrs.color === v.color && "bg-hover"
                      )}
                    >
                      <span aria-hidden className="text-sm leading-none">
                        {v.icon}
                      </span>
                      <span className="truncate text-muted">{v.name}</span>
                    </button>
                  ))}
                </div>
                <div className="my-3 h-px bg-border" />
                <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.07em] text-muted">
                  Color
                </div>
                <div className="flex flex-wrap gap-2">
                  {CALLOUT_COLORS.map((s) => {
                    const active = node.attrs.color === s.value;
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
