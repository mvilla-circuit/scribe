import { useEffect, useMemo, useRef, useState } from "react";
import * as RPopover from "@radix-ui/react-popover";
import { EmojiPicker } from "frimousse";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";
import { cn } from "../../lib/utils";
import { parseIcon, serializeIcon, type IconValue } from "../../data/icon";
import { useUploadIcon } from "../../data/documents";
import { TEXT_COLORS } from "../../editor/palette";
import { NoColorIcon } from "../../editor/icons";

type IconPickerProps = {
  /** The trigger element. Rendered via Radix `asChild`. */
  children: React.ReactNode;
  value: string | null;
  /** Receives the encoded icon value (see `data/icon.ts`). */
  onSelect: (icon: string) => void;
  onRemove: () => void;
  align?: RPopover.PopoverContentProps["align"];
};

type Tab = "glyph" | "emoji" | "upload";

// How many Lucide glyphs to reveal per batch. Each `DynamicIcon` lazy-loads its
// own module, so rendering the full ~1,500-icon set at once would fire that many
// imports; instead we render a page at a time and load more as the user scrolls.
const GLYPH_PAGE_SIZE = 96;

// A three-section icon picker in a popover, used to set a page's icon: a
// colorable Lucide glyph grid, the emoji picker, and a custom image upload.
// frimousse provides the (unstyled) emoji picker; we anchor everything with a
// Radix popover so it matches the rest of the app's menu surfaces.
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
            <TabButton active={tab === "glyph"} onClick={() => setTab("glyph")}>
              Icons
            </TabButton>
            <TabButton active={tab === "emoji"} onClick={() => setTab("emoji")}>
              Emoji
            </TabButton>
            <TabButton
              active={tab === "upload"}
              onClick={() => setTab("upload")}
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
        active ? "bg-hover text-text" : "text-muted hover:text-text"
      )}
    >
      {children}
    </button>
  );
}

// Glyph grid with a color footer. The footer color tints both the grid preview
// and the value stored on select (null = inherit the page's text color). When a
// glyph is already chosen, picking a color recolors it in place without forcing
// the user to re-select the glyph.
function GlyphSection({
  current,
  onSelect,
}: {
  current: IconValue | null;
  onSelect: (icon: string, close?: boolean) => void;
}) {
  const currentGlyph = current?.type === "glyph" ? current : null;
  const [query, setQuery] = useState("");
  const [color, setColor] = useState<string | null>(
    currentGlyph?.color ?? null
  );
  const [visibleCount, setVisibleCount] = useState(GLYPH_PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? iconNames.filter((name) => name.includes(q)) : iconNames;
  }, [query]);

  // Reset the reveal window whenever the search changes so each query starts
  // from the top with a fresh first page (adjusting state during render rather
  // than in an effect, per React's "you might not need an effect" guidance).
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setVisibleCount(GLYPH_PAGE_SIZE);
  }

  const results = matches.slice(0, visibleCount);
  const hasMore = visibleCount < matches.length;

  // Reveal the next page when the sentinel scrolls into view.
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => count + GLYPH_PAGE_SIZE);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, results.length]);

  // Picking a color stages it for the next glyph pick, and — if a glyph is
  // already chosen — immediately recolors that existing glyph in place.
  const pickColor = (next: string | null) => {
    setColor(next);
    if (currentGlyph) {
      onSelect(
        serializeIcon({ type: "glyph", name: currentGlyph.name, color: next }),
        false
      );
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons…"
          className="h-8 w-full rounded-md border border-border bg-bg px-2.5 text-sm text-text outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div
        className="grid flex-1 auto-rows-min grid-cols-8 gap-0.5 overflow-y-auto p-1.5"
        style={{ color: color ?? "var(--color-text)" }}
      >
        {results.length === 0 ? (
          <p className="col-span-8 mt-8 text-center text-sm text-muted">
            No icons found.
          </p>
        ) : (
          <>
            {results.map((name) => (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() =>
                  onSelect(serializeIcon({ type: "glyph", name, color }))
                }
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md outline-none transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring",
                  currentGlyph?.name === name && "bg-selected"
                )}
              >
                <DynamicIcon name={name as IconName} size={18} aria-hidden />
              </button>
            ))}
            {hasMore && (
              <div
                ref={sentinelRef}
                aria-hidden
                className="col-span-8 h-1"
              />
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
        <ColorSwatch
          active={color === null}
          color={null}
          onClick={() => pickColor(null)}
        />
        {TEXT_COLORS.map((swatch) => (
          <ColorSwatch
            key={swatch.value}
            active={color === swatch.value}
            color={swatch.value}
            title={swatch.name}
            onClick={() => pickColor(swatch.value)}
          />
        ))}
      </div>
    </div>
  );
}

function ColorSwatch({
  active,
  color,
  title,
  onClick,
}: {
  active: boolean;
  color: string | null;
  title?: string;
  onClick: () => void;
}) {
  // A null color means "no color" — inherit the page's text color. Render it as
  // a slashed circle rather than a filled swatch so it reads as the absence of a
  // tint instead of a black color.
  if (color === null) {
    return (
      <button
        type="button"
        title="No color"
        aria-label="No color"
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted outline-none transition-all",
          "focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "ring-2 ring-ring ring-offset-1 ring-offset-elevated"
            : "hover:scale-110 hover:text-text"
        )}
      >
        <NoColorIcon size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      title={title ?? "Color"}
      aria-label={title ?? "Color"}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-5 w-5 shrink-0 rounded-full outline-none transition-all",
        "focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "ring-2 ring-ring ring-offset-1 ring-offset-elevated"
          : "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] hover:scale-110 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
      )}
      style={{ background: color }}
    />
  );
}

function EmojiSection({ onSelect }: { onSelect: (icon: string) => void }) {
  return (
    <EmojiPicker.Root
      className="flex h-full flex-col"
      onEmojiSelect={({ emoji }) =>
        onSelect(serializeIcon({ type: "emoji", emoji }))
      }
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
                  emoji.isActive && "bg-hover"
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

function UploadSection({ onSelect }: { onSelect: (icon: string) => void }) {
  const uploadIcon = useUploadIcon();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const url = await uploadIcon.mutateAsync(file).catch(() => null);
    if (url) onSelect(serializeIcon({ type: "image", url }));
  };

  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={uploadIcon.isPending}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex w-full flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 text-sm outline-none transition-colors",
          "hover:border-ring hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring",
          dragging && "border-ring bg-hover",
          uploadIcon.isPending && "opacity-60"
        )}
      >
        <span className="font-medium text-text">
          {uploadIcon.isPending ? "Uploading…" : "Upload an image"}
        </span>
        <span className="text-xs text-muted">
          Click or drag a file here
        </span>
      </button>
      <p className="mt-3 text-center text-xs text-muted">
        PNG, JPG, WEBP, GIF or SVG · up to 1 MB
      </p>
    </div>
  );
}
