import * as RPopover from "@radix-ui/react-popover";
import { useEffect } from "react";

import { useSpellPopover } from "./extensions/spellcheck-store";

/**
 * The menu shown when a spelling squiggle is clicked. Store-driven like the
 * editor's other overlays: it renders while a {@link useSpellPopover} target is
 * set, listing the checker's suggestions plus "Ignore" (this document) and
 * "Add to dictionary" (account-wide). Positioned beside the squiggle via an
 * `anchorRect`, mirroring the inline link popover.
 */
export function SpellPopover() {
  const target = useSpellPopover((s) => s.target);
  const close = useSpellPopover((s) => s.close);
  const open = target !== null;

  // The store outlives this component (it's a module-level zustand store), but a
  // target's `replace`/`ignore` callbacks are bound to the editor's ProseMirror
  // view. This popover mounts and unmounts with its editor, so drop any active
  // target on unmount — otherwise navigating away with the menu open would leave
  // a stale target that the next page's popover reopens against a torn-down view.
  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

  const anchorStyle: React.CSSProperties = target?.anchorRect
    ? {
        position: "fixed",
        left: target.anchorRect.left,
        top: target.anchorRect.top,
        width: target.anchorRect.width,
        height: target.anchorRect.height,
        pointerEvents: "none",
      }
    : {};

  return (
    <RPopover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <RPopover.Anchor asChild>
        <div style={anchorStyle} />
      </RPopover.Anchor>
      <RPopover.Portal>
        <RPopover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="scribe-pop z-50 flex max-h-[min(20rem,var(--radix-popover-content-available-height))] min-w-[12rem] max-w-[16rem] flex-col overflow-hidden rounded-lg border border-border bg-elevated font-sans shadow-popover"
        >
          {target && (
            <>
              <div
                data-testid="spell-suggestions"
                className="flex-1 overflow-y-auto p-1.5"
              >
                {target.suggestions.length > 0 ? (
                  <div className="flex flex-col">
                    {target.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          target.replace(suggestion);
                          close();
                        }}
                        className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-text outline-none transition-colors hover:bg-hover focus-visible:bg-hover"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-2 py-1.5 text-sm text-muted">
                    No suggestions
                  </p>
                )}
              </div>

              <div className="flex flex-none flex-col border-t border-border p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    target.ignore();
                    close();
                  }}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-muted outline-none transition-colors hover:bg-hover hover:text-text focus-visible:bg-hover focus-visible:text-text"
                >
                  Ignore
                </button>
                <button
                  type="button"
                  onClick={() => {
                    target.addToDictionary();
                    close();
                  }}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-muted outline-none transition-colors hover:bg-hover hover:text-text focus-visible:bg-hover focus-visible:text-text"
                >
                  Add to dictionary
                </button>
              </div>
            </>
          )}
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}
