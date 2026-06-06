/* eslint-disable react-refresh/only-export-components */
import * as RTooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export const TooltipProvider = RTooltip.Provider;

// Lightweight tooltip: wraps a trigger and shows a token-styled label. Uses a
// short delay so it feels responsive without being noisy.
export function Tooltip({
  content,
  children,
  side = "bottom",
}: {
  content: ReactNode;
  children: ReactNode;
  side?: RTooltip.TooltipContentProps["side"];
}) {
  return (
    <RTooltip.Root delayDuration={300}>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          sideOffset={6}
          className="scribe-pop z-50 rounded-md border border-border bg-elevated px-2 py-1 text-xs text-text shadow-popover"
        >
          {content}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}
