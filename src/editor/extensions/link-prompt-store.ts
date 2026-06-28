import { create } from "zustand";

// A tiny bridge so a slash-menu item (a plain editor callback) can summon the
// React URL prompt, mirroring the page-picker store. The "Bookmark" item calls
// `open(cb)`; the <LinkPrompt> rendered alongside the editor shows while
// `onSubmit` is set and invokes it with the entered URL.
interface LinkPromptState {
  onSubmit: ((url: string) => void) | null;
  open: (cb: (url: string) => void) => void;
  close: () => void;
}

/** Imperative store backing the in-app URL prompt used by the Bookmark slash item. */
export const useLinkPrompt = create<LinkPromptState>((set) => ({
  onSubmit: null,
  open: (cb) => {
    set({ onSubmit: cb });
  },
  close: () => {
    set({ onSubmit: null });
  },
}));
