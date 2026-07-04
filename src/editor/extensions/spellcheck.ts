import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DecorationSet } from "@tiptap/pm/view";

import type { Checker } from "@/lib/spellcheck/checker";

import {
  computeSpellDecorations,
  type GrammarProvider,
  noopGrammarProvider,
} from "./spellcheck-decorations";
import { useSpellPopover } from "./spellcheck-store";

/**
 * Configuration for the {@link Spellcheck} extension. The getters are read lazily
 * (backed by refs in the editor) so the extension set can be built once while
 * still seeing the latest enabled flag, per-document ignores, and account-wide
 * dictionary on each recompute.
 */
export interface SpellcheckOptions {
  /** The engine, or null before one is provided (then nothing is checked). */
  checker: Checker | null;
  /** Whether spellchecking is on for the current document. */
  isEnabled: () => boolean;
  /** Words ignored for the current document. */
  getIgnores: () => string[];
  /** Words in the account-wide dictionary. */
  getDictionary: () => string[];
  /** Supplies grammar (blue) issues; the default yields none. */
  grammarProvider: GrammarProvider;
  /** Called when the writer chooses "Ignore" for a word. */
  onIgnoreWord: (word: string) => void;
  /** Called when the writer chooses "Add to dictionary" for a word. */
  onAddToDictionary: (word: string) => void;
}

interface SpellcheckState {
  decorations: DecorationSet;
  // Set when the doc changed or a recompute was requested, cleared once the
  // debounced recompute lands its fresh DecorationSet.
  dirty: boolean;
}

/** Plugin key for the spellcheck decoration state (exported for `setMeta`). */
export const spellcheckPluginKey = new PluginKey<SpellcheckState>(
  "scribeSpellcheck",
);

// How long typing must settle before the whole-document decorations are
// recomputed. Between recomputes the existing set is mapped through each
// transaction, so squiggles track edits without a per-keystroke walk.
const RECOMPUTE_DEBOUNCE_MS = 400;

function computeDecorations(
  doc: ProseMirrorNode,
  options: SpellcheckOptions,
): DecorationSet {
  if (!options.isEnabled() || !options.checker) return DecorationSet.empty;
  return computeSpellDecorations(doc, {
    checker: options.checker,
    ignores: options.getIgnores(),
    dictionary: options.getDictionary(),
    grammar: options.grammarProvider.getIssues(doc),
  });
}

/**
 * TipTap extension that renders spelling (red) and grammar (blue) squiggles as
 * ProseMirror decorations and opens the spellcheck popover when one is clicked.
 * Decorations are recomputed debounced-on-idle and mapped through transactions
 * in between, keeping the typing hot path clear (see the editor AGENTS notes).
 */
export const Spellcheck = Extension.create<SpellcheckOptions>({
  name: "scribeSpellcheck",

  addOptions() {
    return {
      checker: null,
      isEnabled: () => false,
      getIgnores: () => [],
      getDictionary: () => [],
      grammarProvider: noopGrammarProvider,
      onIgnoreWord: () => {
        // no-op default; the editor wires the real per-document persistence.
      },
      onAddToDictionary: () => {
        // no-op default; the editor wires the real account-wide persistence.
      },
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin<SpellcheckState>({
        key: spellcheckPluginKey,
        state: {
          init: (_config, state) => ({
            decorations: computeDecorations(state.doc, options),
            dirty: false,
          }),
          apply(tr, value) {
            const meta = tr.getMeta(spellcheckPluginKey);
            // A completed recompute hands back its fresh set and clears dirty.
            if (meta && "decorations" in meta) {
              return { decorations: meta.decorations, dirty: false };
            }
            const decorations = tr.docChanged
              ? value.decorations.map(tr.mapping, tr.doc)
              : value.decorations;
            const dirty =
              value.dirty || tr.docChanged || Boolean(meta?.recompute);
            return { decorations, dirty };
          },
        },
        props: {
          decorations(state) {
            // Hide instantly when turned off, without waiting for a recompute.
            if (!options.isEnabled()) return DecorationSet.empty;
            return (
              spellcheckPluginKey.getState(state)?.decorations ??
              DecorationSet.empty
            );
          },
          handleClick(view, pos) {
            if (!options.isEnabled()) return false;
            const decorations = spellcheckPluginKey.getState(
              view.state,
            )?.decorations;
            const hit = decorations
              ?.find(pos, pos)
              .find((d) => d.spec.kind === "spelling");
            if (!hit) return false;

            const word: string = hit.spec.word;
            const { from, to } = hit;
            const start = view.coordsAtPos(from);
            const end = view.coordsAtPos(to);
            const anchorRect = new DOMRect(
              start.left,
              start.top,
              Math.max(end.right - start.left, 0),
              Math.max(start.bottom - start.top, 0),
            );

            useSpellPopover.getState().open({
              word,
              suggestions: options.checker?.suggest(word) ?? [],
              anchorRect,
              replace: (suggestion) => {
                view.dispatch(view.state.tr.insertText(suggestion, from, to));
                view.focus();
              },
              ignore: () => {
                options.onIgnoreWord(word);
              },
              addToDictionary: () => {
                options.onAddToDictionary(word);
              },
            });
            return true;
          },
        },
        view() {
          let timer: ReturnType<typeof setTimeout> | null = null;
          return {
            update(view) {
              const pluginState = spellcheckPluginKey.getState(view.state);
              if (!pluginState?.dirty) return;
              if (timer) clearTimeout(timer);
              timer = setTimeout(() => {
                timer = null;
                const decorations = computeDecorations(view.state.doc, options);
                view.dispatch(
                  view.state.tr.setMeta(spellcheckPluginKey, { decorations }),
                );
              }, RECOMPUTE_DEBOUNCE_MS);
            },
            destroy() {
              if (timer) clearTimeout(timer);
            },
          };
        },
      }),
    ];
  },
});
