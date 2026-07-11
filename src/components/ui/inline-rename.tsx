import { useEffect, useRef, useState } from "react";

import { cn, resolveEditedValue } from "@/lib/utils";

interface InlineRenameProps {
  initialValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
}

// Inline editable field used for create/rename. Autofocuses and selects all on
// mount, commits the trimmed value on Enter or blur, and cancels on Escape.
// An empty commit falls back to cancelling so we never persist a blank name.
export function InlineRename({
  initialValue,
  onCommit,
  onCancel,
  placeholder,
  className,
}: InlineRenameProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const settled = useRef(false);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const commit = () => {
    if (settled.current) return;
    settled.current = true;
    // A blank or unchanged name closes the field without a redundant rename.
    const outcome = resolveEditedValue(value, { previous: initialValue });
    if (outcome.commit) onCommit(outcome.value);
    else onCancel();
  };

  const cancel = () => {
    if (settled.current) return;
    settled.current = true;
    onCancel();
  };

  return (
    <input
      ref={inputRef}
      value={value}
      placeholder={placeholder}
      spellCheck={false}
      onChange={(e) => {
        setValue(e.target.value);
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        // Keep keystrokes inside the field so row-level dnd-kit listeners (Space
        // to pick up, arrows to move) never see them while renaming.
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
      }}
      onBlur={commit}
      className={cn(
        "w-full min-w-0 rounded-sm border border-accent/60 bg-surface px-1.5 py-0.5 " +
          "text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    />
  );
}
