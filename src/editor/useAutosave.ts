import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Json } from "../lib/database.types";

export type SaveState = "idle" | "saving" | "saved" | "error";

// `onPersist` may run synchronously or return a promise we can await to learn
// whether the write actually succeeded (so the indicator can go green/red).
export type PersistFn = (content: Json) => void | Promise<unknown>;

// How long "Saved" lingers before the indicator drifts back to idle.
const SAVED_LINGER = 1500;

// Invisible autosave: debounces `editor.getJSON()` and hands it to `onPersist`
// (the optimistic mutation). Pending edits are flushed immediately on blur and
// on unmount — and because the editor is keyed by document id, an unmount flush
// is exactly what guarantees no edits are lost when switching documents.
//
// Returns a coarse save state purely for the unobtrusive indicator; the actual
// persistence/rollback is owned by the injected mutation.
export function useAutosave(
  editor: Editor | null,
  onPersist: PersistFn,
  delay = 700
): SaveState {
  const [state, setState] = useState<SaveState>("idle");

  // Keep the latest callback without re-subscribing editor listeners.
  const persistRef = useRef(onPersist);
  useEffect(() => {
    persistRef.current = onPersist;
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Json | null>(null);

  useEffect(() => {
    if (!editor) return;

    // `notify` is skipped during unmount so we never setState on a gone tree.
    const flush = (notify: boolean) => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (pending.current === null) return;
      const content = pending.current;
      pending.current = null;
      const result = persistRef.current(content);
      const promise =
        result && typeof (result as Promise<unknown>).then === "function"
          ? (result as Promise<unknown>)
          : null;

      if (!notify) {
        // Still let the write happen, but swallow any rejection so it doesn't
        // surface as an unhandled promise after the component is gone.
        promise?.catch(() => {});
        return;
      }

      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (!promise) {
        setState("saved");
        idleTimer.current = setTimeout(() => setState("idle"), SAVED_LINGER);
        return;
      }
      promise.then(
        () => {
          setState("saved");
          idleTimer.current = setTimeout(() => setState("idle"), SAVED_LINGER);
        },
        () => setState("error") // stays red until the next edit/save
      );
    };

    const handleUpdate = () => {
      pending.current = editor.getJSON() as Json;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      setState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(true), delay);
    };

    const handleBlur = () => flush(true);

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
