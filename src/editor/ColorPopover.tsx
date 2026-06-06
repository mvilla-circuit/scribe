import { useEffect, useRef } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { cn } from "../lib/utils";
import { Tooltip } from "../components/ui/Tooltip";
import { TEXT_COLORS, HIGHLIGHT_COLORS, type Swatch } from "./palette";
import { ChevronDownIcon, NoColorIcon } from "./icons";

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

  // Reactively track the active text + highlight values for the selection.
  const { textColor, highlightColor } = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      textColor:
        TEXT_COLORS.find((s) => e.isActive("textStyle", { color: s.value }))
          ?.value ?? null,
      highlightColor:
        HIGHLIGHT_COLORS.find((s) => e.isActive("highlight", { color: s.value }))
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
    return () => document.removeEventListener("pointerdown", onDown, true);
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

  return (
    <div ref={wrapRef} className="relative">
      <Tooltip content="Color & highlight">
        <button
          type="button"
          aria-label="Color and highlight"
          aria-haspopup="true"
          aria-expanded={open}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onOpenChange(!open)}
          className={cn(
            "flex h-8 items-center gap-0.5 rounded-md px-1.5 text-text outline-none transition-colors",
            "hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring",
            (open || textColor || highlightColor) && "bg-hover"
          )}
        >
          {/* The "A" previews both: tinted by the active text color, sitting on
              the active highlight wash. */}
          <span
            aria-hidden
            className="flex h-5 w-5 items-center justify-center rounded text-[13px] font-semibold leading-none ring-1 ring-inset ring-border"
            style={{
              background: highlightColor ?? "transparent",
              color: textColor ?? "var(--color-text)",
            }}
          >
            A
          </span>
          <ChevronDownIcon className="text-muted" size={11} />
        </button>
      </Tooltip>

      {open && (
        <div
          role="menu"
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            "absolute right-0 top-[calc(100%+8px)] z-10 w-fit",
            "rounded-xl border border-border bg-elevated p-3.5 shadow-popover"
          )}
        >
          <Section
            label="Text"
            swatches={TEXT_COLORS}
            active={textColor}
            onPick={(v) => setText(v)}
            onClear={() => setText(null)}
            clearLabel="Default color"
          />
          <div className="my-3.5 h-px bg-border" />
          <Section
            label="Highlight"
            swatches={HIGHLIGHT_COLORS}
            active={highlightColor}
            onPick={(v) => setHighlight(v)}
            onClear={() => setHighlight(null)}
            clearLabel="No highlight"
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
  onPick,
  onClear,
  clearLabel,
}: {
  label: string;
  swatches: Swatch[];
  active: string | null;
  onPick: (value: string) => void;
  onClear: () => void;
  clearLabel: string;
}) {
  return (
    <div>
      <div className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.07em] text-muted">
        {label}
      </div>
      <div className="grid grid-cols-[repeat(4,2rem)] gap-2">
        {swatches.map((s) => {
          const isActive = active === s.value;
          return (
            <Tooltip key={s.value} content={s.name}>
              <button
                type="button"
                aria-label={s.name}
                aria-pressed={isActive}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(s.value)}
                className={cn(
                  "h-8 w-8 rounded-full outline-none transition-all duration-150",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "ring-2 ring-ring ring-offset-2 ring-offset-elevated"
                    : "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] hover:scale-110 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
                )}
                style={{ background: s.value }}
              />
            </Tooltip>
          );
        })}
      </div>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClear}
        className={cn(
          "mt-3.5 flex w-full items-center gap-2 rounded-md px-1 py-1 text-xs text-muted outline-none transition-colors",
          "hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <NoColorIcon size={13} className="opacity-70" />
        {clearLabel}
      </button>
    </div>
  );
}
