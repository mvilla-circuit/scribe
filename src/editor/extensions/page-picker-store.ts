import { create } from "zustand";

import type { PageTargetType } from "./page-ref";

/** A page (document or book) chosen in the "Link to page" picker. */
interface PagePickTarget {
  targetType: PageTargetType;
  targetId: string;
  label: string;
}

// A tiny bridge so a slash-menu item (plain editor callback) can summon the
// React page picker. The "Link to page" item calls `open(cb)`; the <PagePicker>
// rendered alongside the editor shows while `onSelect` is set and invokes it.
interface PagePickerState {
  onSelect: ((target: PagePickTarget) => void) | null;
  open: (cb: (target: PagePickTarget) => void) => void;
  close: () => void;
}

export const usePagePicker = create<PagePickerState>((set) => ({
  onSelect: null,
  open: (cb) => {
    set({ onSelect: cb });
  },
  close: () => {
    set({ onSelect: null });
  },
}));
