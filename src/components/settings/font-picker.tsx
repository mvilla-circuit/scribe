import * as RPopover from "@radix-ui/react-popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  type FontEntry,
  type FontRole,
  resolveFontEntry,
  ROLE_FONTS,
} from "@/fonts/catalog";
import { ensureFontLoaded } from "@/fonts/load-font";
import { makeIcon } from "@/lib/make-icon";
import { cn } from "@/lib/utils";

const CheckIcon = makeIcon(Check);
const ExpandIcon = makeIcon(ChevronsUpDown);

interface FontPickerProps {
  role: FontRole;
  /** The currently effective font id (resolved: override, else inherited). */
  value: string;
  onSelect: (fontId: string) => void;
  /**
   * Inheritance (book/page scope). When `onInherit` is provided the picker gains
   * an "Inherit" option at the top: `overridden` marks whether `value` is this
   * level's own choice or inherited, and `inheritLabel` names the source
   * (e.g. "global", "book"). Omit all of these for the base (global) picker.
   */
  overridden?: boolean;
  onInherit?: () => void;
  inheritLabel?: string;
}

// A searchable, live-previewed font picker for one role. The trigger shows the
// effective family in its own typeface; the popover lists curated options
// grouped by Serif/Sans (Code is flat), each rendered in its own font with true
// bold + italic samples. In book/page scope it also offers an "Inherit" option
// that follows the level above. Each option's web font loads lazily.
export function FontPicker({
  role,
  value,
  onSelect,
  overridden,
  onInherit,
  inheritLabel,
}: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = resolveFontEntry(value, role);

  const inheritMode = onInherit != null;
  const isInheriting = inheritMode && !overridden;
  // Only highlight a concrete option as selected when it is this level's own
  // choice; while inheriting, the "Inherit" row is the selected one instead.
  const selectedId = inheritMode ? (overridden ? value : undefined) : value;

  // Keep the trigger's preview face available.
  useEffect(() => {
    void ensureFontLoaded(current.id);
  }, [current.id]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const options = ROLE_FONTS[role].filter((f) =>
      q ? f.family.toLowerCase().includes(q) : true,
    );
    return {
      system: options.filter((f) => f.system),
      serif: options.filter((f) => !f.system && f.style === "serif"),
      sans: options.filter((f) => !f.system && f.style === "sans"),
      mono: options.filter((f) => !f.system && f.style === "mono"),
    };
  }, [role, query]);

  const noResults =
    groups.system.length === 0 &&
    groups.serif.length === 0 &&
    groups.sans.length === 0 &&
    groups.mono.length === 0;

  const select = (fontId: string) => {
    onSelect(fontId);
    setOpen(false);
  };

  const inherit = () => {
    onInherit?.();
    setOpen(false);
  };

  return (
    <RPopover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <RPopover.Trigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-bg px-3 py-2 text-left outline-none transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:ring-2 data-[state=open]:ring-ring"
        >
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span
              className="truncate text-sm text-text"
              style={{ fontFamily: current.stack }}
            >
              {current.family}
            </span>
            {isInheriting && (
              <span className="shrink-0 text-xs text-muted">· Inherited</span>
            )}
          </span>
          <ExpandIcon size={15} className="shrink-0 text-muted" />
        </button>
      </RPopover.Trigger>
      {/* Not portaled on purpose: rendering inline keeps the option list
          scrollable inside a Dialog (whose scroll lock would otherwise block a
          portaled popover) and inside the inline book/page font popover. */}
      <RPopover.Content
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="scribe-pop z-50 flex max-h-[min(22rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] min-w-[18rem] flex-col overflow-hidden rounded-lg border border-border bg-elevated text-text shadow-popover outline-none"
      >
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="Search fonts…"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-1.5">
          {inheritMode && query.trim() === "" && (
            <InheritOption
              role={role}
              inheritedFontId={value}
              inheritLabel={inheritLabel}
              selected={isInheriting}
              onSelect={inherit}
            />
          )}
          <FontGroup
            label="System"
            fonts={groups.system}
            selectedId={selectedId}
            onSelect={select}
          />
          <FontGroup
            label="Serif"
            fonts={groups.serif}
            selectedId={selectedId}
            onSelect={select}
          />
          <FontGroup
            label="Sans"
            fonts={groups.sans}
            selectedId={selectedId}
            onSelect={select}
          />
          <FontGroup
            label="Monospace"
            fonts={groups.mono}
            selectedId={selectedId}
            onSelect={select}
          />
          {noResults && (
            <p className="px-2 py-6 text-center text-sm text-muted">
              No fonts found.
            </p>
          )}
        </div>
      </RPopover.Content>
    </RPopover.Root>
  );
}

// The top "Inherit" row in book/page scope: follows the level above, previewing
// whatever font is currently inherited.
function InheritOption({
  role,
  inheritedFontId,
  inheritLabel,
  selected,
  onSelect,
}: {
  role: FontRole;
  inheritedFontId: string;
  inheritLabel?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const entry = resolveFontEntry(inheritedFontId, role);
  useEffect(() => {
    void ensureFontLoaded(entry.id);
  }, [entry.id]);

  return (
    <div className="mb-1 border-b border-border pb-1.5">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-hover focus-visible:bg-hover",
          selected && "bg-selected",
        )}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[0.95rem] text-text">Inherit</span>
          {selected && <CheckIcon size={15} className="shrink-0 text-accent" />}
        </span>
        <span className="truncate text-xs text-muted">
          {inheritLabel ? `From ${inheritLabel} · ` : ""}
          <span style={{ fontFamily: entry.stack }}>{entry.family}</span>
        </span>
      </button>
    </div>
  );
}

function FontGroup({
  label,
  fonts,
  selectedId,
  onSelect,
}: {
  label: string;
  fonts: FontEntry[];
  selectedId: string | undefined;
  onSelect: (fontId: string) => void;
}) {
  if (fonts.length === 0) return null;
  return (
    <div className="mb-1">
      <div className="px-2 pb-1 pt-1.5 text-xs font-medium text-muted">
        {label}
      </div>
      {fonts.map((font) => (
        <FontOption
          key={font.id}
          font={font}
          selected={font.id === selectedId}
          onSelect={() => {
            onSelect(font.id);
          }}
        />
      ))}
    </div>
  );
}

function FontOption({
  font,
  selected,
  onSelect,
}: {
  font: FontEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  // Load the preview face on first render; the browser repaints this row in the
  // real font as soon as it arrives (System options need nothing).
  useEffect(() => {
    void ensureFontLoaded(font.id);
  }, [font.id]);

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ fontFamily: font.stack }}
      className={cn(
        "flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-hover focus-visible:bg-hover",
        selected && "bg-selected",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[0.95rem] text-text">{font.family}</span>
        {selected && <CheckIcon size={15} className="shrink-0 text-accent" />}
      </span>
      <span className="truncate text-xs text-muted">
        The quick brown fox <span style={{ fontWeight: 700 }}>jumps</span>{" "}
        <span style={{ fontStyle: "italic" }}>over the lazy dog</span>
      </span>
    </button>
  );
}
