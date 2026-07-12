import { useEffect, useRef, useState } from "react";

import { cn, resolveEditedValue } from "@/lib/utils";

interface CanvasTextProps {
  value: string;
  /** When false the field is inert (drag passes through); true focuses it. */
  editing: boolean;
  onCommit: (value: string) => void;
  onStopEditing: () => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}

/**
 * The in-place editable text for a canvas item. It reads as static text until
 * the item enters editing (double-click), then focuses and captures keys so a
 * Delete/Backspace edits the text instead of removing the item. Enter inserts a
 * newline (notes are multiline); Escape reverts, blur/commit persists.
 */
export function CanvasText({
  value,
  editing,
  onCommit,
  onStopEditing,
  ariaLabel,
  placeholder,
  className,
}: CanvasTextProps) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  const settled = useRef(false);

  // Adopt external changes while not editing by adjusting state during render
  // (React's "reset state from props" pattern), so we never clobber in-progress
  // typing and avoid a setState-in-effect cascade.
  if (!editing && value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (!editing) {
      settled.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [editing]);

  const finish = (commit: boolean) => {
    if (settled.current) return;
    settled.current = true;
    // Canvas notes may be cleared to blank, so settle with the shared trim
    // rule but allow an empty result through rather than cancelling it.
    const outcome = resolveEditedValue(draft, {
      previous: value,
      allowEmpty: true,
    });
    if (commit && outcome.commit) onCommit(outcome.value);
    else setDraft(value);
    onStopEditing();
  };

  return (
    <textarea
      ref={ref}
      rows={1}
      value={draft}
      readOnly={!editing}
      tabIndex={editing ? 0 : -1}
      aria-label={ariaLabel}
      placeholder={placeholder}
      spellCheck={editing}
      onChange={(e) => {
        setDraft(e.target.value);
      }}
      onBlur={() => {
        finish(true);
      }}
      onKeyDown={(e) => {
        // While editing, keep keys local so the canvas-level Delete/Backspace
        // and undo shortcuts never fire mid-typing.
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
          // Blur after settling so a trailing onBlur is a no-op.
          ref.current?.blur();
        }
      }}
      className={cn(
        "h-full w-full resize-none whitespace-pre-wrap break-words bg-transparent outline-none",
        "placeholder:text-current/40",
        className,
      )}
      style={{ pointerEvents: editing ? "auto" : "none" }}
    />
  );
}
