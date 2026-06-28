import { TextSelection } from "@tiptap/pm/state";
import { type Editor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { type ReactNode, useState } from "react";

import { Tooltip } from "@/components/ui/tooltip";
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
      if (e.state.selection.empty) {
        return {
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          code: false,
          link: false,
        };
      }
      return {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        code: e.isActive("code"),
        link: e.isActive("link"),
      };
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
      shouldShow={({ editor: e, state, from, to }) => {
        if (!e.isEditable) return false;
        const { selection } = state;
        if (selection.empty) return false;
        // Only over genuine text runs — skip node selections (hr/image) and
        // code blocks (which carry their own editing affordances later).
        if (!(selection instanceof TextSelection)) return false;
        if (e.isActive("codeBlock")) return false;
        return state.doc.textBetween(from, to).trim().length > 0;
      }}
      className="flex items-center gap-0.5 rounded-xl border border-border bg-elevated p-1 shadow-popover"
    >
      <ToggleButton
        label="Bold"
        shortcut="⌘B"
        isActive={active.bold}
        onClick={() => {
          setColorOpen(false);
          editor.chain().focus().toggleBold().run();
        }}
      >
        <BoldIcon />
      </ToggleButton>
      <ToggleButton
        label="Italic"
        shortcut="⌘I"
        isActive={active.italic}
        onClick={() => {
          setColorOpen(false);
          editor.chain().focus().toggleItalic().run();
        }}
      >
        <ItalicIcon />
      </ToggleButton>
      <ToggleButton
        label="Underline"
        shortcut="⌘U"
        isActive={active.underline}
        onClick={() => {
          setColorOpen(false);
          editor.chain().focus().toggleUnderline().run();
        }}
      >
        <UnderlineIcon />
      </ToggleButton>
      <ToggleButton
        label="Strikethrough"
        isActive={active.strike}
        onClick={() => {
          setColorOpen(false);
          editor.chain().focus().toggleStrike().run();
        }}
      >
        <StrikeIcon />
      </ToggleButton>
      <ToggleButton
        label="Inline code"
        isActive={active.code}
        onClick={() => {
          setColorOpen(false);
          editor.chain().focus().toggleCode().run();
        }}
      >
        <CodeIcon />
      </ToggleButton>

      <Divider />

      <ToggleButton label="Link" isActive={active.link} onClick={toggleLink}>
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
        onMouseDown={(e) => {
          e.preventDefault();
        }}
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
