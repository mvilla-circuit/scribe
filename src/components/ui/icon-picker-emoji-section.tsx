import { EmojiPicker } from "frimousse";

import { serializeIcon } from "@/data/icon";
import { cn } from "@/lib/utils";

// The emoji tab: frimousse's unstyled emoji picker skinned to match the app's
// menu surfaces. Selecting an emoji stores it as an encoded icon value.
export function EmojiSection({
  onSelect,
}: {
  onSelect: (icon: string) => void;
}) {
  return (
    <EmojiPicker.Root
      className="flex h-full flex-col"
      onEmojiSelect={({ emoji }) => {
        onSelect(serializeIcon({ type: "emoji", emoji }));
      }}
    >
      <div className="border-b border-border p-2">
        <EmojiPicker.Search
          placeholder="Search emoji…"
          className="h-8 w-full rounded-md border border-border bg-bg px-2.5 text-sm text-text outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <EmojiPicker.Viewport className="relative flex-1 outline-none">
        <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-muted">
          Loading…
        </EmojiPicker.Loading>
        <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-muted">
          No emoji found.
        </EmojiPicker.Empty>
        <EmojiPicker.List
          className="select-none pb-1.5"
          components={{
            CategoryHeader: ({ category, ...props }) => (
              <div
                className="bg-elevated px-2 pb-1 pt-2 text-xs font-medium text-muted"
                {...props}
              >
                {category.label}
              </div>
            ),
            Row: ({ children, ...props }) => (
              <div className="scroll-my-1 px-1.5" {...props}>
                {children}
              </div>
            ),
            Emoji: ({ emoji, ...props }) => (
              <button
                type="button"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md text-lg outline-none",
                  emoji.isActive && "bg-hover",
                )}
                {...props}
              >
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  );
}
