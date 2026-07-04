import type NSpell from "nspell";

/**
 * A spell-checking engine over a bundled en-US Hunspell dictionary. Created
 * asynchronously because the dictionary is lazy-loaded off the typing hot path;
 * until it resolves, {@link Checker.check} reports every word as known so no
 * false squiggles flash before the dictionary is in memory.
 */
export interface Checker {
  /** True once the dictionary has loaded. */
  readonly isReady: boolean;
  /** Resolves when the dictionary has finished loading (or failed to). */
  readonly whenReady: Promise<void>;
  /** Whether `word` is spelled correctly (always true before the dict loads). */
  check(word: string): boolean;
  /** Correctly-spelled words close to `word` (empty before the dict loads). */
  suggest(word: string): string[];
  /** Marks `word` as known for the remainder of this session. */
  add(word: string): void;
}

// Lazy-load nspell and the en-US aff/dic as raw strings so the ~1.5MB
// dictionary sits in its own chunk, fetched only when a Checker is created
// rather than on the editor's critical path.
async function loadDictionary(): Promise<NSpell> {
  const [nspell, aff, dic] = await Promise.all([
    import("nspell"),
    import("dictionary-en/aff?raw"),
    import("dictionary-en/dic?raw"),
  ]);
  return nspell.default(aff.default, dic.default);
}

/**
 * Builds a {@link Checker}, kicking off the async dictionary load immediately.
 * `onReady` (if given) fires once the dictionary is in memory so a consumer can
 * trigger a single recompute — before then, `check` treats everything as known.
 * Words added via {@link Checker.add} before the load completes are queued and
 * applied once it does.
 */
export function createChecker(onReady?: () => void): Checker {
  let spell: NSpell | null = null;
  let ready = false;
  const pendingAdds: string[] = [];

  const whenReady = loadDictionary()
    .then((instance) => {
      for (const word of pendingAdds) instance.add(word);
      spell = instance;
      ready = true;
      onReady?.();
    })
    .catch((error: unknown) => {
      // A failed load leaves the checker permanently "everything is known", so
      // the editor degrades to no squiggles rather than crashing.
      console.error("Spellcheck dictionary failed to load", error);
    });

  return {
    get isReady() {
      return ready;
    },
    whenReady,
    check(word) {
      return spell ? spell.correct(word) : true;
    },
    suggest(word) {
      return spell ? spell.suggest(word) : [];
    },
    add(word) {
      if (spell) spell.add(word);
      else pendingAdds.push(word);
    },
  };
}

// A process-wide checker shared across editor instances so switching pages
// never reloads the dictionary. Created on first use.
let shared: Checker | null = null;

/**
 * Returns the shared {@link Checker}, creating (and starting to load) it on the
 * first call. `onReady` is invoked when the dictionary becomes available; if the
 * checker is already ready it fires on the next microtask.
 */
export function getSharedChecker(onReady?: () => void): Checker {
  if (shared) {
    if (onReady) void shared.whenReady.then(onReady);
    return shared;
  }
  shared = createChecker(onReady);
  return shared;
}
