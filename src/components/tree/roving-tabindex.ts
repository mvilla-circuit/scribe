import { createContext, useContext } from "react";

// Roving-tabindex coordination for the shared tree rows. A WAI-ARIA tree is a
// single tab stop: exactly one row is reachable with Tab, and Arrow/Home/End
// move focus between rows. `TreeDndContainer` owns the state and navigation;
// each row reads its tab index from this context.

export interface RovingTabindex {
  /** 0 for the one active tab stop, -1 for every other row. */
  getTabIndex: (id: string) => 0 | -1;
}

export const RovingTabindexContext = createContext<RovingTabindex | null>(null);

/**
 * The tab index a tree row should render: 0 when it is the tree's single tab
 * stop, -1 otherwise. Falls back to a normal tab stop outside a provider.
 */
export function useRovingTabindex(id: string): 0 | -1 {
  const ctx = useContext(RovingTabindexContext);
  return ctx ? ctx.getTabIndex(id) : 0;
}
