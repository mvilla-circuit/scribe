import { TooltipProvider } from "./ui/Tooltip";
import { BookView } from "./book/BookView";
import { MainEmptyState } from "./MainEmptyState";
import { Sidebar } from "./Sidebar";
import { useBooks } from "../data/books";
import { useUIStore } from "../store/ui";

export function AppShell() {
  const activeBookId = useUIStore((s) => s.activeBookId);
  const { data: books } = useBooks();
  const activeBook = books?.find((b) => b.id === activeBookId) ?? null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full bg-bg">
        <Sidebar activeBook={activeBook} />
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-bg">
          <div className="min-h-0 flex-1 overflow-hidden">
            {activeBook ? (
              <BookView key={activeBook.id} book={activeBook} />
            ) : (
              <MainEmptyState />
            )}
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}
