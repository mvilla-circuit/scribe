import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import type { Checker } from "@/lib/spellcheck/checker";
import { tokenize } from "@/lib/spellcheck/tokenize";

/** CSS class for a misspelling (red wavy underline). */
export const SPELL_ERROR_CLASS = "scribe-spell-error";
/** CSS class for a grammar issue (blue wavy underline). */
export const SPELL_GRAMMAR_CLASS = "scribe-spell-grammar";

/**
 * A grammar issue over a document range, in ProseMirror positions. Ships behind
 * {@link GrammarProvider} so blue underlines render if a provider yields any —
 * none do yet (the default provider is a no-op). Kept module-internal until a
 * real provider needs to construct these.
 */
interface GrammarIssue {
  from: number;
  to: number;
  message: string;
}

/** Supplies grammar issues for a document. */
export interface GrammarProvider {
  getIssues(doc: ProseMirrorNode): GrammarIssue[];
}

/** The default grammar provider: yields nothing, so no blue underlines ship. */
export const noopGrammarProvider: GrammarProvider = {
  getIssues: () => [],
};

/** Inputs to {@link computeSpellDecorations}. */
export interface SpellDecorationOptions {
  checker: Checker;
  /** Words ignored for this document (case-insensitive). */
  ignores: Iterable<string>;
  /** Words in the account-wide dictionary (case-insensitive). */
  dictionary: Iterable<string>;
  /** Grammar issues to render as blue underlines (default none). */
  grammar?: GrammarIssue[];
}

/**
 * Walks a ProseMirror document and returns a {@link DecorationSet} of inline
 * decorations: a red underline over every word the {@link Checker} reports as
 * misspelled (skipping ignored/dictionary words, and any text carrying a `code`
 * mark or inside a code block), plus a blue underline for each supplied grammar
 * issue. Pure over the doc so it's unit-testable without an editor instance.
 */
export function computeSpellDecorations(
  doc: ProseMirrorNode,
  { checker, ignores, dictionary, grammar }: SpellDecorationOptions,
): DecorationSet {
  const ignoreSet = toLowerSet(ignores);
  const dictionarySet = toLowerSet(dictionary);
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    // Never spell-check code: skip whole code blocks and any `code`-marked text.
    if (node.type.spec.code) return false;
    if (!node.isText || node.text == null) return undefined;
    if (node.marks.some((mark) => mark.type.name === "code")) return undefined;

    for (const token of tokenize(node.text)) {
      const lower = token.word.toLowerCase();
      if (ignoreSet.has(lower) || dictionarySet.has(lower)) continue;
      if (checker.check(token.word)) continue;
      decorations.push(
        Decoration.inline(
          pos + token.from,
          pos + token.to,
          { class: SPELL_ERROR_CLASS },
          { word: token.word, kind: "spelling", class: SPELL_ERROR_CLASS },
        ),
      );
    }
    return undefined;
  });

  for (const issue of grammar ?? []) {
    decorations.push(
      Decoration.inline(
        issue.from,
        issue.to,
        { class: SPELL_GRAMMAR_CLASS },
        { message: issue.message, kind: "grammar", class: SPELL_GRAMMAR_CLASS },
      ),
    );
  }

  return DecorationSet.create(doc, decorations);
}

function toLowerSet(words: Iterable<string>): Set<string> {
  const set = new Set<string>();
  for (const word of words) set.add(word.toLowerCase());
  return set;
}
