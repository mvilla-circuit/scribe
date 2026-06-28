import { useEffect, useMemo, useRef, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DocumentIcon } from "@/components/ui/document-icon";
import { type PageLinkOption, useEditorBridge } from "@/editor/editor-bridge";
import { BookIcon, PageLinkIcon } from "@/editor/icons";
import { cn } from "@/lib/utils";

import { usePagePicker } from "./page-picker-store";

type Row = PageLinkOption;

// A search-driven picker over every page and book (cross-book). Opened by the
// "Link to page" slash item; selecting a row hands the target back through the
// pagePicker store, which inserts a page card.
export function PagePicker() {
  const onSelect = usePagePicker((s) => s.onSelect);
  const close = usePagePicker((s) => s.close);
  const open = onSelect !== null;

  const { pageLinkOptions } = useEditorBridge();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? pageLinkOptions.filter(
          (r) =>
            r.label.toLowerCase().includes(q) ||
            r.subtitle.toLowerCase().includes(q),
        )
      : pageLinkOptions;
    return filtered.slice(0, 50);
  }, [pageLinkOptions, query]);

  // Reset transient state during render (per React's "you might not need an
  // effect") rather than in effects: clear the query/selection when the picker
  // opens, and snap back to the first row whenever the query changes.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setActive(0);
    }
  }
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setActive(0);
  }

  const choose = (row: Row) => {
    onSelect?.({
      targetType: row.targetType,
      targetId: row.targetId,
      label: row.label,
    });
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[active];
      if (row) choose(row);
    }
  };

  // Keep the highlighted row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${active}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active, rows]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="p-0">
        <DialogTitle className="sr-only">Link to a page</DialogTitle>
        <div className="border-b border-border p-2.5">
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search pages and books…"
            className="h-9 w-full rounded-md border border-border bg-bg px-3 text-sm text-text outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div ref={listRef} className="max-h-[20rem] overflow-y-auto p-1.5">
          {rows.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted">
              No pages found.
            </p>
          ) : (
            rows.map((row, idx) => (
              <button
                key={`${row.targetType}:${row.targetId}`}
                type="button"
                data-idx={idx}
                onMouseEnter={() => {
                  setActive(idx);
                }}
                onClick={() => {
                  choose(row);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-none transition-colors",
                  idx === active ? "bg-selected" : "hover:bg-hover",
                )}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted">
                  {row.icon ? (
                    <DocumentIcon icon={row.icon} size={18} />
                  ) : row.glyph === "book" ? (
                    <BookIcon size={16} />
                  ) : (
                    <PageLinkIcon size={16} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text">
                    {row.label}
                  </span>
                  {row.subtitle && (
                    <span className="block truncate text-xs text-muted">
                      {row.subtitle}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
