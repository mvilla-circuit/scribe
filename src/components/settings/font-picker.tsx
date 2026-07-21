import * as RPopover from "@radix-ui/react-popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  type FontEntry,
  type FontRole,
  resolveFontEntry,
  ROLE_FONTS,
} from "@/fonts/catalog";
import {
  ensureFontLoaded,
  ensureFontReady,
  isFontLoaded,
} from "@/fonts/load-font";
import { metricsFor } from "@/fonts/metrics";
import { makeIcon } from "@/lib/make-icon";
import { matchesNormalizedQuery } from "@/lib/text-match";
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

function byFamilyName(a: FontEntry, b: FontEntry): number {
  return a.family.localeCompare(b.family);
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
  const listRef = useRef<HTMLDivElement>(null);
  const current = resolveFontEntry(value, role);
  const triggerMetrics = metricsFor(role, current.id);
  // Apply the trigger face only after cuts are ready (same anti-FOUT policy as
  // option rows). Until then the label stays on chrome sans. Track readiness by
  // font id so a selection change resets the face without syncing setState in
  // the effect body.
  const [readyFontId, setReadyFontId] = useState<string | null>(() =>
    isFontLoaded(current.id) ? current.id : null,
  );
  const triggerReady = readyFontId === current.id;

  const inheritMode = onInherit != null;
  const isInheriting = inheritMode && !overridden;
  // Highlight against the canonical catalog id so a stored legacy alias
  // (e.g. dm-sans → inter) still marks the successor option selected.
  const selectedId = inheritMode
    ? overridden
      ? current.id
      : undefined
    : current.id;

  useEffect(() => {
    let cancelled = false;
    void ensureFontReady(current.id, [
      triggerMetrics.regular,
      triggerMetrics.bold,
    ]).then((ready) => {
      if (!cancelled && ready) setReadyFontId(current.id);
    });
    return () => {
      cancelled = true;
    };
  }, [current.id, triggerMetrics.regular, triggerMetrics.bold]);

  // Bring the current selection into view whenever the popover opens.
  useEffect(() => {
    if (!open || selectedId == null) return;
    const frame = requestAnimationFrame(() => {
      const option = listRef.current?.querySelector<HTMLElement>(
        `[data-font-id="${selectedId}"]`,
      );
      if (option && typeof option.scrollIntoView === "function") {
        option.scrollIntoView({ block: "nearest" });
      }
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [open, selectedId]);

  const groups = useMemo(() => {
    const options = ROLE_FONTS[role].filter((f) =>
      matchesNormalizedQuery(f.family, query),
    );
    return {
      system: options.filter((f) => f.system).sort(byFamilyName),
      serif: options
        .filter((f) => !f.system && f.style === "serif")
        .sort(byFamilyName),
      sans: options
        .filter((f) => !f.system && f.style === "sans")
        .sort(byFamilyName),
      mono: options
        .filter((f) => !f.system && f.style === "mono")
        .sort(byFamilyName),
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
              className="truncate font-sans text-sm text-text"
              style={triggerReady ? { fontFamily: current.stack } : undefined}
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

        <div ref={listRef} className="flex-1 overflow-y-auto p-1.5">
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
            role={role}
            fonts={groups.system}
            selectedId={selectedId}
            onSelect={select}
          />
          <FontGroup
            label="Serif"
            role={role}
            fonts={groups.serif}
            selectedId={selectedId}
            onSelect={select}
          />
          <FontGroup
            label="Sans"
            role={role}
            fonts={groups.sans}
            selectedId={selectedId}
            onSelect={select}
          />
          <FontGroup
            label="Monospace"
            role={role}
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
  role,
  fonts,
  selectedId,
  onSelect,
}: {
  label: string;
  role: FontRole;
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
          role={role}
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
  role,
  selected,
  onSelect,
}: {
  font: FontEntry;
  role: FontRole;
  selected: boolean;
  onSelect: () => void;
}) {
  const metrics = metricsFor(role, font.id);
  // Apply the preview face only after CSS + glyph cuts are ready. Painting the
  // stack earlier FOUTs from the system fallback (at optical weights) into the
  // real glyphs when hover finishes loading — the size/weight jump users notice.
  const [faceReady, setFaceReady] = useState(false);

  const revealFace = () => {
    void ensureFontReady(font.id, [metrics.regular, metrics.bold]).then(
      (ready) => {
        if (ready) setFaceReady(true);
      },
    );
  };

  // Reveal once the face is already cached, or when this row is the selection
  // (the picker mount effect kicks that load off).
  useEffect(() => {
    if (faceReady) return;
    if (!selected && !isFontLoaded(font.id)) return;
    let cancelled = false;
    void ensureFontReady(font.id, [metrics.regular, metrics.bold]).then(
      (ready) => {
        if (!cancelled && ready) setFaceReady(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [selected, faceReady, font.id, metrics.regular, metrics.bold]);

  return (
    <button
      type="button"
      data-font-id={font.id}
      onClick={onSelect}
      onPointerEnter={revealFace}
      onFocus={revealFace}
      className={cn(
        // Fixed row height + line boxes keep the list stable while a face
        // reveals after load.
        "flex h-[3.25rem] w-full flex-col justify-center gap-0.5 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-hover focus-visible:bg-hover",
        selected && "bg-selected",
      )}
    >
      <span className="flex h-5 items-center justify-between gap-2">
        <span className="truncate font-sans text-[0.95rem] leading-5 text-text">
          {font.family}
        </span>
        <span className="inline-flex size-[15px] shrink-0 items-center justify-center">
          {selected && <CheckIcon size={15} className="text-accent" />}
        </span>
      </span>
      <span
        className="h-4 truncate font-sans text-xs leading-4 text-muted"
        style={
          faceReady
            ? { fontFamily: font.stack, fontWeight: metrics.regular }
            : undefined
        }
      >
        The quick brown fox{" "}
        <span style={faceReady ? { fontWeight: metrics.bold } : undefined}>
          jumps
        </span>{" "}
        <span style={faceReady ? { fontStyle: "italic" } : undefined}>
          over the lazy dog
        </span>
      </span>
    </button>
  );
}
