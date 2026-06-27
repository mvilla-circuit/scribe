import * as RPopover from "@radix-ui/react-popover";
import { RectangleHorizontal } from "lucide-react";
import { useState } from "react";

import { BANNER_COLORS } from "@/editor/palette";
import { SwatchGrid } from "@/editor/SwatchGrid";
import { makeIcon } from "@/lib/makeIcon";
import { cn } from "@/lib/utils";

import { Tooltip } from "./Tooltip";

const BannerGlyph = makeIcon(RectangleHorizontal);

// The breadcrumb-toolbar control for a page's full-width banner. The pill opens
// a swatch grid: picking a wash sets (or recolors) the banner, and the clear
// chip removes it. `value` is the page's stored `banner_color` (null = off),
// which drives both the pressed state and the active swatch ring.
export function BannerControl({
  value,
  onChange,
}: {
  value: string | null;
  /** Receives the picked swatch value, or null to remove the banner. */
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = value !== null;

  return (
    <RPopover.Root open={open} onOpenChange={setOpen}>
      <Tooltip content={active ? "Banner color" : "Add banner"}>
        <RPopover.Trigger asChild>
          <button
            type="button"
            aria-label={active ? "Banner color" : "Add banner"}
            aria-pressed={active}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              active || open
                ? "bg-selected text-text"
                : "text-muted hover:bg-hover hover:text-text",
            )}
          >
            <BannerGlyph size={16} />
          </button>
        </RPopover.Trigger>
      </Tooltip>
      <RPopover.Portal>
        <RPopover.Content
          align="end"
          sideOffset={6}
          className="scribe-pop z-50 w-[12rem] rounded-lg border border-border bg-elevated p-3 text-text shadow-popover outline-none"
        >
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.07em] text-muted">
            Banner
          </div>
          <SwatchGrid
            swatches={BANNER_COLORS}
            value={value}
            onChange={onChange}
            clearLabel="No banner"
          />
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}
