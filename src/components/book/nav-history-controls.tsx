import { Tooltip } from "@/components/ui/tooltip";
import { useUIStore } from "@/store/ui";

import { ArrowLeftIcon, ArrowRightIcon } from "./icons";

// Shared with the Title Page's top-bar chrome buttons: a quiet 7x7 square that
// warms on hover and dims when there's nowhere to go.
const BUTTON_CLASS =
  "flex h-7 w-7 items-center justify-center rounded-md text-muted outline-none transition-colors hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

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
      <Tooltip content="Back">
        <button
          type="button"
          aria-label="Back"
          disabled={!canGoBack}
          onClick={goBack}
          className={BUTTON_CLASS}
        >
          <ArrowLeftIcon size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Forward">
        <button
          type="button"
          aria-label="Forward"
          disabled={!canGoForward}
          onClick={goForward}
          className={BUTTON_CLASS}
        >
          <ArrowRightIcon size={16} />
        </button>
      </Tooltip>
    </div>
  );
}
