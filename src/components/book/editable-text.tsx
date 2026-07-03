import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { cn, resolveEditedValue } from "@/lib/utils";

export interface EditableTextHandle {
  /** Focus the field and place the caret at the end of its text. */
  focus: () => void;
}

interface EditableTextProps {
  value: string;
  onCommit: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  // Subtitles may be cleared; titles fall back to their previous value.
  allowEmpty?: boolean;
  // When provided, Cmd/Ctrl+I toggles italic for the whole field via this
  // callback (the field is plain text, so italic is an all-or-nothing flag the
  // caller stores and reflects through `style`). Opt-in so plain title fields
  // that can't be italicized are unaffected.
  onToggleItalic?: () => void;
  // When provided, Enter commits (via blur) and then hands off — e.g. to move
  // the caret into the document body. Without it, Enter just commits and blurs.
  onEnter?: () => void;
}

// An always-editable, auto-growing text field that reads as display text until
// focused. Commits the trimmed value on blur or Enter and reverts on Escape.
// Reused for the book title/subtitle and document titles on the reading surface.
export const EditableText = forwardRef<EditableTextHandle, EditableTextProps>(
  function EditableText(
    {
      value,
      onCommit,
      ariaLabel,
      placeholder,
      className,
      style,
      allowEmpty = false,
      onToggleItalic,
      onEnter,
    },
    handleRef,
  ) {
    const [draft, setDraft] = useState(value);
    const ref = useRef<HTMLTextAreaElement>(null);
    const focused = useRef(false);

    useImperativeHandle(
      handleRef,
      () => ({
        focus: () => {
          const el = ref.current;
          if (!el) return;
          el.focus();
          const end = el.value.length;
          el.setSelectionRange(end, end);
        },
      }),
      [],
    );
    // Caret position to restore after a typographic substitution shortens the
    // draft; applied in the layout effect so the cursor never jumps to the end.
    const pendingCaret = useRef<number | null>(null);

    // Adopt external changes (e.g. a rename from the outline) unless the user is
    // mid-edit, so we never clobber what they're typing.
    useEffect(() => {
      if (!focused.current) setDraft(value);
    }, [value]);

    // Auto-grow: reset the height then read scrollHeight so the field tracks its
    // content. Shared by the text-change effect and the width-change observer
    // below, since a narrower column can wrap a title onto an extra line.
    const measure = useCallback(() => {
      const el = ref.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, []);

    useLayoutEffect(() => {
      measure();
      const el = ref.current;
      if (el && pendingCaret.current !== null) {
        el.selectionStart = el.selectionEnd = pendingCaret.current;
        pendingCaret.current = null;
      }
    }, [draft, measure]);

    // Remeasure when the field's own width changes — e.g. the reading column
    // narrows as the page outline mounts on load, or the window/sidebar is
    // resized. Height is otherwise only recomputed on edits, so a title measured
    // at the wide width would keep its stale one-line height and get clipped by
    // `overflow-hidden` once the column shrinks. Guard on width so our own height
    // writes don't spin the observer, and batch through rAF to coalesce bursts.
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      let lastWidth = -1;
      let frame = 0;
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? el.clientWidth;
        if (width === lastWidth) return;
        lastWidth = width;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(measure);
      });
      observer.observe(el);
      return () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
      };
    }, [measure]);

    const commit = () => {
      const outcome = resolveEditedValue(draft, {
        previous: value,
        allowEmpty,
      });
      // Anything we don't commit (blank-and-disallowed, or unchanged) reverts the
      // draft to the canonical value so the field never shows untrimmed text.
      if (outcome.commit) onCommit(outcome.value);
      else setDraft(value);
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
          if (
            onToggleItalic &&
            (e.metaKey || e.ctrlKey) &&
            (e.key === "i" || e.key === "I")
          ) {
            e.preventDefault();
            e.stopPropagation();
            onToggleItalic();
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            // Blur commits the draft synchronously; then hand off (if asked) so
            // the caret can continue into the document body.
            ref.current?.blur();
            onEnter?.();
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
          className,
        )}
      />
    );
  },
);
