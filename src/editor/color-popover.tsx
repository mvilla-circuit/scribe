import type { ChainedCommands } from "@tiptap/core";
import { type Editor, useEditorState } from "@tiptap/react";
import { useEffect, useRef } from "react";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { ChevronDownIcon } from "./icons";
import { HIGHLIGHT_COLORS, type Swatch, TEXT_COLORS } from "./palette";
import { preserveSelection } from "./preserve-selection";
import { SwatchSection } from "./swatch-grid";

// The active swatch value for a `{ color }`-keyed mark, or null when none of the
// palette's swatches is the one currently applied to the selection.
function activeSwatch(
  editor: Editor,
  swatches: readonly Swatch[],
  mark: string,
): string | null {
  return (
    swatches.find((s) => editor.isActive(mark, { color: s.value }))?.value ??
    null
  );
}

// A single combined color control: one trigger opens a flyout holding both the
// text-color and highlight palettes. It lives *inside* the bubble toolbar (no
// portal) and every interactive element cancels its mousedown, so the text
// selection — and therefore the bubble menu itself — survives every click.
export function ColorPopover({
  editor,
  open,
  onOpenChange,
}: {
  editor: Editor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  // Reactively track the active text + highlight + underline values. This lives
  // in the always-mounted bubble toolbar, so its selector runs on every editor
  // transaction — including plain typing. The values only matter when the bar
  // is actually shown (over a non-empty selection), so short-circuit otherwise
  // to keep the palette scans (3x `find` over the swatch lists) off the
  // per-keystroke hot path.
  const { textColor, highlightColor, underlineColor } = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (e.state.selection.empty) {
        return { textColor: null, highlightColor: null, underlineColor: null };
      }
      return {
        textColor: activeSwatch(e, TEXT_COLORS, "textStyle"),
        highlightColor: activeSwatch(e, HIGHLIGHT_COLORS, "highlight"),
        underlineColor: activeSwatch(e, TEXT_COLORS, "underline"),
      };
    },
  });

  // Close when the user interacts outside the flyout.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open, onOpenChange]);

  // Each setter applies its mark for a chosen swatch or clears it for null,
  // sharing the focus-chain-run plumbing through one helper.
  const markSetter =
    (
      apply: (chain: ChainedCommands, value: string) => ChainedCommands,
      clear: (chain: ChainedCommands) => ChainedCommands,
    ) =>
    (value: string | null) => {
      const chain = editor.chain().focus();
      (value ? apply(chain, value) : clear(chain)).run();
    };

  const setText = markSetter(
    (c, v) => c.setColor(v),
    (c) => c.unsetColor(),
  );
  const setHighlight = markSetter(
    (c, v) => c.setHighlight({ color: v }),
    (c) => c.unsetHighlight(),
  );
  const setUnderline = markSetter(
    (c, v) => c.setMark("underline", { color: v }),
    (c) => c.unsetMark("underline"),
  );

  return (
    <div ref={wrapRef} className="relative">
      <Tooltip content="Color & highlight">
        <button
          type="button"
          aria-label="Color and highlight"
          aria-haspopup="true"
          aria-expanded={open}
          onMouseDown={preserveSelection}
          onClick={() => {
            onOpenChange(!open);
          }}
          className={cn(
            "flex h-8 items-center gap-0.5 rounded-md px-1.5 text-text outline-none transition-colors",
            "hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring",
            (open || textColor || highlightColor || underlineColor) &&
              "bg-hover",
          )}
        >
          {/* The "A" previews all three: tinted by the active text color, sitting
              on the active highlight wash, underlined in the active line color. */}
          <span
            aria-hidden
            className="flex h-5 w-5 items-center justify-center rounded text-[13px] font-semibold leading-none ring-1 ring-inset ring-border"
            style={{
              background: highlightColor ?? "transparent",
              color: textColor ?? "var(--color-text)",
              borderBottom: underlineColor
                ? `2px solid ${underlineColor}`
                : undefined,
            }}
          >
            A
          </span>
          <ChevronDownIcon className="text-muted" size={11} />
        </button>
      </Tooltip>

      {open && (
        // Container only swallows mousedown to keep the editor selection;
        // focusable controls live inside it, not on the panel itself.
        // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- The panel only swallows mousedown to preserve the editor selection; the focusable controls live inside it, not on the panel.
        <div
          role="menu"
          onMouseDown={preserveSelection}
          className={cn(
            "absolute right-0 top-[calc(100%+8px)] z-10 w-[12rem] font-sans",
            "rounded-xl border border-border bg-elevated p-3 shadow-popover",
          )}
        >
          <SwatchSection
            label="Text"
            swatches={TEXT_COLORS}
            value={textColor}
            onChange={setText}
            clearLabel="Default color"
          />
          <div className="my-3 h-px bg-border" />
          <SwatchSection
            label="Highlight"
            swatches={HIGHLIGHT_COLORS}
            value={highlightColor}
            onChange={setHighlight}
            clearLabel="No highlight"
          />
          <div className="my-3 h-px bg-border" />
          <SwatchSection
            label="Underline"
            swatches={TEXT_COLORS}
            value={underlineColor}
            onChange={setUnderline}
            clearLabel="No underline"
          />
        </div>
      )}
    </div>
  );
}
