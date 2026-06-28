import * as RPopover from "@radix-ui/react-popover";
import { useState } from "react";

import { parseIcon } from "@/data/icon";
import { cn } from "@/lib/utils";

import { EmojiSection } from "./icon-picker-emoji-section";
import { GlyphSection } from "./icon-picker-glyph-section";
import { UploadSection } from "./icon-picker-upload-section";

interface IconPickerProps {
  /** The trigger element. Rendered via Radix `asChild`. */
  children: React.ReactNode;
  value: string | null;
  /** Receives the encoded icon value (see `data/icon.ts`). */
  onSelect: (icon: string) => void;
  onRemove: () => void;
  align?: RPopover.PopoverContentProps["align"];
}

type Tab = "glyph" | "emoji" | "upload";

// A three-section icon picker in a popover, used to set a page's icon: a
// colorable Lucide glyph grid, the emoji picker, and a custom image upload.
// frimousse provides the (unstyled) emoji picker; we anchor everything with a
// Radix popover so it matches the rest of the app's menu surfaces. This shell
// owns the popover, the tab bar, and the "Remove" action; each tab's body lives
// in its own `icon-picker-*-section` module.
export function IconPicker({
  children,
  value,
  onSelect,
  onRemove,
  align = "start",
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("glyph");

  const current = parseIcon(value);

  // `close` lets a recolor of an already-chosen glyph apply in place (popover
  // stays open) while picking a brand-new icon dismisses the popover.
  const select = (icon: string, close = true) => {
    onSelect(icon);
    if (close) setOpen(false);
  };

  return (
    <RPopover.Root open={open} onOpenChange={setOpen}>
      <RPopover.Trigger asChild>{children}</RPopover.Trigger>
      <RPopover.Portal>
        <RPopover.Content
          align={align}
          sideOffset={6}
          className="scribe-pop z-50 flex w-[19rem] flex-col overflow-hidden rounded-lg border border-border bg-elevated text-text shadow-popover outline-none"
        >
          <div className="flex items-center gap-1 border-b border-border p-1.5">
            <TabButton
              active={tab === "glyph"}
              onClick={() => {
                setTab("glyph");
              }}
            >
              Icons
            </TabButton>
            <TabButton
              active={tab === "emoji"}
              onClick={() => {
                setTab("emoji");
              }}
            >
              Emoji
            </TabButton>
            <TabButton
              active={tab === "upload"}
              onClick={() => {
                setTab("upload");
              }}
            >
              Upload
            </TabButton>
            <div className="flex-1" />
            {value && (
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  setOpen(false);
                }}
                className="h-7 shrink-0 rounded-md px-2 text-xs font-medium text-muted outline-none transition-colors hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
              >
                Remove
              </button>
            )}
          </div>

          <div className="h-[20rem]">
            {tab === "glyph" && (
              <GlyphSection current={current} onSelect={select} />
            )}
            {tab === "emoji" && <EmojiSection onSelect={select} />}
            {tab === "upload" && <UploadSection onSelect={select} />}
          </div>
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 rounded-md px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-hover text-text" : "text-muted hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
