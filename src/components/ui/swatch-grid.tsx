import { type MouseEventHandler, type ReactNode } from "react";

import { NoColorIcon } from "@/editor/icons";
import { cn } from "@/lib/utils";

import { Tooltip } from "./tooltip";

/** Shared 5-col layout for every Accent-style color palette in the app. */
const SWATCH_GRID_CLASS = "grid grid-cols-5 place-items-center gap-y-2.5";

const DOT_BASE =
  "h-6 w-6 rounded-full outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring";

const DOT_ACTIVE = "ring-2 ring-ring ring-offset-2 ring-offset-elevated";

const DOT_IDLE =
  "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] hover:scale-110 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]";

export interface SwatchItem {
  name: string;
  value: string;
}

/**
 * One circular color chip in the shared Accent chrome (`h-6 w-6`, ring-offset
 * when active). Used by editor palettes and Morandi hue grids alike.
 */
export function SwatchDot({
  label,
  ariaLabel = label,
  background,
  active,
  onClick,
  onMouseDown,
}: {
  /** Tooltip text (and default accessible name). */
  label: string;
  /** Accessible name when it should differ from the tooltip (e.g. richer context). */
  ariaLabel?: string;
  background: string;
  active: boolean;
  onClick: () => void;
  onMouseDown?: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <Tooltip content={label} side="top">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-pressed={active}
        onMouseDown={onMouseDown}
        onClick={onClick}
        className={cn(DOT_BASE, active ? DOT_ACTIVE : DOT_IDLE)}
        style={{ background }}
      />
    </Tooltip>
  );
}

/**
 * Layout shell for a 5-wide swatch palette — size and spacing live only here
 * so every palette inherits the Accent grid.
 */
export function SwatchGridLayout({ children }: { children: ReactNode }) {
  return (
    <div data-testid="swatch-grid" className={SWATCH_GRID_CLASS}>
      {children}
    </div>
  );
}

/**
 * Generic swatch palette: optional leading clear chip, then one `SwatchDot`
 * per item. `value` matches an item `value`, or is null when cleared / unset.
 */
export function SwatchGrid({
  swatches,
  value,
  onChange,
  clearLabel,
  onSwatchMouseDown,
}: {
  swatches: SwatchItem[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** When set, renders the slashed clear chip as the first cell. */
  clearLabel?: string;
  /** Optional mousedown hook (e.g. editor selection preservation). */
  onSwatchMouseDown?: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <SwatchGridLayout>
      {clearLabel !== undefined && (
        <Tooltip content={clearLabel} side="top">
          <button
            type="button"
            aria-label={clearLabel}
            aria-pressed={!value}
            onMouseDown={onSwatchMouseDown}
            onClick={() => {
              onChange(null);
            }}
            className={cn(
              "flex items-center justify-center text-muted",
              DOT_BASE,
              !value ? DOT_ACTIVE : DOT_IDLE,
            )}
          >
            <NoColorIcon size={16} />
          </button>
        </Tooltip>
      )}
      {swatches.map((s) => (
        <SwatchDot
          key={s.value}
          label={s.name}
          background={s.value}
          active={value === s.value}
          onMouseDown={onSwatchMouseDown}
          onClick={() => {
            onChange(s.value);
          }}
        />
      ))}
    </SwatchGridLayout>
  );
}
