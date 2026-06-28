import { openUrl } from "@tauri-apps/plugin-opener";
import type { Editor } from "@tiptap/react";

import { clearLink, setLinkHref } from "./link-commands";
import { LinkPopover } from "./link-popover";
import { useLinkHover } from "./use-link-hover";

/**
 * Bridges {@link useLinkHover} to the shared {@link LinkPopover} in "view" mode:
 * when the pointer rests on an inline link, it shows the full URL anchored to
 * the link with open/copy/edit/remove controls, and applies edits/removals back
 * to the hovered link's mark range. Mounted alongside the editor so hovering any
 * link surfaces the card.
 */
export function LinkHoverLayer({ editor }: { editor: Editor }) {
  const { hovered, onCardEnter, onCardLeave, clear } = useLinkHover(editor);

  return (
    <LinkPopover
      open={hovered !== null}
      onOpenChange={(open) => {
        if (!open) clear();
      }}
      mode="view"
      href={hovered?.href ?? ""}
      hasLink
      editable={editor.isEditable}
      anchorRect={hovered?.getRect() ?? null}
      onOpenUrl={() => {
        if (hovered) void openUrl(hovered.href);
      }}
      onSubmit={(href) => {
        if (!hovered) return;
        setLinkHref(editor, { from: hovered.from, to: hovered.to }, href);
        clear();
      }}
      onRemove={() => {
        if (!hovered) return;
        clearLink(editor, { from: hovered.from, to: hovered.to });
        clear();
      }}
      onCardEnter={onCardEnter}
      onCardLeave={onCardLeave}
    />
  );
}
