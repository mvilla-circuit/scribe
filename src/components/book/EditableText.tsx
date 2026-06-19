import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

type EditableTextProps = {
  value: string;
  onCommit: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  // Subtitles may be cleared; titles fall back to their previous value.
  allowEmpty?: boolean;
};

// An always-editable, auto-growing text field that reads as display text until
// focused. Commits the trimmed value on blur or Enter and reverts on Escape.
// Reused for the book title/subtitle and document titles on the reading surface.
export function EditableText({
  value,
  onCommit,
  ariaLabel,
  placeholder,
  className,
  style,
  allowEmpty = false,
}: EditableTextProps) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  const focused = useRef(false);
  // Caret position to restore after a typographic substitution shortens the
  // draft; applied in the layout effect so the cursor never jumps to the end.
  const pendingCaret = useRef<number | null>(null);

  // Adopt external changes (e.g. a rename from the outline) unless the user is
  // mid-edit, so we never clobber what they're typing.
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    if (pendingCaret.current !== null) {
      el.selectionStart = el.selectionEnd = pendingCaret.current;
      pendingCaret.current = null;
    }
  }, [draft]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed && !allowEmpty) {
      setDraft(value);
      return;
    }
    if (trimmed !== value) onCommit(trimmed);
    else setDraft(trimmed);
  };

  return (
    <textarea
      ref={ref}
      rows={1}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      style={style}
      spellCheck={false}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        const el = e.target;
        const caret = el.selectionStart ?? el.value.length;
        const next = el.value;
        // Mirror the editor's Typography rule: turn a just-typed "--" at the
        // caret into an em dash so titles and subtitles get the same treatment
        // as body text, independent of the OS's smart-substitution setting.
        if (caret >= 2 && next.slice(caret - 2, caret) === "--") {
          setDraft(next.slice(0, caret - 2) + "—" + next.slice(caret));
          pendingCaret.current = caret - 1;
          return;
        }
        setDraft(next);
      }}
      onBlur={() => {
        focused.current = false;
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          ref.current?.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setDraft(value);
          // Defer blur so the reverted value paints first.
          requestAnimationFrame(() => ref.current?.blur());
        }
      }}
      className={cn(
        // `whitespace-pre-wrap` + `break-words` make the field wrap explicitly
        // rather than leaning on the UA's default textarea wrapping — which the
        // Tauri WKWebView doesn't reliably apply, leaving long titles/subtitles
        // on one line that `overflow-hidden` then clips. Now they wrap (and even
        // a single overlong word breaks) instead of being cut off.
        "w-full resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent outline-none",
        "placeholder:text-muted/45 focus-visible:ring-0",
        className
      )}
    />
  );
}
