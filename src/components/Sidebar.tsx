import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { ThemeToggle } from "../theme/ThemeToggle";
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  useUIStore,
} from "../store/ui";

const COLLAPSED_WIDTH = 56;

function PanelLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <line x1="9" y1="4" x2="9" y2="20" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10 8l-4 4 4 4M6 12h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function initials(email: string | undefined): string {
  if (!email) return "?";
  return email[0]?.toUpperCase() ?? "?";
}

export function Sidebar() {
  const { session, signOut } = useAuth();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const width = useUIStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);

  const dragging = useRef(false);

  const onMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setSidebarWidth(e.clientX);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setSidebarWidth]);

  const email = session?.user.email ?? session?.user.id;

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-r border-border bg-sidebar"
      style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        {!collapsed && (
          <span className="select-none text-sm font-semibold tracking-tight text-text">
            Scribe
          </span>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-text ${
            collapsed ? "mx-auto" : ""
          }`}
        >
          <PanelLeftIcon />
        </button>
      </div>

      {/* Nav */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
        {!collapsed && (
          <p className="px-2 py-6 text-center text-xs leading-relaxed text-muted">
            No books yet — create one in the next phase.
          </p>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white"
              title={email}
            >
              {initials(email)}
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-text"
            >
              <SignOutIcon />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                {initials(email)}
              </div>
              <span className="truncate text-xs text-muted" title={email}>
                {email}
              </span>
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted transition hover:bg-hover hover:text-text"
            >
              <SignOutIcon />
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Resize handle */}
      {!collapsed && (
        <div
          onMouseDown={onMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          aria-valuenow={width}
          aria-valuemin={SIDEBAR_MIN_WIDTH}
          aria-valuemax={SIDEBAR_MAX_WIDTH}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-accent/30"
        />
      )}
    </aside>
  );
}
