import * as RPopover from "@radix-ui/react-popover";
import { RotateCcw } from "lucide-react";
import { cn } from "../../lib/utils";
import { makeIcon } from "../../lib/makeIcon";
import {
  FONT_ROLES,
  type FontMap,
  type FontRole,
  type ResolvedFonts,
} from "../../fonts/catalog";
import { FontPicker } from "../settings/FontPicker";
import { Tooltip } from "../ui/Tooltip";

const ResetIcon = makeIcon(RotateCcw);

const ROLE_META: Record<FontRole, { label: string }> = {
  display: { label: "Titles" },
  text: { label: "Body" },
  code: { label: "Code" },
};

type FontControlProps = {
  /** Popover heading, e.g. "Book fonts" or "Page fonts". */
  heading: string;
  /** Name of the level inherited from, e.g. "global" or "book". */
  inheritLabel: string;
  /** This level's own per-role overrides. */
  overrides: FontMap;
  /** The fully-resolved map inherited from the level above. */
  inherited: ResolvedFonts;
  onSet: (role: FontRole, fontId: string) => void;
  onClear: (role: FontRole) => void;
  onClearAll: () => void;
  /** Extra classes for the trigger (positioning, hover-reveal). */
  triggerClassName?: string;
};

// A quiet inline "Aa" control that overrides the Display / Text / Code fonts for
// this book or page. It is the same picker as global Settings, but each role
// defaults to the value inherited from the level above (global -> book -> page)
// and can be reset back to it.
export function FontControl({
  heading,
  inheritLabel,
  overrides,
  inherited,
  onSet,
  onClear,
  onClearAll,
  triggerClassName,
}: FontControlProps) {
  const hasOverrides = FONT_ROLES.some((role) => overrides[role] != null);

  return (
    <RPopover.Root>
      <Tooltip content="Fonts">
        <RPopover.Trigger asChild>
          <button
            type="button"
            aria-label="Fonts"
            className={cn(
              "flex h-7 items-center justify-center rounded-md px-1.5 text-sm text-muted outline-none transition-colors hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-hover data-[state=open]:text-text",
              triggerClassName
            )}
          >
            <span className="leading-none">
              A<span className="text-[0.8em]">a</span>
            </span>
          </button>
        </RPopover.Trigger>
      </Tooltip>
      <RPopover.Portal>
        <RPopover.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="scribe-pop z-50 w-[19rem] rounded-lg border border-border bg-elevated p-3 text-text shadow-popover outline-none"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">{heading}</p>
              <p className="text-xs text-muted">Overrides {inheritLabel}</p>
            </div>
            {hasOverrides && (
              <button
                type="button"
                onClick={onClearAll}
                className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted outline-none transition-colors hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ResetIcon size={12} />
                Reset all
              </button>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {FONT_ROLES.map((role) => (
              <div key={role}>
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="text-xs font-medium text-text">
                    {ROLE_META[role].label}
                  </span>
                </div>
                <FontPicker
                  role={role}
                  value={overrides[role] ?? inherited[role]}
                  overridden={overrides[role] != null}
                  inheritLabel={inheritLabel}
                  onSelect={(id) => onSet(role, id)}
                  onInherit={() => onClear(role)}
                />
              </div>
            ))}
          </div>
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}
