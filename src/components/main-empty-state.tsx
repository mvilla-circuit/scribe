import { Feather } from "lucide-react";
import { useMemo } from "react";

import { useBooks } from "@/data/books";
import { useCollections } from "@/data/collections";
import { useCreateRootItem } from "@/data/use-create-root-item";
import { makeIcon } from "@/lib/make-icon";
import { useSessionUser } from "@/lib/session-user";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useUIStore } from "@/store/ui";

import {
  BookIcon,
  BookPlusIcon,
  CollectionIcon,
  CollectionPlusIcon,
  FolderPlusIcon,
} from "./sidebar/icons";
import { Button } from "./ui/button";
import { DocumentIcon } from "./ui/document-icon";
import { Skeleton } from "./ui/skeleton";
import { Tooltip } from "./ui/tooltip";
import { useGreeting } from "./use-greeting";

const BrandIcon = makeIcon(Feather);

const MAX_RECENT = 6;

// A recently-touched library surface the user can jump back into. Books and
// collections normalize onto the same shape (title/subtitle/icon) so the Recent
// list can interleave them by `updated_at`.
interface RecentItem {
  kind: "book" | "collection";
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  updated_at: string | null;
}

export function MainEmptyState() {
  const { firstName } = useSessionUser();
  const { data: books, isLoading: booksLoading } = useBooks();
  const { data: collections, isLoading: collectionsLoading } = useCollections();
  const createRootItem = useCreateRootItem();
  const setActiveBook = useUIStore((s) => s.setActiveBook);
  const setActiveCollection = useUIStore((s) => s.setActiveCollection);

  const greeting = useGreeting();

  const recent = useMemo<RecentItem[]>(() => {
    const items: RecentItem[] = [
      ...(books ?? []).map((b) => ({
        kind: "book" as const,
        id: b.id,
        title: b.title,
        subtitle: b.subtitle,
        icon: b.icon,
        updated_at: b.updated_at,
      })),
      ...(collections ?? []).map((c) => ({
        kind: "collection" as const,
        id: c.id,
        title: c.name,
        subtitle: c.description,
        icon: c.icon,
        updated_at: c.updated_at,
      })),
    ];
    return items
      .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
      .slice(0, MAX_RECENT);
  }, [books, collections]);

  const isLoading = booksLoading || collectionsLoading;
  const hasRecent = recent.length > 0;

  const handleNewBook = () => {
    setActiveBook(createRootItem.createBook());
  };

  const handleNewCollection = () => {
    setActiveCollection(createRootItem.createCollection());
  };

  const handleNewFolder = () => {
    createRootItem.createFolder();
  };

  const openRecent = (item: RecentItem) => {
    if (item.kind === "book") setActiveBook(item.id);
    else setActiveCollection(item.id);
  };

  return (
    <div className="relative flex h-full flex-col overflow-y-auto">
      <div data-tauri-drag-region className="h-8 shrink-0" />
      <div className="scribe-surface-in flex flex-1 flex-col items-center px-8 py-12">
        <div className="w-full max-w-3xl">
          <header className="flex flex-col items-start">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-selected text-accent">
                <BrandIcon size={20} />
              </span>
              <span className="font-serif text-3xl font-semibold italic tracking-tight text-text">
                Scribe
              </span>
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-text">
              {greeting}
              {firstName ? `, ${firstName}` : ""}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              A calm place to write. Pick up where you left off, or start
              something new.
            </p>
          </header>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="primary" onClick={handleNewBook}>
              <BookPlusIcon size={15} />
              New book
            </Button>
            <Button variant="secondary" onClick={handleNewCollection}>
              <CollectionPlusIcon size={15} />
              New collection
            </Button>
            <Button variant="secondary" onClick={handleNewFolder}>
              <FolderPlusIcon size={15} />
              New folder
            </Button>
          </div>

          {isLoading ? (
            <section className="mt-10">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
                Recent
              </h3>
              <div className="mt-3 flex flex-col gap-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  // eslint-disable-next-line react/no-array-index-key -- decorative placeholder cards; fixed count, no stable id
                  <RecentItemSkeleton key={i} />
                ))}
              </div>
            </section>
          ) : hasRecent ? (
            <section className="mt-10">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
                Recent
              </h3>
              <div className="mt-3 flex flex-col gap-1.5">
                {recent.map((item) => (
                  <RecentItemCard
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    onSelect={() => {
                      openRecent(item);
                    }}
                  />
                ))}
              </div>
            </section>
          ) : (
            <p className="mt-10 text-sm leading-relaxed text-muted">
              Nothing here yet. Create a book or collection to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentItemCard({
  item,
  onSelect,
}: {
  item: RecentItem;
  onSelect: () => void;
}) {
  const label = item.title || "Untitled";
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "group flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left",
          "outline-none transition hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-tree-group text-muted">
          {item.icon ? (
            <DocumentIcon icon={item.icon} size={18} />
          ) : item.kind === "collection" ? (
            <CollectionIcon size={18} />
          ) : (
            <BookIcon size={18} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">{label}</p>
          {item.subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted">
              {item.subtitle}
            </p>
          )}
        </div>
        {item.updated_at && (
          <span className="shrink-0 text-xs text-muted tabular-nums">
            {formatRelativeTime(item.updated_at, { compact: true })}
          </span>
        )}
      </button>
    </Tooltip>
  );
}

// Matches RecentItemCard's footprint so the recents list loads without a jump.
function RecentItemSkeleton() {
  return (
    <div
      aria-hidden
      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
    >
      <Skeleton width={36} height={36} radius={6} />
      <div className="min-w-0 flex-1">
        <Skeleton width="45%" height="0.85rem" />
        <Skeleton width="30%" height="0.7rem" className="mt-1.5" />
      </div>
    </div>
  );
}
