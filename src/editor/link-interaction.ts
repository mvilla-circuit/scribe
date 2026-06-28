/**
 * Resolves the nearest ancestor anchor's href for an event target, climbing
 * out of any inline element the event landed on. Returns null when the target
 * is not inside a link.
 */
export function resolveLinkHref(target: EventTarget | null): string | null {
  let el: Element | null = null;
  if (target instanceof Element) {
    el = target;
  } else if (target instanceof Node) {
    el = target.parentElement;
  }
  const anchor = el?.closest("a[href]");
  return anchor?.getAttribute("href") ?? null;
}

/**
 * Decides whether a click on the editor surface should open a link instead of
 * placing the caret: true only for a plain primary-button click on a link with
 * no active text selection, in which case it opens the href via the injected
 * `openUrl`. Returns false otherwise (non-link, secondary button, a modified
 * click, or an active drag/selection), leaving the editor's default behavior
 * intact — so e.g. Shift-click can still extend a selection across a link.
 */
export function openLinkFromEvent(
  event: {
    button: number;
    target: EventTarget | null;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    ctrlKey?: boolean;
  },
  opts: { openUrl: (url: string) => unknown; hasTextSelection: boolean },
): boolean {
  if (event.button !== 0 || opts.hasTextSelection) {
    return false;
  }
  if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) {
    return false;
  }
  const href = resolveLinkHref(event.target);
  if (href === null) {
    return false;
  }
  opts.openUrl(href);
  return true;
}
