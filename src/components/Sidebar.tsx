import { useCallback, useEffect, useRef, useState } from "react";
import { Check, LogOut, PanelLeft, Settings, Type } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useTheme, type ThemeMode } from "../theme/theme";
import { makeIcon } from "../lib/makeIcon";
import { SidebarTree } from "./sidebar/SidebarTree";
import { OutlinePanel } from "./book/OutlinePanel";
import { ChevronLeftIcon } from "./book/icons";
import { SettingsDialog } from "./settings/SettingsDialog";
import type { Book } from "../data/books";
import { Avatar } from "./ui/Avatar";
import { Tooltip } from "./ui/Tooltip";
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

const PanelLeftIcon = makeIcon(PanelLeft);
const SignOutIcon = makeIcon(LogOut);
const SettingsIcon = makeIcon(Settings);
const CheckIcon = makeIcon(Check);
const FontsIcon = makeIcon(Type);

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function Sidebar({ activeBook }: { activeBook: Book | null }) {
  const { session, signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const width = useUIStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const setActiveBook = useUIStore((s) => s.setActiveBook);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      className="relative flex h-full shrink-0 flex-col bg-sidebar"
      style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
    >
      {/* Clears the macOS overlay traffic lights and lets the user drag the
          window from the sidebar's title-bar zone. */}
      <div data-tauri-drag-region className="h-8 shrink-0" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-0.5">
        {!collapsed &&
          (activeBook ? (
            <Tooltip content="Back to library">
              <button
                type="button"
                onClick={() => setActiveBook(null)}
                aria-label="Back to library"
                className="group -ml-1 flex min-w-0 items-center gap-0.5 rounded-md px-1 py-0.5 text-sm text-muted outline-none transition hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeftIcon size={16} className="shrink-0" />
                <span className="truncate">Library</span>
              </button>
            </Tooltip>
          ) : (
            <span className="select-none text-sm font-semibold tracking-tight text-text">
              Scribe
            </span>
          ))}
        <Tooltip content={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-text ${
              collapsed ? "mx-auto" : ""
            }`}
          >
            <PanelLeftIcon />
          </button>
        </Tooltip>
      </div>

      {/* Nav: the Library tree, or the active book's Outline drilled in. */}
      {collapsed ? (
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-1" />
      ) : (
        <div
          key={activeBook ? `book-${activeBook.id}` : "library"}
          className="scribe-fade-in flex min-h-0 flex-1 flex-col"
        >
          {activeBook ? <OutlinePanel book={activeBook} /> : <SidebarTree />}
        </div>
      )}

      {/* Footer */}
      <div className="px-2 pb-2 pt-3">
        <div
          className={`flex items-center gap-2 ${
            collapsed ? "flex-col" : ""
          }`}
        >
          {collapsed && name ? (
            <Tooltip content={name} side="right">
              <span className="inline-flex">
                <Avatar src={avatarUrl} name={name} size={28} />
              </span>
            </Tooltip>
          ) : (
            <Avatar src={avatarUrl} name={name} size={28} />
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-text">{name}</p>
              {email && email !== name && (
                <p className="truncate text-xs text-muted">{email}</p>
              )}
            </div>
          )}
          <DropdownMenu>
            <Tooltip content="Settings" side="top">
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Settings"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-text data-[state=open]:bg-hover data-[state=open]:text-text"
                >
                  <SettingsIcon />
                </button>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent side="top" align="end" className="min-w-[12rem]">
              <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                <FontsIcon />
                Fonts & settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </aside>
  );
}
