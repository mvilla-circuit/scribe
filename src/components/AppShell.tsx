import { MainEmptyState } from "./MainEmptyState";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  return (
    <div className="flex h-full flex-col bg-bg">
      {/* Drag strip clears the macOS overlay traffic lights and lets the user move the window. */}
      <div data-tauri-drag-region className="h-8 shrink-0" />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <section className="min-w-0 flex-1 overflow-y-auto bg-bg">
          <MainEmptyState />
        </section>
      </div>
    </div>
  );
}
