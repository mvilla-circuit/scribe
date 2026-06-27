import { Extension, textInputRule } from "@tiptap/core";

// Typographic substitutions we own ourselves rather than leaning on the OS's
// "smart" text replacement — which is per-machine, user-toggleable, and missing
// entirely on many setups, so the same keystrokes shouldn't quietly behave
// differently from one machine to the next.
//
// Implemented as input rules so they fire live as you type in *every* text
// block — paragraphs, headings, list items, table cells, and the paragraphs
// inside callouts and quotes alike — and an immediate Backspace undoes the
// substitution. Tiptap's input-rule runner already skips code blocks and inline
// code marks, so raw dashes stay literal in code.
//
// `--` → em dash (—). StarterKit's horizontal-rule rule also matches "—-", so
// typing a third dash right after the conversion still yields a divider, and
// the familiar `---` shortcut keeps working.
export const Typography = Extension.create({
  name: "scribeTypography",

  addInputRules() {
    return [textInputRule({ find: /--$/, replace: "—" })];
  },
});
