import type { EditorEvents } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

import type { Json } from "@/lib/database.types";

/** Coarse save status surfaced by the autosave indicator. */
export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Transaction meta flag for programmatic, non-user edits that must not count as
 * a change worth saving (e.g. a page-link NodeView refreshing its cached label
 * when the page index loads). Tag such transactions with
 * `tr.setMeta(SKIP_AUTOSAVE_META, true)` so autosave ignores them.
 */
export const SKIP_AUTOSAVE_META = "skipAutosave";

/**
 * `onPersist` may run synchronously or return a promise we can await to learn
 * whether the write actually succeeded (so the indicator can go green/red).
 */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- `void` in the union is intentional so synchronous onPersist callbacks can return nothing.
export type PersistFn = (content: Json) => void | Promise<unknown>;

// How long "Saved" lingers before the indicator drifts back to idle.
const SAVED_LINGER = 1500;

/**
 * Invisible autosave: debounces persistence and hands the document to
 * `onPersist` (the optimistic mutation). Pending edits are flushed immediately
 * on blur and on unmount — and because the editor is keyed by document id, an
 * unmount flush is exactly what guarantees no edits are lost when switching
 * documents.
 *
 * Serialization (`editor.getJSON()`, an O(document) walk) happens at flush time
 * rather than on every keystroke: updates only mark the document dirty, so a
 * burst of typing serializes once when it settles instead of once per stroke.
 *
 * Returns a coarse save state purely for the unobtrusive indicator; the actual
 * persistence/rollback is owned by the injected mutation.
 */
export function useAutosave(
  editor: Editor | null,
  onPersist: PersistFn,
  delay = 700,
): SaveState {
  const [state, setState] = useState<SaveState>("idle");

  // Keep the latest callback without re-subscribing editor listeners.
  const persistRef = useRef(onPersist);
  useEffect(() => {
    persistRef.current = onPersist;
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A save kicked off just before unmount can still resolve afterwards; guard
  // the post-await `setState` so it doesn't fire on a torn-down component.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // Whether there are unsaved edits to serialize on the next flush. We hold a
  // dirty flag rather than a serialized snapshot so the expensive `getJSON()`
  // runs once at flush time, not on every keystroke.
  const dirty = useRef(false);

  useEffect(() => {
    if (!editor) return;

    // `notify` is skipped during unmount so we never setState on a gone tree.
    const flush = (notify: boolean) => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (!dirty.current) return;
      dirty.current = false;
      const content = editor.getJSON() as Json;
      const result = persistRef.current(content);
      const promise =
        result && typeof result.then === "function" ? result : null;

      if (!notify) {
        // Still let the write happen, but swallow any rejection so it doesn't
        // surface as an unhandled promise after the component is gone.
        promise?.catch(() => {
          /* swallow: the component is gone, nothing to surface */
        });
        return;
      }

      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (!promise) {
        setState("saved");
        idleTimer.current = setTimeout(() => {
          setState("idle");
        }, SAVED_LINGER);
        return;
      }
      promise.then(
        () => {
          if (!mounted.current) return;
          setState("saved");
          idleTimer.current = setTimeout(() => {
            setState("idle");
          }, SAVED_LINGER);
        },
        () => {
          if (!mounted.current) return;
          setState("error");
        }, // stays red until the next edit/save
      );
    };

    const handleUpdate = ({ transaction }: EditorEvents["update"]) => {
      // Skip programmatic transactions that opt out of autosave so they don't
      // trigger a network write (or a "saving" flicker) on document open.
      if (transaction.getMeta(SKIP_AUTOSAVE_META)) return;
      dirty.current = true;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      setState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        flush(true);
      }, delay);
    };

    const handleBlur = () => {
      flush(true);
    };

    editor.on("update", handleUpdate);
    editor.on("blur", handleBlur);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("blur", handleBlur);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      flush(false);
    };
  }, [editor, delay]);

  return state;
}
