import { createCallbackStore } from "./callback-store";
import type { PageTargetType } from "./page-ref";

/** A page (document or book) chosen in the "Link to page" picker. */
export interface PagePickTarget {
  targetType: PageTargetType;
  targetId: string;
  label: string;
}

/**
 * Imperative store backing the "Link to page" picker. The slash item calls
 * `open(cb)`; the `<PagePicker>` rendered alongside the editor shows while
 * `callback` is set and invokes it with the chosen page/book target.
 */
export const usePagePicker = createCallbackStore<PagePickTarget>();
