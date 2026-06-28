import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface LinkDialogProps {
  open: boolean;
  /** Pre-filled href when editing an existing link; empty for a new one. */
  initialHref: string;
  /** Whether the selection already carries a link (reveals the Remove action). */
  hasLink: boolean;
  onOpenChange: (open: boolean) => void;
  /** Commit a non-empty href to the selection. */
  onSubmit: (href: string) => void;
  /** Strip the link from the selection. */
  onRemove: () => void;
}

// In-app link editor used by the selection toolbar in place of `window.prompt`,
// which is jarring (and unstyled) inside the desktop shell. A small modal keeps
// the editing affordance consistent with the rest of the app's chrome; the
// caller snapshots the selection before opening so applying restores it.
export function LinkDialog({
  open,
  initialHref,
  hasLink,
  onOpenChange,
  onSubmit,
  onRemove,
}: LinkDialogProps) {
  const [href, setHref] = useState(initialHref);

  // Re-seed the field whenever the dialog opens (per React's "you might not
  // need an effect"), so each invocation starts from the current link's href.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setHref(initialHref);
  }

  const submit = () => {
    const value = href.trim();
    if (value) onSubmit(value);
    else if (hasLink) onRemove();
    else onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="p-4"
        >
          <DialogTitle className="sr-only">
            {hasLink ? "Edit link" : "Add link"}
          </DialogTitle>
          <input
            autoFocus
            type="url"
            value={href}
            onChange={(e) => {
              setHref(e.target.value);
            }}
            placeholder="Paste or type a link"
            aria-label="Link URL"
            className="h-9 w-full rounded-md border border-border bg-bg px-3 text-sm text-text outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            {hasLink && (
              <Button
                type="button"
                variant="ghost"
                onClick={onRemove}
                className="mr-auto"
              >
                Remove
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {hasLink ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
