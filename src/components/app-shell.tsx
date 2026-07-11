import { useBooks } from "@/data/books";
import { useGlobalFonts } from "@/fonts/use-global-fonts";
import { useUIStore } from "@/store/ui";

import { MainPane } from "./main-pane";
import { Sidebar } from "./sidebar";
import { TooltipProvider } from "./ui/tooltip";

export function AppShell() {
  useGlobalFonts();
  const activeBookId = useUIStore((s) => s.activeBookId);
  const activeCollectionId = useUIStore((s) => s.activeCollectionId);
  const activeEntryId = useUIStore((s) => s.activeEntryId);
  const { data: books } = useBooks();
  const activeBook = books?.find((b) => b.id === activeBookId) ?? null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full bg-bg">
        <Sidebar activeBook={activeBook} />
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-bg">
          <div className="min-h-0 flex-1 overflow-hidden">
            <MainPane
              activeBook={activeBook}
              activeCollectionId={activeCollectionId}
              activeEntryId={activeEntryId}
            />
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}
