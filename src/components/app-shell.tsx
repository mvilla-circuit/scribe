import { useBooks } from "@/data/books";
import { useGlobalFonts } from "@/fonts/use-global-fonts";
import { useUIStore } from "@/store/ui";

import { BookView } from "./book/book-view";
import { MainEmptyState } from "./main-empty-state";
import { Sidebar } from "./sidebar";
import { TooltipProvider } from "./ui/tooltip";

export function AppShell() {
  useGlobalFonts();
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
