import { Children, Fragment, isValidElement, type ReactNode } from "react";

import { DocumentIcon } from "@/components/ui/document-icon";
import { IconPicker } from "@/components/ui/icon-picker";
import { Tooltip } from "@/components/ui/tooltip";

interface MastheadProps {
  /** The current icon id, or null when none is set. */
  icon: string | null;
  onSelectIcon: (icon: string) => void;
  onRemoveIcon: () => void;
  /** Accessible label for the change-icon trigger, e.g. "Change page icon". */
  changeIconLabel: string;
  /**
   * Extra hover affordances shown beside "Add icon" above the title
   * (e.g. "Add cover"). Revealed with the same masthead hover/focus group.
   */
  actions?: ReactNode;
  /**
   * The title block shown with the icon. The first child is treated as the
   * title line the icon vertically centers against; any further siblings
   * (subtitle, tags, …) render below that line. Fragments are flattened so
   * book/document title blocks (`<>title + subtitle</>`) still center on the
   * title alone.
   */
  children: ReactNode;
}

/** Flatten React fragments so a single `<>…</>` child expands into siblings. */
function flattenChildren(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === Fragment
    ) {
      return flattenChildren(child.props.children);
    }
    return [child];
  });
}

// The shared title masthead for the book cover and document pages: an icon plus
// the title block, composed so the two read as one header.
//
// On wide viewports the set icon "hangs" in the left margin of the title line
// (an absolute `right-full` offset), vertically centered on that line alone so
// a subtitle or tags below cannot pull it down. On narrower viewports there's
// no room in the margin, so the icon drops onto its own row directly above the
// title (the classic stacked layout). The empty "Add icon" affordance always
// stays stacked with any actions, since a wide pill doesn't belong in the
// margin.
export function Masthead({
  icon,
  onSelectIcon,
  onRemoveIcon,
  changeIconLabel,
  actions,
  children,
}: MastheadProps) {
  const showActionsRow = !icon || Boolean(actions);
  const childArray = flattenChildren(children);
  const titleChild = childArray[0];
  const restChildren = childArray.slice(1);

  return (
    <header className="group/masthead relative">
      {showActionsRow && (
        <div
          data-testid="masthead-actions-row"
          className="mb-2 flex items-center gap-1"
        >
          {!icon && (
            <MastheadIconControl
              icon={icon}
              onSelect={onSelectIcon}
              onRemove={onRemoveIcon}
              changeLabel={changeIconLabel}
            />
          )}
          {actions}
        </div>
      )}
      <div data-testid="masthead-title" className="relative">
        <div data-testid="masthead-title-line" className="relative">
          {icon && (
            <div
              data-testid="masthead-icon"
              className="mb-2 xl:absolute xl:right-full xl:top-1/2 xl:mb-0 xl:mr-3 xl:-translate-y-1/2"
            >
              <MastheadIconControl
                icon={icon}
                onSelect={onSelectIcon}
                onRemove={onRemoveIcon}
                changeLabel={changeIconLabel}
              />
            </div>
          )}
          {titleChild}
        </div>
        {restChildren}
      </div>
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
            className="rounded-md leading-none outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:scale-100"
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
