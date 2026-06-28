import type { UseBoundStore } from "zustand";
import { create } from "zustand";
import type { StoreApi } from "zustand/vanilla";

/**
 * A tiny imperative bridge that lets a plain editor callback (e.g. a slash-menu
 * item) summon a React overlay rendered alongside the editor and receive its
 * result. The caller invokes `open(cb)`; the overlay shows while `callback` is
 * set and invokes it with the chosen value, then `close()` tears it back down.
 */
export interface CallbackStore<TArg> {
  /** The pending result handler, or null when the overlay is closed. */
  callback: ((arg: TArg) => void) | null;
  /** Open the overlay, registering `cb` to receive the eventual result. */
  open: (cb: (arg: TArg) => void) => void;
  /** Close the overlay and drop any pending handler. */
  close: () => void;
}

/**
 * Build a {@link CallbackStore} backed by zustand. Factored out because the
 * page picker and the bookmark URL prompt are otherwise identical
 * callback-bridge stores, differing only in the result type they carry.
 */
export function createCallbackStore<TArg>(): UseBoundStore<
  StoreApi<CallbackStore<TArg>>
> {
  return create<CallbackStore<TArg>>((set) => ({
    callback: null,
    open: (cb) => {
      set({ callback: cb });
    },
    close: () => {
      set({ callback: null });
    },
  }));
}
