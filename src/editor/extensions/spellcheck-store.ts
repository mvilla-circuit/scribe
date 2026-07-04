import { create } from "zustand";

/**
 * The misspelled word the spellcheck popover is currently offering actions for,
 * along with the callbacks that carry them out. Built by the spellcheck plugin
 * when a squiggle is clicked and consumed by the popover mounted alongside the
 * editor.
 */
export interface SpellTarget {
  /** The offending word under the squiggle. */
  word: string;
  /** Correctly-spelled suggestions from the checker (may be empty). */
  suggestions: string[];
  /** Screen rect of the squiggle, used to anchor the popover (Radix). */
  anchorRect: DOMRect | null;
  /** Replace the misspelled range with the chosen suggestion. */
  replace: (suggestion: string) => void;
  /** Ignore the word for the current document. */
  ignore: () => void;
  /** Add the word to the account-wide dictionary. */
  addToDictionary: () => void;
}

/** Imperative bridge state for the spellcheck popover. */
interface SpellPopoverStore {
  /** The active target while the popover is open, or null when closed. */
  target: SpellTarget | null;
  /** Open the popover for `target`. */
  open: (target: SpellTarget) => void;
  /** Close the popover and drop the active target. */
  close: () => void;
}

/**
 * Store backing the spellcheck popover, mirroring the editor's other
 * callback-store overlays (page picker, link prompt): the plugin calls
 * `open(target)` on a squiggle click and the mounted `<SpellPopover>` renders
 * while a target is set, invoking its callbacks and then `close()`.
 */
export const useSpellPopover = create<SpellPopoverStore>((set) => ({
  target: null,
  open: (target) => {
    set({ target });
  },
  close: () => {
    set({ target: null });
  },
}));
