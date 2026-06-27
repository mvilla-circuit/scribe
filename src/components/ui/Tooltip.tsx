/* eslint-disable react-refresh/only-export-components */
import * as RTooltip from "@radix-ui/react-tooltip";
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

export const TooltipProvider = RTooltip.Provider;

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: RTooltip.TooltipContentProps["side"];
} & Omit<
  ComponentPropsWithoutRef<typeof RTooltip.Trigger>,
  "content" | "children" | "asChild"
>;

// Lightweight tooltip: wraps a trigger and shows a high-contrast "inverse" chip
// (near-black on light mode, light on dark mode) so it reads as a tooltip rather
// than a popover card. Uses a short delay so it feels responsive without being
// noisy.
//
// Forwards its ref and any extra props onto the trigger child via Radix `Slot`,
// so it composes correctly when used as another `asChild` trigger's child — e.g.
// `<RPopover.Trigger asChild><Tooltip><button/></Tooltip></RPopover.Trigger>`.
// Without this forwarding, the outer trigger's onClick/ref would land on Tooltip
// (a plain component) and never reach the button, so the popover never opens.
export const Tooltip = forwardRef<HTMLButtonElement, TooltipProps>(
  function Tooltip({ content, children, side = "bottom", ...triggerProps }, ref) {
    return (
      <RTooltip.Root delayDuration={300}>
        <RTooltip.Trigger asChild ref={ref} {...triggerProps}>
          {children}
        </RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content
            side={side}
            sideOffset={6}
          className="scribe-pop z-50 rounded-md bg-inverted px-2 py-1 text-xs text-inverted-text shadow-popover"
        >
          {content}
          <RTooltip.Arrow className="fill-inverted" />
        </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    );
  }
);
