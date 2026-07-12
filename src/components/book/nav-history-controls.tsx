import { IconButton } from "@/components/ui/icon-button";
import { useUIStore } from "@/store/ui";

import { ArrowLeftIcon, ArrowRightIcon } from "./icons";

/**
 * Back/forward buttons that step through the app-wide navigation history in the
 * UI store. Sits at the left of the page top bar (before the breadcrumb trail on
 * document pages, and standalone on the Title Page); each button dims when its
 * direction is exhausted.
 */
export function NavHistoryControls() {
  const canGoBack = useUIStore((s) => s.historyIndex > 0);
  const canGoForward = useUIStore((s) => s.historyIndex < s.history.length - 1);
  const goBack = useUIStore((s) => s.goBack);
  const goForward = useUIStore((s) => s.goForward);

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <IconButton label="Back" size="sm" disabled={!canGoBack} onClick={goBack}>
        <ArrowLeftIcon size={16} />
      </IconButton>
      <IconButton
        label="Forward"
        size="sm"
        disabled={!canGoForward}
        onClick={goForward}
      >
        <ArrowRightIcon size={16} />
      </IconButton>
    </div>
  );
}
