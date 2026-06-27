import { useEffect, useState } from "react";

import { DocumentIcon } from "@/components/ui/document-icon";
import { EssayIcon } from "@/editor/icons";
import type { OutlineHeading } from "@/editor/outline";
import { cn } from "@/lib/utils";

interface PageOutlineProps {
  headings: OutlineHeading[];
  onSelect: (pos: number) => void;
  // The element wrapping the rendered prose, used to observe heading elements
  // for active-section tracking.
  containerRef: React.RefObject<HTMLElement | null>;
}

// A sticky right-margin rail listing the page's headings (levels 1-3). Clicking
// an entry scrolls to it; the entry under the reading position is highlighted
// via an IntersectionObserver over the rendered heading elements.
export function PageOutline({
  headings,
  onSelect,
  containerRef,
}: PageOutlineProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || headings.length === 0) return;
    // Track real headings plus essay titles. An essay title renders as an
    // `h1.scribe-essay-title` when not editable and a `textarea.scribe-essay-title`
    // while editing; either way we only keep titled ones so the element order
    // stays aligned with `headings` (which skips untitled essays).
    const els = Array.from(
      root.querySelectorAll<HTMLElement>("h1, h2, h3, .scribe-essay-title"),
    ).filter((el) => {
      if (!el.classList.contains("scribe-essay-title")) return true;
      const text =
        el instanceof HTMLTextAreaElement ? el.value : (el.textContent ?? "");
      return text.trim().length > 0;
    });
    if (els.length === 0) return;

    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = els.indexOf(entry.target as HTMLElement);
          if (index === -1) continue;
          if (entry.isIntersecting) visible.add(index);
          else visible.delete(index);
        }
        if (visible.size > 0) setActiveIndex(Math.min(...visible));
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    els.forEach((el) => {
      observer.observe(el);
    });
    return () => {
      observer.disconnect();
    };
  }, [containerRef, headings]);

  if (headings.length === 0) return null;

  return (
    <nav
      aria-label="Page outline"
      className="sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
        On this page
      </p>
      <ul className="flex flex-col gap-0.5 border-l border-border">
        {headings.map((heading, index) => (
          <li key={`${heading.pos}-${index}`}>
            <button
              type="button"
              onClick={() => {
                onSelect(heading.pos);
              }}
              aria-label={
                heading.essay
                  ? `Essay: ${heading.text || "Untitled essay"}`
                  : undefined
              }
              style={{ paddingLeft: 12 + (heading.level - 1) * 12 }}
              className={cn(
                "-ml-px flex w-full items-center gap-1.5 border-l py-1 pr-2 text-left text-[13px] leading-snug outline-none transition-colors",
                "focus-visible:text-text",
                index === activeIndex
                  ? "border-accent font-medium text-text"
                  : "border-transparent text-muted hover:text-text",
              )}
            >
              {heading.essay &&
                (heading.icon ? (
                  <span className="flex h-[13px] w-[13px] shrink-0 items-center justify-center">
                    <DocumentIcon icon={heading.icon} size={13} />
                  </span>
                ) : (
                  <EssayIcon size={13} className="shrink-0 opacity-60" />
                ))}
              <span className="min-w-0 flex-1 truncate">
                {heading.text ||
                  (heading.essay ? "Untitled essay" : "Untitled heading")}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
