import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { nextActiveIndex } from "@/editor/list-navigation";
import { cn } from "@/lib/utils";

import type { SlashItem } from "./slash-items";

export interface SlashMenuProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

export interface SlashMenuRef {
  // Returns true when the key was consumed, so the editor keymap stands down.
  onKeyDown: (event: KeyboardEvent) => boolean;
}

// The slash popup: icon + title + description rows, full keyboard navigation,
// hover highlight, and a "No results" state. Positioning is owned by the
// SlashCommand extension's Floating UI wiring; this only renders + selects.
export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(
  function SlashMenu({ items, command }, ref) {
    const [selected, setSelected] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    // Whenever the filtered set changes, snap back to the first row. Done during
    // render (not in an effect) to avoid a cascading re-render.
    const [prevItems, setPrevItems] = useState(items);
    if (items !== prevItems) {
      setPrevItems(items);
      setSelected(0);
    }

    useEffect(() => {
      const el = listRef.current?.querySelector<HTMLElement>(
        `[data-idx="${selected}"]`,
      );
      el?.scrollIntoView({ block: "nearest" });
    }, [selected]);

    useImperativeHandle(ref, () => ({
      onKeyDown: (event) => {
        if (items.length === 0) {
          // Still swallow nav keys so they don't move the caret behind the menu.
          return ["ArrowUp", "ArrowDown", "Enter"].includes(event.key);
        }
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          setSelected((i) =>
            nextActiveIndex(i, event.key, { length: items.length, wrap: true }),
          );
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          const item = items[selected];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    return (
      // Don't steal focus from the editor while clicking a row; the rows
      // themselves are <button>s, so this container is presentational.
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Presentational container: the rows inside are real <button>s; this div only guards editor focus on mousedown.
      <div
        ref={listRef}
        className="scribe-slash-menu"
        onMouseDown={(e) => {
          e.preventDefault();
        }}
      >
        {items.length === 0 ? (
          <div className="scribe-slash-empty">No results</div>
        ) : (
          items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                data-idx={idx}
                onMouseEnter={() => {
                  setSelected(idx);
                }}
                onClick={() => {
                  command(item);
                }}
                className={cn(
                  "scribe-slash-row",
                  idx === selected && "is-selected",
                )}
              >
                <span className="scribe-slash-icon">
                  <Icon size={17} />
                </span>
                <span className="scribe-slash-text">
                  <span className="scribe-slash-title">{item.title}</span>
                  <span className="scribe-slash-desc">{item.description}</span>
                </span>
              </button>
            );
          })
        )}
      </div>
    );
  },
);
