import { Check, LogOut, PanelLeft, Settings, Type } from "lucide-react";
import { useState } from "react";

import type { Book } from "@/data/books";
import { useAuth } from "@/lib/auth";
import { makeIcon } from "@/lib/make-icon";
import { useSessionUser } from "@/lib/session-user";
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH, useUIStore } from "@/store/ui";
import { type ThemeMode, useTheme } from "@/theme/theme";

import { ChevronLeftIcon } from "./book/icons";
import { OutlinePanel } from "./book/outline-panel";
import { ScribeLogo } from "./scribe-logo";
import { SettingsDialog } from "./settings/settings-dialog";
import { CollapsedSidebarNav } from "./sidebar/collapsed-sidebar-nav";
import { SidebarTree } from "./sidebar/sidebar-tree";
import { useBookBackTarget } from "./sidebar/use-book-back-target";
import { Avatar } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip } from "./ui/tooltip";
import { useDragResize } from "./ui/use-drag-resize";

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
  const { signOut } = useAuth();
  const { name, email, avatarUrl } = useSessionUser();
  const { mode, setMode } = useTheme();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const storedWidth = useUIStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const backTarget = useBookBackTarget(activeBook);

  // During a drag the width is driven locally (one update per frame) so the
  // persisted store — and thus localStorage — isn't written on every mousemove;
  // the final width is committed once on release.
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const width = dragWidth ?? storedWidth;
  const { onMouseDown } = useDragResize({
    onResize: (x) => {
      setDragWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, x)));
    },
    onCommit: (x) => {
      setSidebarWidth(x);
      setDragWidth(null);
    },
  });

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
            <Tooltip content={backTarget.tooltip} side="right">
              <button
                type="button"
                onClick={backTarget.goBack}
                aria-label={backTarget.tooltip}
                className="group -ml-1 flex min-w-0 items-center gap-0.5 rounded-md px-1 py-0.5 text-sm text-muted outline-none transition hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeftIcon size={16} className="shrink-0" />
                <span className="truncate">{backTarget.label}</span>
              </button>
            </Tooltip>
          ) : (
            <ScribeLogo iconSize={16} textClassName="text-sm" />
          ))}
        <Tooltip
          content={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          side="right"
        >
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
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
          <CollapsedSidebarNav activeBook={activeBook} />
        </nav>
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
          className={`flex items-center gap-2 ${collapsed ? "flex-col" : ""}`}
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
            <Tooltip content="Settings" side="right">
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
            <DropdownMenuContent
              side="top"
              align="end"
              className="min-w-[12rem]"
            >
              <DropdownMenuItem
                onSelect={() => {
                  setSettingsOpen(true);
                }}
              >
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
                  <span
                    className={mode === opt.value ? "text-accent" : "opacity-0"}
                  >
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
        // Pointer-driven resize splitter; the separator role carries the
        // resize semantics (aria-valuenow/min/max) for assistive tech.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- The separator role intentionally carries resize semantics (aria-valuenow/min/max) for this pointer-driven splitter.
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
