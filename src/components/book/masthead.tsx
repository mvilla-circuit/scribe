import { type ReactNode } from "react";

import { DocumentIcon } from "@/components/ui/document-icon";
import { IconPicker } from "@/components/ui/icon-picker";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MastheadProps {
  /** The current icon id, or null when none is set. */
  icon: string | null;
  onSelectIcon: (icon: string) => void;
  onRemoveIcon: () => void;
  /** Accessible label for the change-icon trigger, e.g. "Change page icon". */
  changeIconLabel: string;
  /** The title block (title, subtitle, and any meta) shown with the icon. */
  children: ReactNode;
}

// The shared title masthead for the book cover and document pages: an icon plus
// the title block, composed so the two read as one header.
//
// On wide viewports the icon "hangs" in the left margin (an absolute
// `right-full` offset), so the title sits flush with the body below it — no
// divider needed to reconcile their left edges. On narrower viewports there's no
// room in the margin, so the icon drops onto its own row directly above the
// title (the classic stacked layout). The empty "Add icon" affordance always
// stays stacked, since a wide pill doesn't belong in the margin.
export function Masthead({
  icon,
  onSelectIcon,
  onRemoveIcon,
  changeIconLabel,
  children,
}: MastheadProps) {
  return (
    <header className="group/masthead relative">
      <div
        className={cn(
          "mb-2",
          icon && "xl:absolute xl:right-full xl:top-0 xl:mr-3 xl:mb-0",
        )}
      >
        <MastheadIconControl
          icon={icon}
          onSelect={onSelectIcon}
          onRemove={onRemoveIcon}
          changeLabel={changeIconLabel}
        />
      </div>
      {children}
    </header>
  );
}

// The icon picker trigger: the 48px glyph when an icon is set, otherwise a quiet
// "Add icon" button revealed on hover/focus of the masthead.
function MastheadIconControl({
  icon,
  onSelect,
  onRemove,
  changeLabel,
}: {
  icon: string | null;
  onSelect: (icon: string) => void;
  onRemove: () => void;
  changeLabel: string;
}) {
  if (icon) {
    return (
      <IconPicker value={icon} onSelect={onSelect} onRemove={onRemove}>
        <Tooltip content="Change icon">
          <button
            type="button"
            aria-label={changeLabel}
            className="rounded-md leading-none outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <DocumentIcon icon={icon} size={48} />
          </button>
        </Tooltip>
      </IconPicker>
    );
  }

  return (
    <IconPicker value={icon} onSelect={onSelect} onRemove={onRemove}>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-muted opacity-0 outline-none transition-opacity hover:bg-hover hover:text-text focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/masthead:opacity-100"
      >
        <span className="text-base leading-none">☺</span>
        Add icon
      </button>
    </IconPicker>
  );
}
