import {
  computePosition,
  flip,
  offset,
  shift,
  type VirtualElement,
} from "@floating-ui/dom";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  exitSuggestion,
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";

import { filterSlashItems, type SlashItem } from "./slashItems";
import { SlashMenu, type SlashMenuProps, type SlashMenuRef } from "./SlashMenu";

// The "/" command. Wraps TipTap's Suggestion utility: it tracks the typed
// query, filters the item registry, and renders a Floating-UI-positioned React
// menu at the caret. The chosen item's `run(editor, range)` does the work, so
// this extension stays purely about triggering + presenting.
export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        allowSpaces: false,
        items: ({ query }) => filterSlashItems(query),
        // Only fire when "/" opens a token inside an editable textblock — never
        // mid-word, inside a URL, or within an atom/code block.
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          if (!$from.parent.type.isTextblock) return false;
          if ($from.parent.type.spec.code) return false;
          if ($from.parentOffset === 0) return true;
          const before = $from.parent.textBetween(
            $from.parentOffset - 1,
            $from.parentOffset,
          );
          return before === "" || /\s/.test(before);
        },
        command: ({ editor, range, props }) => {
          props.run(editor, range);
        },
        render: renderSlashMenu,
      }),
    ];
  },
});

function renderSlashMenu() {
  let component: ReactRenderer<SlashMenuRef, SlashMenuProps> | null = null;
  let popup: HTMLDivElement | null = null;

  const position = (props: SuggestionProps<SlashItem>) => {
    if (!popup) return;
    const rect = props.clientRect?.();
    if (!rect) return;
    const reference: VirtualElement = { getBoundingClientRect: () => rect };
    void computePosition(reference, popup, {
      placement: "bottom-start",
      middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      if (popup) {
        popup.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      }
    });
  };

  return {
    onStart: (props: SuggestionProps<SlashItem>) => {
      component = new ReactRenderer(SlashMenu, {
        props: { items: props.items, command: props.command },
        editor: props.editor,
      });
      popup = document.createElement("div");
      popup.className = "scribe-slash-popup";
      popup.appendChild(component.element);
      document.body.appendChild(popup);
      position(props);
    },
    onUpdate: (props: SuggestionProps<SlashItem>) => {
      component?.updateProps({ items: props.items, command: props.command });
      position(props);
    },
    onKeyDown: ({ event, view }: SuggestionKeyDownProps) => {
      if (event.key === "Escape") {
        exitSuggestion(view);
        return true;
      }
      return component?.ref?.onKeyDown(event) ?? false;
    },
    onExit: () => {
      popup?.remove();
      popup = null;
      component?.destroy();
      component = null;
    },
  };
}
