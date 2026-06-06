import { TooltipProvider } from "./ui/Tooltip";
import { BookPlaceholder } from "./BookPlaceholder";
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
      <div className="flex h-full flex-col bg-bg">
        {/* Drag strip clears the macOS overlay traffic lights and lets the user move the window. */}
        <div data-tauri-drag-region className="h-8 shrink-0" />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <section className="min-w-0 flex-1 overflow-y-auto bg-bg">
            {activeBook ? (
              <BookPlaceholder title={activeBook.title} />
            ) : (
              <MainEmptyState />
            )}
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}
