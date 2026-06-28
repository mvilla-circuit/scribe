import { createCallbackStore } from "./callback-store";

/**
 * Imperative store backing the in-app URL prompt used by the Bookmark slash
 * item. The item calls `open(cb)`; the `<LinkPrompt>` rendered alongside the
 * editor shows while `callback` is set and invokes it with the entered URL.
 */
export const useLinkPrompt = createCallbackStore<string>();
