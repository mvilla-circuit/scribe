import { Maximize2, PanelRight, Square } from "lucide-react";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type RowOpenMode, useUIStore } from "@/store/ui";

const MODES: { mode: RowOpenMode; label: string; Icon: typeof Square }[] = [
  { mode: "modal", label: "Open in modal", Icon: Square },
  { mode: "split", label: "Open in side panel", Icon: PanelRight },
  { mode: "full", label: "Open full page", Icon: Maximize2 },
];

/**
 * A segmented control that switches how a datagrid row opens (modal / split /
 * full) and remembers the choice per datagrid via the UI store.
 */
export function RowOpenModeControl() {
  const rowOpenMode = useUIStore((s) => s.rowOpenMode);
  const setRowOpenMode = useUIStore((s) => s.setRowOpenMode);

  return (
    <div
      role="group"
      aria-label="Row open mode"
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5"
    >
      {MODES.map(({ mode, label, Icon }) => {
        const active = rowOpenMode === mode;
        return (
          <Tooltip key={mode} content={label}>
            <button
              type="button"
              aria-label={label}
              aria-pressed={active}
              onClick={() => {
                setRowOpenMode(mode);
              }}
              className={cn(
                "flex size-6 items-center justify-center rounded outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-selected text-text"
                  : "text-muted hover:bg-hover hover:text-text",
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
