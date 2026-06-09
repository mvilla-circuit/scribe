import { useMemo } from "react";
import { useUIStore } from "../../store/ui";
import type { Document } from "../../data/documents";
import { buildDocTree, flattenForToc } from "../../data/docTree";
import { INDENT } from "./outlineDnd";
import { PlusIcon } from "./icons";
import { DocumentIcon } from "../ui/DocumentIcon";

type TableOfContentsProps = {
  documents: Document[];
  loading: boolean;
  onCreateFirst: () => void;
  /** The book's resolved title-role font, so the contents echo the cover. */
  titleFont: string;
};

// The book's auto Table of Contents: the document hierarchy, depth-indented,
// click-to-navigate. Updates live as the outline changes.
export function TableOfContents({
  documents,
  loading,
  onCreateFirst,
  titleFont,
}: TableOfContentsProps) {
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);
  const entries = useMemo(
    () => flattenForToc(buildDocTree(documents)),
    [documents]
  );

  if (loading && entries.length === 0) {
    return (
      <p className="mt-10 text-sm text-muted/70">Loading the contents…</p>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="mt-10 rounded-lg border border-dashed border-border px-6 py-8 text-center">
        <p className="text-base text-text" style={{ fontFamily: titleFont }}>
          No documents yet
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
          Add your first page to begin shaping this book.
        </p>
        <button
          type="button"
          onClick={onCreateFirst}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PlusIcon size={15} />
          Add your first page
        </button>
      </div>
    );
  }

  return (
    <nav aria-label="Table of contents" className="mt-8">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
        Contents
      </h2>
      <ol className="mt-3 flex flex-col">
        {entries.map((entry) => (
          <li key={entry.document.id}>
            <button
              type="button"
              onClick={() => setActiveDoc(entry.document.id)}
              className="group flex w-full items-stretch rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {entry.depth > 0 && (
                <span aria-hidden className="flex shrink-0">
                  {Array.from({ length: entry.depth }).map((_, level) => (
                    <span
                      key={level}
                      className="border-l border-border"
                      style={{ width: INDENT }}
                    />
                  ))}
                </span>
              )}
              <span className="flex min-w-0 flex-1 items-baseline gap-2 py-1.5 pl-1">
                {entry.document.icon && (
                  <DocumentIcon
                    icon={entry.document.icon}
                    size={15}
                    className="shrink-0"
                  />
                )}
                <span
                  className="min-w-0 truncate text-[15px] leading-relaxed text-text decoration-accent/40 underline-offset-4 group-hover:underline"
                  style={{ fontFamily: "var(--font-text)" }}
                >
                  {entry.document.title || "Untitled"}
                </span>
                <span className="h-px flex-1 translate-y-[-3px] border-b border-dotted border-border opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
