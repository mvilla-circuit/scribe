import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DocumentIcon } from "@/components/ui/document-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { buildDocTree, flattenTocExpanded } from "@/data/doc-tree";
import type { DocumentMeta } from "@/data/documents";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";

import { ChevronRightIcon, PlusIcon } from "./icons";
import { INDENT } from "./outline-dnd";

interface TableOfContentsProps {
  documents: DocumentMeta[];
  loading: boolean;
  /**
   * Empty-state action (cover only) offering to create the book's first page.
   * Omitted when the list can't be empty (a parent page always has children).
   */
  onCreateFirst?: () => void;
  /** The book's resolved title-role font, so the contents empty state echoes the cover. */
  titleFont?: string;
  /** Ids of expanded parents; collapsed parents hide their subtree. */
  expandedIds: Set<string>;
  /** Toggle a single parent's expansion. */
  onToggle: (id: string) => void;
  /**
   * Scope the contents to a single document's subtree (its children become the
   * roots). Defaults to the whole book -- the book cover's behavior.
   */
  rootId?: string | null;
}

// The book's auto Table of Contents: the document hierarchy, depth-indented,
// click-to-navigate. Updates live as the outline changes. Expansion state is
// owned by the Title Page so the page-level toolbar can drive "expand all".
export function TableOfContents({
  documents,
  loading,
  onCreateFirst,
  titleFont = "var(--font-display)",
  expandedIds,
  onToggle,
  rootId = null,
}: TableOfContentsProps) {
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);

  const tree = useMemo(
    () => buildDocTree(documents, rootId),
    [documents, rootId],
  );
  const entries = useMemo(
    () => flattenTocExpanded(tree, expandedIds),
    [tree, expandedIds],
  );

  if (loading && entries.length === 0) {
    return <TableOfContentsSkeleton />;
  }

  if (entries.length === 0) {
    // A scoped subtree (parent-page contents) has no first-page affordance --
    // it only renders when the page already has children, so stay silent.
    if (!onCreateFirst) return null;
    return (
      <EmptyState
        className="mt-10"
        tone="editorial"
        title="No documents yet"
        titleStyle={{ fontFamily: titleFont }}
        body="Add your first page to begin shaping this book."
        cta={
          <Button variant="primary" onClick={onCreateFirst}>
            <PlusIcon size={15} />
            Add your first page
          </Button>
        }
      />
    );
  }

  return (
    <nav aria-label="Table of contents" className="mt-8">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
        Contents
      </h2>
      <ol className="mt-3 flex flex-col">
        {entries.map((entry) => {
          const expanded = expandedIds.has(entry.document.id);
          return (
            <li
              key={entry.document.id}
              className="group -ml-7 -mr-2 flex items-stretch rounded-md pl-7 pr-2 transition-colors hover:bg-hover"
            >
              {entry.depth > 0 && (
                <span aria-hidden className="flex shrink-0">
                  {Array.from({ length: entry.depth }).map((_, level) => (
                    <span
                      // eslint-disable-next-line react/no-array-index-key -- positional indent rules; count-based, never reorder
                      key={level}
                      className="border-l border-border"
                      style={{ width: INDENT }}
                    />
                  ))}
                </span>
              )}
              {/* The caret hangs into the left gutter (negative margin equal to
                  its own width) so it occupies no flow space — childless rows
                  carry no spacer and every label lines up on the same edge as
                  the "Contents" heading and title above. */}
              {entry.hasChildren && (
                <button
                  type="button"
                  aria-label={expanded ? "Collapse" : "Expand"}
                  aria-expanded={expanded}
                  onClick={() => {
                    onToggle(entry.document.id);
                  }}
                  className="-ml-5 flex w-5 shrink-0 items-center justify-center self-stretch rounded text-muted outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronRightIcon
                    size={14}
                    className={cn(
                      "transition-transform duration-150",
                      expanded && "rotate-90",
                    )}
                  />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveDoc(entry.document.id);
                }}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pl-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {entry.document.icon && (
                  <DocumentIcon
                    icon={entry.document.icon}
                    size={15}
                    className="shrink-0"
                  />
                )}
                <span
                  className="min-w-0 truncate text-[15px] leading-relaxed text-text transition-colors group-hover:text-accent"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {entry.document.title || "Untitled"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Mirrors the contents list (heading + indented rows) while documents load, so
// the cover page settles in without a jump from a one-line "Loading" message.
const SKELETON_ROWS: { depth: number; width: string }[] = [
  { depth: 0, width: "58%" },
  { depth: 0, width: "44%" },
  { depth: 1, width: "50%" },
  { depth: 1, width: "38%" },
  { depth: 0, width: "52%" },
];

function TableOfContentsSkeleton() {
  return (
    <div aria-hidden className="mt-8">
      <Skeleton width="4.5rem" height="0.7rem" />
      <ol className="mt-3 flex flex-col">
        {SKELETON_ROWS.map((row) => (
          <li key={`${row.depth}-${row.width}`} className="flex items-stretch">
            {row.depth > 0 && (
              <span className="flex shrink-0">
                {Array.from({ length: row.depth }).map((_, level) => (
                  <span
                    // eslint-disable-next-line react/no-array-index-key -- positional indent rules; count-based, never reorder
                    key={level}
                    className="border-l border-border"
                    style={{ width: INDENT }}
                  />
                ))}
              </span>
            )}
            <span className="flex flex-1 items-center py-1.5 pl-1">
              <Skeleton height="0.9rem" width={row.width} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
