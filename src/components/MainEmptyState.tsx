import { PenLine } from "lucide-react";
import { useMemo } from "react";

import { type Book, useBooks, useCreateBook } from "../data/books";
import { useCreateFolder, useFolders } from "../data/folders";
import { getPositionBetween } from "../data/ordering";
import { buildTree, childrenOf, ROOT } from "../data/tree";
import { useAuth } from "../lib/auth";
import { makeIcon } from "../lib/makeIcon";
import { cn } from "../lib/utils";
import { useUIStore } from "../store/ui";
import { BookIcon, BookPlusIcon, FolderPlusIcon } from "./sidebar/icons";
import { Button } from "./ui/Button";
import { DocumentIcon } from "./ui/DocumentIcon";
import { Skeleton } from "./ui/Skeleton";

const BrandIcon = makeIcon(PenLine);

const MAX_RECENT = 6;

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// A compact "last edited" label: relative for recent edits, otherwise a date.
function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso);
  const diffMs = Date.now() - then.getTime();
  if (Number.isNaN(diffMs)) return "";
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MainEmptyState() {
  const { session } = useAuth();
  const { data: books, isLoading: booksLoading } = useBooks();
  const { data: folders } = useFolders();
  const createBook = useCreateBook();
  const createFolder = useCreateFolder();
  const setActiveBook = useUIStore((s) => s.setActiveBook);

  const meta = session?.user.user_metadata ?? {};
  const fullName =
    (meta.full_name as string | undefined) ?? (meta.name as string | undefined);
  const firstName = fullName?.trim().split(/\s+/)[0] ?? null;
  const greeting = greetingFor(new Date());

  const recent = useMemo(() => {
    const list = books ?? [];
    return list
      .slice()
      .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
      .slice(0, MAX_RECENT);
  }, [books]);

  const hasBooks = (books?.length ?? 0) > 0;

  // Append a new root-level item, mirroring SidebarTree's ordering so books and
  // folders interleave correctly even when folders are present at the root.
  const rootEndPosition = () => {
    const model = buildTree(folders ?? [], books ?? []);
    const siblings = childrenOf(model, ROOT);
    const last = siblings[siblings.length - 1];
    return getPositionBetween(last?.position, undefined);
  };

  const handleNewBook = () => {
    const id = crypto.randomUUID();
    createBook.mutate({
      id,
      title: "Untitled",
      folder_id: null,
      position: rootEndPosition(),
    });
    setActiveBook(id);
  };

  const handleNewFolder = () => {
    createFolder.mutate({
      id: crypto.randomUUID(),
      name: "New folder",
      parent_folder_id: null,
      position: rootEndPosition(),
    });
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
              <span
                className="text-3xl font-semibold tracking-tight text-text"
                style={{ fontFamily: "var(--font-display)" }}
              >
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
            <Button variant="secondary" onClick={handleNewFolder}>
              <FolderPlusIcon size={15} />
              New folder
            </Button>
          </div>

          {booksLoading ? (
            <section className="mt-10">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
                Recent
              </h3>
              <div className="mt-3 flex flex-col gap-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <RecentBookCardSkeleton key={i} />
                ))}
              </div>
            </section>
          ) : hasBooks ? (
            <section className="mt-10">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
                Recent
              </h3>
              <div className="mt-3 flex flex-col gap-1.5">
                {recent.map((book) => (
                  <RecentBookCard
                    key={book.id}
                    book={book}
                    onSelect={() => {
                      setActiveBook(book.id);
                    }}
                  />
                ))}
              </div>
            </section>
          ) : (
            <p className="mt-10 text-sm leading-relaxed text-muted">
              No books yet. Create your first book to start writing.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentBookCard({
  book,
  onSelect,
}: {
  book: Book;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={book.title}
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left",
        "outline-none transition hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-tree-group text-muted">
        {book.icon ? (
          <DocumentIcon icon={book.icon} size={18} />
        ) : (
          <BookIcon size={18} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">
          {book.title || "Untitled"}
        </p>
        {book.subtitle && (
          <p className="mt-0.5 truncate text-xs text-muted">{book.subtitle}</p>
        )}
      </div>
      {book.updated_at && (
        <span className="shrink-0 text-xs text-muted tabular-nums">
          {formatUpdatedAt(book.updated_at)}
        </span>
      )}
    </button>
  );
}

// Matches RecentBookCard's footprint so the recents list loads without a jump.
function RecentBookCardSkeleton() {
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
