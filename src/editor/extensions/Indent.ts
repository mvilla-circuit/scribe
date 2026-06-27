import { type CommandProps, Extension } from "@tiptap/core";

// Block indentation: Tab nudges the current text block (paragraph or heading)
// one level to the right, Shift-Tab pulls it back. The indent is stored as a
// numeric `indent` level attribute and rendered as a left margin, so it shifts
// the whole block — wrapped lines stay aligned, and pressing Enter carries the
// level onto the new block (a ProseMirror split copies the node's attributes).
//
// Inside lists/to-dos Tab still nests the item (we defer to the list keymap),
// and code blocks keep their own Tab behavior.

/** Configuration for the block-indentation extension. */
export interface IndentOptions {
  /** Node types that can be indented. */
  types: string[];
  /** Indentation added per level, in rem (uniform across font sizes). */
  step: number;
  /** Maximum indent level. */
  maxLevel: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      /** Increase the indent level of the selected text block(s). */
      indentBlock: () => ReturnType;
      /** Decrease the indent level of the selected text block(s). */
      outdentBlock: () => ReturnType;
    };
  }
}

export const Indent = Extension.create<IndentOptions>({
  name: "indent",

  addOptions() {
    return {
      types: ["paragraph", "heading"],
      step: 2.5,
      maxLevel: 10,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const value = parseInt(
                element.getAttribute("data-indent") ?? "0",
                10,
              );
              return Number.isFinite(value) && value > 0 ? value : 0;
            },
            renderHTML: (attributes) => {
              const level = (attributes.indent as number) || 0;
              if (level <= 0) return {};
              return {
                "data-indent": String(level),
                style: `margin-left: ${level * this.options.step}rem`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const { types, maxLevel } = this.options;
    const shift =
      (delta: number) =>
      ({ state, dispatch }: CommandProps) => {
        const { from, to } = state.selection;
        let tr = state.tr;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!types.includes(node.type.name)) return;
          const current = (node.attrs.indent as number) || 0;
          const next = Math.min(Math.max(current + delta, 0), maxLevel);
          if (next !== current) {
            tr = tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              indent: next,
            });
            changed = true;
          }
        });
        if (changed && dispatch) dispatch(tr.scrollIntoView());
        return changed;
      };

    return {
      indentBlock: () => shift(1),
      outdentBlock: () => shift(-1),
    };
  },

  addKeyboardShortcuts() {
    // Let lists/to-dos nest and tables move between cells with Tab, and leave
    // code blocks alone; otherwise consume Tab so focus never escapes the
    // editor, even at the indent limit.
    const handle = (command: "indentBlock" | "outdentBlock") => () => {
      const { editor } = this;
      if (
        editor.isActive("listItem") ||
        editor.isActive("taskItem") ||
        editor.isActive("table") ||
        editor.isActive("codeBlock")
      ) {
        return false;
      }
      editor.commands[command]();
      return true;
    };

    return {
      Tab: handle("indentBlock"),
      "Shift-Tab": handle("outdentBlock"),
    };
  },
});
