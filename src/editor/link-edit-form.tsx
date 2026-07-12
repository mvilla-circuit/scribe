import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { CheckIcon, LinkIcon, TrashIcon } from "./icons";
import { normalizeHref } from "./normalize-href";

interface LinkEditFormProps {
  initialHref: string;
  /** Whether a link already exists (reveals Remove + uses "Update" wording). */
  hasLink: boolean;
  /** Receives the NORMALIZED href on a non-empty submit. */
  onSubmit: (href: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}

/**
 * A compact single-row URL editor shared by the "add a link" and "edit existing
 * link" flows: a quiet link glyph, a borderless field (the popover card carries
 * the focus ring), and a keyboard-first submit. Enter saves, Escape cancels;
 * submitting a non-empty value reports the normalized href, while clearing the
 * field removes an existing link.
 */
export function LinkEditForm({
  initialHref,
  hasLink,
  onSubmit,
  onRemove,
  onCancel,
}: LinkEditFormProps) {
  const [href, setHref] = useState(initialHref);

  const submit = () => {
    const value = href.trim();
    if (value) onSubmit(normalizeHref(value));
    else if (hasLink) onRemove();
    else onCancel();
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-1"
    >
      <LinkIcon size={14} className="ml-1 mr-0.5 shrink-0 text-muted" />
      <Input
        autoFocus
        type="url"
        value={href}
        onChange={(e) => {
          setHref(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder="Paste or type a link"
        aria-label="Link URL"
        className="h-7 min-w-0 flex-1 border-transparent bg-transparent px-0 focus-visible:ring-0"
      />
      <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />
      {hasLink && (
        <button
          type="button"
          aria-label="Remove link"
          onClick={onRemove}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted outline-none transition-colors hover:bg-hover hover:text-danger focus-visible:ring-2 focus-visible:ring-ring"
        >
          <TrashIcon size={14} />
        </button>
      )}
      <button
        type="submit"
        aria-label={hasLink ? "Update link" : "Add link"}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md outline-none transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring",
          href.trim() ? "text-accent" : "text-muted",
        )}
      >
        <CheckIcon size={15} />
      </button>
    </form>
  );
}
