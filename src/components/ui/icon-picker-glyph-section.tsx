import { DynamicIcon, iconNames } from "lucide-react/dynamic";
import { useMemo, useState } from "react";

import { type IconValue, serializeIcon } from "@/data/icon";
import { NoColorIcon } from "@/editor/icons";
import { TEXT_COLORS } from "@/editor/palette";
import { cn } from "@/lib/utils";

import { Tooltip } from "./tooltip";
import { useInfiniteReveal } from "./use-infinite-reveal";

// How many Lucide glyphs to reveal per batch. Each `DynamicIcon` lazy-loads its
// own module, so rendering the full ~1,500-icon set at once would fire that many
// imports; instead we render a page at a time and load more as the user scrolls.
const GLYPH_PAGE_SIZE = 96;

// Glyph grid with a color footer. The grid previews always render in the
// default text color; the footer color only sets the tint stored on select
// (null = inherit the page's text color). When a glyph is already chosen,
// picking a color recolors it in place without forcing a re-select.
export function GlyphSection({
  current,
  onSelect,
}: {
  current: IconValue | null;
  onSelect: (icon: string, close?: boolean) => void;
}) {
  const currentGlyph = current?.type === "glyph" ? current : null;
  const [query, setQuery] = useState("");
  const [color, setColor] = useState<string | null>(
    currentGlyph?.color ?? null,
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? iconNames.filter((name) => name.includes(q)) : iconNames;
  }, [query]);

  const { visibleCount, hasMore, sentinelRef } = useInfiniteReveal({
    total: matches.length,
    pageSize: GLYPH_PAGE_SIZE,
    resetKey: query,
  });
  const results = matches.slice(0, visibleCount);

  // Picking a color stages it for the next glyph pick, and — if a glyph is
  // already chosen — immediately recolors that existing glyph in place.
  const pickColor = (next: string | null) => {
    setColor(next);
    if (currentGlyph) {
      onSelect(
        serializeIcon({ type: "glyph", name: currentGlyph.name, color: next }),
        false,
      );
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="Search icons…"
          className="h-8 w-full rounded-md border border-border bg-bg px-2.5 text-sm text-text outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="grid flex-1 auto-rows-min grid-cols-8 gap-0.5 overflow-y-auto p-1.5 text-text">
        {results.length === 0 ? (
          <p className="col-span-8 mt-8 text-center text-sm text-muted">
            No icons found.
          </p>
        ) : (
          <>
            {results.map((name) => (
              <Tooltip key={name} content={name}>
                <button
                  type="button"
                  aria-label={name}
                  onClick={() => {
                    onSelect(serializeIcon({ type: "glyph", name, color }));
                  }}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md outline-none transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring",
                    currentGlyph?.name === name && "bg-selected",
                  )}
                >
                  <DynamicIcon name={name} size={18} aria-hidden />
                </button>
              </Tooltip>
            ))}
            {hasMore && (
              <div ref={sentinelRef} aria-hidden className="col-span-8 h-1" />
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-8 place-items-center gap-y-2 border-t border-border px-3 py-2.5">
        <ColorSwatch
          active={color === null}
          color={null}
          onClick={() => {
            pickColor(null);
          }}
        />
        {TEXT_COLORS.map((swatch) => (
          <ColorSwatch
            key={swatch.value}
            active={color === swatch.value}
            color={swatch.value}
            title={swatch.name}
            onClick={() => {
              pickColor(swatch.value);
            }}
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
      <Tooltip content="No color">
        <button
          type="button"
          aria-label="No color"
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted outline-none transition-all",
            "focus-visible:ring-2 focus-visible:ring-ring",
            active
              ? "ring-2 ring-ring ring-offset-1 ring-offset-elevated"
              : "hover:scale-110 hover:text-text",
          )}
        >
          <NoColorIcon size={18} />
        </button>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={title ?? "Color"}>
      <button
        type="button"
        aria-label={title ?? "Color"}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "h-5 w-5 shrink-0 rounded-full outline-none transition-all",
          "focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "ring-2 ring-ring ring-offset-1 ring-offset-elevated"
            : "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] hover:scale-110 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]",
        )}
        style={{ background: color }}
      />
    </Tooltip>
  );
}
