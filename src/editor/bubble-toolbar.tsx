import type { ChainedCommands } from "@tiptap/core";
import { type Editor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { type ReactNode, useState } from "react";

import { Tooltip } from "@/components/ui/tooltip";
import type { IconProps } from "@/lib/make-icon";
import { cn } from "@/lib/utils";

import { ColorPopover } from "./color-popover";
import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  StrikeIcon,
  UnderlineIcon,
} from "./icons";
import { preserveSelection } from "./preserve-selection";
import { hasFormattableSelection } from "./selection";

// The inline-formatting marks, in toolbar order. One descriptor drives the
// active-state probe and the rendered buttons, so adding a mark is a single
// entry rather than three parallel edits.
interface MarkSpec {
  name: string;
  label: string;
  shortcut?: string;
  icon: (props: IconProps) => ReactNode;
  toggle: (chain: ChainedCommands) => ChainedCommands;
}

const MARKS: MarkSpec[] = [
  {
    name: "bold",
    label: "Bold",
    shortcut: "⌘B",
    icon: BoldIcon,
    toggle: (c) => c.toggleBold(),
  },
  {
    name: "italic",
    label: "Italic",
    shortcut: "⌘I",
    icon: ItalicIcon,
    toggle: (c) => c.toggleItalic(),
  },
  {
    name: "underline",
    label: "Underline",
    shortcut: "⌘U",
    icon: UnderlineIcon,
    toggle: (c) => c.toggleUnderline(),
  },
  {
    name: "strike",
    label: "Strikethrough",
    icon: StrikeIcon,
    toggle: (c) => c.toggleStrike(),
  },
  {
    name: "code",
    label: "Inline code",
    icon: CodeIcon,
    toggle: (c) => c.toggleCode(),
  },
];

// The mark names whose active state the toolbar tracks: the toggle marks plus
// the separate link button.
const TRACKED = [...MARKS.map((m) => m.name), "link"];

// The selection toolbar: a floating, segmented bar of inline-formatting
// controls. It appears only over a real text selection, mirrors the active
// marks live (via useEditorState), and never steals the selection — every
// button cancels its mousedown so the highlight stays put while you format.
export function BubbleToolbar({ editor }: { editor: Editor }) {
  const [colorOpen, setColorOpen] = useState(false);

  // The toolbar is always mounted, so this selector runs on every editor
  // transaction — including plain typing. Its mark states only matter while the
  // bar is shown (over a non-empty selection), so short-circuit otherwise to
  // keep the six `isActive` probes off the per-keystroke path.
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const empty = e.state.selection.empty;
      const state: Record<string, boolean> = {};
      for (const name of TRACKED)
        state[name] = empty ? false : e.isActive(name);
      return state;
    },
  });

  const toggleLink = () => {
    setColorOpen(false);
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("Link URL");
    if (url === null) return;
    const href = url.trim();
    if (!href) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      shouldShow={({ editor: e }) =>
        // Only over genuine text runs — skip node selections (hr/image) and
        // code blocks (which carry their own editing affordances later).
        e.isEditable && hasFormattableSelection(e)
      }
      className="flex items-center gap-0.5 rounded-xl border border-border bg-elevated p-1 shadow-popover"
    >
      {MARKS.map((mark) => {
        const Icon = mark.icon;
        return (
          <ToggleButton
            key={mark.name}
            label={mark.label}
            shortcut={mark.shortcut}
            isActive={active[mark.name] ?? false}
            onClick={() => {
              setColorOpen(false);
              mark.toggle(editor.chain().focus()).run();
            }}
          >
            <Icon />
          </ToggleButton>
        );
      })}

      <Divider />

      <ToggleButton
        label="Link"
        isActive={active.link ?? false}
        onClick={toggleLink}
      >
        <LinkIcon />
      </ToggleButton>
      <ColorPopover
        editor={editor}
        open={colorOpen}
        onOpenChange={setColorOpen}
      />
    </BubbleMenu>
  );
}

function ToggleButton({
  label,
  shortcut,
  isActive,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  isActive: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip
      content={
        <span className="flex items-center gap-2">
          {label}
          {shortcut && <span className="text-muted">{shortcut}</span>}
        </span>
      }
    >
      <button
        type="button"
        aria-label={label}
        aria-pressed={isActive}
        onMouseDown={preserveSelection}
        onClick={onClick}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring",
          isActive ? "bg-selected text-accent" : "text-text hover:bg-hover",
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-border" />;
}
