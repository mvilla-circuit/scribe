import { RectangleHorizontal } from "lucide-react";
import { useState } from "react";

import { BANNER_COLORS } from "@/editor/palette";
import { SwatchGrid } from "@/editor/swatch-grid";
import { makeIcon } from "@/lib/make-icon";

import { IconButton } from "./icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Tooltip } from "./tooltip";

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
  const label = active ? "Banner color" : "Add banner";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip content={label}>
        <PopoverTrigger asChild>
          <IconButton
            label={label}
            size="sm"
            tooltip={false}
            selected={active || open}
            aria-pressed={active}
          >
            <BannerGlyph size={16} />
          </IconButton>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="end" className="w-[12rem] p-3">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.07em] text-muted">
          Banner
        </div>
        <SwatchGrid
          swatches={BANNER_COLORS}
          value={value}
          onChange={onChange}
          clearLabel="No banner"
        />
      </PopoverContent>
    </Popover>
  );
}
