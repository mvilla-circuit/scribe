import * as RPopover from "@radix-ui/react-popover";
import { useState } from "react";
import { toast } from "sonner";

import { EditorIconButton } from "./editor-icon-button";
import { CopyIcon, ExternalLinkIcon, PencilIcon, TrashIcon } from "./icons";
import { LinkEditForm } from "./link-edit-form";

interface LinkPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "add" opens straight into the edit form; "view" shows the URL + actions. */
  mode: "add" | "view";
  href: string;
  hasLink: boolean;
  /** Edit/Remove controls only render when true. */
  editable: boolean;
  /** Anchor rect for positioning; when null, falls back to no explicit anchor. */
  anchorRect: DOMRect | null;
  onOpenUrl: () => void;
  /** Receives the NORMALIZED href from the edit form. */
  onSubmit: (href: string) => void;
  onRemove: () => void;
  /** Hover-bridge handlers so the card stays open while hovered. */
  onCardEnter?: () => void;
  onCardLeave?: () => void;
}

/**
 * An anchored Radix popover that unifies the add / view / edit link flows. In
 * "view" mode it shows the URL with open/copy/edit/remove controls; the Edit
 * control (and "add" mode) swaps in the {@link LinkEditForm}. Positioning is
 * driven by an `anchorRect` so the card can float beside an inline link.
 */
export function LinkPopover({
  open,
  onOpenChange,
  mode,
  href,
  hasLink,
  editable,
  anchorRect,
  onOpenUrl,
  onSubmit,
  onRemove,
  onCardEnter,
  onCardLeave,
}: LinkPopoverProps) {
  const [editing, setEditing] = useState(false);
  const showForm = mode === "add" || editing;

  // Reset back to the URL preview whenever the card closes (per React's "you
  // might not need an effect"), so the next hovered link opens in "view" mode
  // rather than inheriting a prior Edit. The popover is mounted for the editor's
  // lifetime, so this state would otherwise persist across different links.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setEditing(false);
  }

  const copy = () => {
    void navigator.clipboard.writeText(href).then(
      () => toast.success("Link copied"),
      () => toast.error("Couldn't copy link"),
    );
  };

  const anchorStyle: React.CSSProperties = anchorRect
    ? {
        position: "fixed",
        left: anchorRect.left,
        top: anchorRect.top,
        width: anchorRect.width,
        height: anchorRect.height,
        pointerEvents: "none",
      }
    : {};

  return (
    <RPopover.Root open={open} onOpenChange={onOpenChange}>
      <RPopover.Anchor asChild>
        <div style={anchorStyle} />
      </RPopover.Anchor>
      <RPopover.Portal>
        <RPopover.Content
          side="top"
          sideOffset={8}
          onMouseEnter={onCardEnter}
          onMouseLeave={onCardLeave}
          className="scribe-pop z-50 w-80 max-w-[22rem] rounded-lg border border-border bg-elevated p-1.5 font-sans shadow-popover focus-within:ring-2 focus-within:ring-ring"
        >
          {showForm ? (
            <LinkEditForm
              key={href}
              initialHref={href}
              hasLink={hasLink}
              onSubmit={onSubmit}
              onRemove={onRemove}
              onCancel={() => {
                if (mode === "add") onOpenChange(false);
                else setEditing(false);
              }}
            />
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="scribe-linkpop-url px-1">{href}</span>
              <div className="flex items-center gap-0.5">
                <EditorIconButton label="Open link" onClick={onOpenUrl}>
                  <ExternalLinkIcon size={14} />
                </EditorIconButton>
                <EditorIconButton label="Copy link" onClick={copy}>
                  <CopyIcon size={14} />
                </EditorIconButton>
                {editable && (
                  <EditorIconButton
                    label="Edit link"
                    onClick={() => {
                      setEditing(true);
                    }}
                  >
                    <PencilIcon size={14} />
                  </EditorIconButton>
                )}
                {editable && (
                  <EditorIconButton label="Remove link" onClick={onRemove}>
                    <TrashIcon size={14} />
                  </EditorIconButton>
                )}
              </div>
            </div>
          )}
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}
