import { Schema } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";

import type { Checker } from "@/lib/spellcheck/checker";

import {
  computeSpellDecorations,
  noopGrammarProvider,
  SPELL_ERROR_CLASS,
  SPELL_GRAMMAR_CLASS,
} from "./spellcheck-decorations";

// A minimal schema mirroring the real editor's relevant shapes: a `codeBlock`
// node (spec.code) and an inline `code` mark, so the code-skipping paths behave
// as they do against the StarterKit schema.
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM: () => ["p", 0],
    },
    codeBlock: {
      group: "block",
      content: "text*",
      code: true,
      toDOM: () => ["pre", ["code", 0]],
    },
    text: { group: "inline" },
  },
  marks: {
    code: { toDOM: () => ["code", 0] },
  },
});

// A stub checker: only the listed words are "wrong"; everything else is known.
function stubChecker(wrong: string[]): Checker {
  const misspelled = new Set(wrong);
  return {
    isReady: true,
    whenReady: Promise.resolve(),
    check: (word) => !misspelled.has(word),
    suggest: () => [],
    add: () => {
      // no-op: this stub's word set is fixed per test.
    },
  };
}

function paragraphDoc(text: string, marks: string[] = []) {
  const appliedMarks = marks.map((name) => schema.mark(name));
  return schema.node("doc", null, [
    schema.node("paragraph", null, [schema.text(text, appliedMarks)]),
  ]);
}

describe("computeSpellDecorations", () => {
  it("underlines an unknown word at its exact range", () => {
    const doc = paragraphDoc("helllo world");
    const set = computeSpellDecorations(doc, {
      checker: stubChecker(["helllo"]),
      ignores: [],
      dictionary: [],
    });

    const found = set.find();
    expect(found).toHaveLength(1);
    // The text opens at position 1 (after the paragraph's open token).
    expect(found[0]!.from).toBe(1);
    expect(found[0]!.to).toBe(1 + "helllo".length);
    expect(found[0]!.spec.class).toBe(SPELL_ERROR_CLASS);
    expect(found[0]!.spec.word).toBe("helllo");
  });

  it("skips known, ignored, and dictionary words", () => {
    const doc = paragraphDoc("alpha bravo charlie");
    const set = computeSpellDecorations(doc, {
      // bravo + charlie are "wrong", but one is ignored and one is in the dict.
      checker: stubChecker(["bravo", "charlie"]),
      ignores: ["bravo"],
      dictionary: ["Charlie"],
    });

    expect(set.find()).toHaveLength(0);
  });

  it("skips text carrying a code mark and text inside a code block", () => {
    const codeMarked = computeSpellDecorations(paragraphDoc("wrng", ["code"]), {
      checker: stubChecker(["wrng"]),
      ignores: [],
      dictionary: [],
    });
    expect(codeMarked.find()).toHaveLength(0);

    const codeBlockDoc = schema.node("doc", null, [
      schema.node("codeBlock", null, [schema.text("wrng")]),
    ]);
    const inCodeBlock = computeSpellDecorations(codeBlockDoc, {
      checker: stubChecker(["wrng"]),
      ignores: [],
      dictionary: [],
    });
    expect(inCodeBlock.find()).toHaveLength(0);
  });

  it("renders blue issues supplied by a grammar provider", () => {
    const doc = paragraphDoc("hello world");
    const set = computeSpellDecorations(doc, {
      checker: stubChecker([]),
      ignores: [],
      dictionary: [],
      grammar: [{ from: 1, to: 6, message: "consider revising" }],
    });

    const found = set.find();
    expect(found).toHaveLength(1);
    expect(found[0]!.spec.class).toBe(SPELL_GRAMMAR_CLASS);
    expect(found[0]!.spec.message).toBe("consider revising");
  });

  it("the default grammar provider yields no issues", () => {
    expect(noopGrammarProvider.getIssues(paragraphDoc("hello"))).toEqual([]);
  });
});
