import { memo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { useLinkPrompt } from "./link-prompt-store";

// In-app URL prompt for the Bookmark slash item, in place of `window.prompt`
// (jarring and unstyled inside the desktop shell). Store-driven like
// <PagePicker>: the slash item calls `open(cb)` and this dialog, mounted by the
// editor, collects the URL and hands it back. Mirrors the link editor's chrome.
export const LinkPrompt = memo(function LinkPrompt() {
  const onSubmit = useLinkPrompt((s) => s.callback);
  const close = useLinkPrompt((s) => s.close);
  const open = onSubmit !== null;

  const [href, setHref] = useState("");

  // Clear the field whenever the prompt opens (per React's "you might not need
  // an effect"), so each invocation starts blank.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setHref("");
  }

  const submit = () => {
    const value = href.trim();
    if (value) onSubmit?.(value);
    close();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="p-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="p-4"
        >
          <DialogTitle className="sr-only">Add a bookmark</DialogTitle>
          <Input
            autoFocus
            type="url"
            value={href}
            onChange={(e) => {
              setHref(e.target.value);
            }}
            placeholder="Paste a link URL"
            aria-label="Bookmark URL"
            className="h-9"
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                close();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
