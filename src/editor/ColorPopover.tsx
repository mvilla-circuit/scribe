import { type Editor, useEditorState } from "@tiptap/react";
import { useEffect, useRef } from "react";

import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

import { ChevronDownIcon } from "./icons";
import { HIGHLIGHT_COLORS, type Swatch, TEXT_COLORS } from "./palette";
import { SwatchGrid } from "./SwatchGrid";

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

  // Reactively track the active text + highlight + underline values.
  const { textColor, highlightColor, underlineColor } = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      textColor:
        TEXT_COLORS.find((s) => e.isActive("textStyle", { color: s.value }))
          ?.value ?? null,
      highlightColor:
        HIGHLIGHT_COLORS.find((s) =>
          e.isActive("highlight", { color: s.value }),
        )?.value ?? null,
      underlineColor:
        TEXT_COLORS.find((s) => e.isActive("underline", { color: s.value }))
          ?.value ?? null,
    }),
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

  const setText = (value: string | null) => {
    const chain = editor.chain().focus();
    if (value) chain.setColor(value).run();
    else chain.unsetColor().run();
  };

  const setHighlight = (value: string | null) => {
    const chain = editor.chain().focus();
    if (value) chain.setHighlight({ color: value }).run();
    else chain.unsetHighlight().run();
  };

  const setUnderline = (value: string | null) => {
    const chain = editor.chain().focus();
    if (value) chain.setMark("underline", { color: value }).run();
    else chain.unsetMark("underline").run();
  };

  return (
    <div ref={wrapRef} className="relative">
      <Tooltip content="Color & highlight">
        <button
          type="button"
          aria-label="Color and highlight"
          aria-haspopup="true"
          aria-expanded={open}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
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
        // eslint-disable-next-line jsx-a11y/interactive-supports-focus
        <div
          role="menu"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          className={cn(
            "absolute right-0 top-[calc(100%+8px)] z-10 w-[12rem] font-sans",
            "rounded-xl border border-border bg-elevated p-3 shadow-popover",
          )}
        >
          <Section
            label="Text"
            swatches={TEXT_COLORS}
            active={textColor}
            onChange={setText}
            clearLabel="Default color"
          />
          <div className="my-3 h-px bg-border" />
          <Section
            label="Highlight"
            swatches={HIGHLIGHT_COLORS}
            active={highlightColor}
            onChange={setHighlight}
            clearLabel="No highlight"
          />
          <div className="my-3 h-px bg-border" />
          <Section
            label="Underline"
            swatches={TEXT_COLORS}
            active={underlineColor}
            onChange={setUnderline}
            clearLabel="No underline"
          />
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  swatches,
  active,
  onChange,
  clearLabel,
}: {
  label: string;
  swatches: Swatch[];
  active: string | null;
  onChange: (value: string | null) => void;
  clearLabel: string;
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.07em] text-muted">
        {label}
      </div>
      <SwatchGrid
        swatches={swatches}
        value={active}
        onChange={onChange}
        clearLabel={clearLabel}
      />
    </div>
  );
}
