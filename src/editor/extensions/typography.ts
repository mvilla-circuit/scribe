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
//
// Straight quotes → curly "typographer's" quotes. Owning this in ProseMirror is
// also what keeps the caret honest: when the OS's own smart-quote substitution
// rewrites the glyph after the keystroke, it does so via a DOM mutation outside
// ProseMirror's transaction model, and the editor can map the caret to the wrong
// side of the replaced character — the "cursor jumps behind the quote" bug.
// Converting on the keystroke through an input rule means the straight quote is
// already curly before the OS looks at it, so there's nothing left to race over.
// An open variant fires at a boundary (start of block, after whitespace or an
// opening bracket/quote) and a catch-all close variant handles everything else,
// so contractions and possessives ("it's", "James'") get a closing ' too.
const OPEN_DOUBLE = "\u201C"; // “
const CLOSE_DOUBLE = "\u201D"; // ”
const OPEN_SINGLE = "\u2018"; // ‘
const CLOSE_SINGLE = "\u2019"; // ’
const QUOTE_BOUNDARY = "[\\s{[(<'\"\u2018\u201C]";

export const Typography = Extension.create({
  name: "scribeTypography",

  addInputRules() {
    return [
      textInputRule({ find: /--$/, replace: "—" }),
      // Open rules require a leading boundary and must come before the catch-all
      // close rules, since the input-rule runner applies the first match.
      textInputRule({
        find: new RegExp(`(?:^|${QUOTE_BOUNDARY})(")$`),
        replace: OPEN_DOUBLE,
      }),
      textInputRule({ find: /"$/, replace: CLOSE_DOUBLE }),
      textInputRule({
        find: new RegExp(`(?:^|${QUOTE_BOUNDARY})(')$`),
        replace: OPEN_SINGLE,
      }),
      textInputRule({ find: /'$/, replace: CLOSE_SINGLE }),
    ];
  },
});
