import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { useTheme, type ThemeMode } from "../theme/theme";
import { SidebarTree } from "./sidebar/SidebarTree";
import { Avatar } from "./ui/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/DropdownMenu";
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

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12l5 5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function Sidebar() {
  const { session, signOut } = useAuth();
  const { mode, setMode } = useTheme();
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

  const meta = session?.user.user_metadata ?? {};
  const email = session?.user.email ?? session?.user.id;
  const name =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    email;
  const avatarUrl =
    (meta.avatar_url as string | undefined) ??
    (meta.picture as string | undefined) ??
    null;

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
      {collapsed ? (
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-1" />
      ) : (
        <SidebarTree />
      )}

      {/* Footer */}
      <div className="border-t border-border px-2 py-2">
        <div
          className={`flex items-center gap-2 ${
            collapsed ? "flex-col" : ""
          }`}
        >
          <Avatar
            src={avatarUrl}
            name={name}
            size={28}
            title={collapsed ? name : undefined}
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-text">{name}</p>
              {email && email !== name && (
                <p className="truncate text-xs text-muted">{email}</p>
              )}
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Settings"
                title="Settings"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-text data-[state=open]:bg-hover data-[state=open]:text-text"
              >
                <SettingsIcon />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="min-w-[12rem]">
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              {THEME_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onSelect={(e) => {
                    e.preventDefault();
                    setMode(opt.value);
                  }}
                  className="justify-between"
                >
                  {opt.label}
                  <span className={mode === opt.value ? "text-accent" : "opacity-0"}>
                    <CheckIcon />
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void signOut()}>
                <SignOutIcon />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
