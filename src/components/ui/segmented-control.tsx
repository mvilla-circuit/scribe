import { type ComponentType, Fragment } from "react";

import { cn } from "@/lib/utils";

import { Tooltip } from "./tooltip";

interface SegmentedControlSegment<Value extends string = string> {
  value: Value;
  label: string;
  /** Icon-only rendering when set; the label becomes the tooltip + accessible name. */
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

interface SegmentedControlProps<Value extends string> {
  segments: readonly SegmentedControlSegment<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  /** Accessible name for the `role="group"` wrapper. */
  "aria-label"?: string;
  className?: string;
}

/**
 * A row of mutually-exclusive options rendered as pressed/unpressed buttons
 * inside a single `role="group"` container — e.g. the datagrid row-open-mode
 * switch or a grid/list layout toggle. Icon-only segments get a `Tooltip` so
 * the control stays legible without widening; segments whose label renders
 * inline skip the tooltip since the text is already visible.
 */
export function SegmentedControl<Value extends string>({
  segments,
  value,
  onChange,
  className,
  ...groupProps
}: SegmentedControlProps<Value>) {
  return (
    <div
      role="group"
      aria-label={groupProps["aria-label"]}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5",
        className,
      )}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        const Icon = segment.icon;

        const button = (
          <button
            type="button"
            aria-pressed={active}
            aria-label={Icon ? segment.label : undefined}
            onClick={() => {
              onChange(segment.value);
            }}
            className={cn(
              "flex items-center justify-center rounded outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              Icon ? "size-6" : "px-2 py-1 text-sm",
              active
                ? "bg-selected text-text"
                : "text-muted hover:bg-hover hover:text-text",
            )}
          >
            {Icon ? <Icon className="size-3.5" aria-hidden /> : segment.label}
          </button>
        );

        return Icon ? (
          <Tooltip key={segment.value} content={segment.label}>
            {button}
          </Tooltip>
        ) : (
          <Fragment key={segment.value}>{button}</Fragment>
        );
      })}
    </div>
  );
}
