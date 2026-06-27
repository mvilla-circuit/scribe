import { PluginKey } from "@tiptap/pm/state";

// `@tiptap/extension-drag-handle` declares the Yjs collaboration stack
// (`@tiptap/extension-collaboration`, `@tiptap/y-tiptap`) as peer dependencies,
// but only references `isChangeOrigin()` and `ySyncPluginKey` to ignore
// transactions that originate from a collaboration sync. Scribe is single-user
// and never registers a Yjs sync plugin, so both packages are aliased to this
// no-op shim in `vite.config.ts`. That keeps the heavy yjs/y-prosemirror tree
// out of the bundle while preserving correct behaviour: with no sync plugin,
// `ySyncPluginKey.getState()` is undefined and no transaction is
// collaboration-origin.
export function isChangeOrigin(): boolean {
  return false;
}

export const ySyncPluginKey = new PluginKey("y-sync");

// Referenced by the drag-handle plugin only behind a `ySyncPluginKey.getState()`
// guard, which is always falsy without a sync plugin — so these are never
// actually invoked. They exist solely to satisfy the import.
export function absolutePositionToRelativePosition(): unknown {
  return null;
}

export function relativePositionToAbsolutePosition(): unknown {
  return null;
}
