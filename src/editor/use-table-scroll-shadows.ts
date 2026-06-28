import type { Editor } from "@tiptap/react";
import { useEffect } from "react";

/**
 * Drives the horizontal scroll-fade hints on wide tables. Each `.tableWrapper`
 * is its own scroll container, so this measures every one and:
 *   - toggles `data-overflow-start` / `data-overflow-end` when content is
 *     clipped to the left / right (the CSS fades the matching edge gradient in),
 *   - publishes the scroll range as `--tbl-max` so the CSS scroll-driven
 *     animation can pin the overlays to the visible edges on the compositor
 *     (with a `--tbl-fade-*-x` = scrollLeft transform as the fallback for
 *     browsers without scroll-driven animations).
 * It re-measures on scroll, on size changes (window/column resize, fit-to-width),
 * and when tables are inserted or their column widths change.
 */
export function useTableScrollShadows(editor: Editor | null) {
  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom;

    // Where scroll-driven animations exist, the CSS pins the overlays on the
    // compositor (jitter-free) and JS need only flag overflow + publish --tbl-max.
    // Otherwise we fall back to chasing scrollLeft with a transform on the main
    // thread (functional, but a frame behind).
    const supportsScrollTimeline =
      typeof CSS !== "undefined" &&
      CSS.supports("animation-timeline", "scroll()");

    const sync = (wrapper: HTMLElement) => {
      const max = wrapper.scrollWidth - wrapper.clientWidth;
      const left = wrapper.scrollLeft;
      const overflows = max > 1;
      // A pixel of slack absorbs sub-pixel rounding so the hints don't flicker
      // at the extremes.
      wrapper.toggleAttribute("data-overflow-start", overflows && left > 1);
      wrapper.toggleAttribute("data-overflow-end", overflows && left < max - 1);
      // Drives the keyframe end so the compositor pins the overlays to the edges.
      wrapper.style.setProperty("--tbl-max", `${max}px`);
      if (!supportsScrollTimeline) {
        // Fallback only: re-pin by countering the scroll with +scrollLeft.
        wrapper.style.setProperty("--tbl-fade-left-x", `${left}px`);
        wrapper.style.setProperty("--tbl-fade-right-x", `${left}px`);
      }
    };

    const wrappers = () => root.querySelectorAll<HTMLElement>(".tableWrapper");
    const syncAll = () => {
      wrappers().forEach(sync);
    };

    // Track each wrapper (viewport width) and its table (content width), since a
    // table can slip in or out of overflow without firing a scroll event.
    const ro = new ResizeObserver(syncAll);
    const observeTargets = () => {
      ro.observe(root);
      wrappers().forEach((w) => {
        ro.observe(w);
        const table = w.querySelector("table");
        if (table) ro.observe(table);
      });
    };

    // Coalesce a burst of mutations into a single re-observe + measure on the
    // next frame, so a run of structural edits doesn't force layout repeatedly.
    let frame = 0;
    const scheduleSync = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        observeTargets();
        syncAll();
      });
    };

    // Scroll events don't bubble, so catch each scroller in the capture phase.
    const onScroll = (e: Event) => {
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        target.classList.contains("tableWrapper")
      ) {
        sync(target);
      }
    };
    root.addEventListener("scroll", onScroll, true);

    const mo = new MutationObserver((records) => {
      // Ignore our own writes (data-overflow flags + custom props land on the
      // wrapper) to avoid a feedback loop; react to everything else.
      const relevant = records.some((r) => {
        if (
          r.type === "attributes" &&
          r.target instanceof HTMLElement &&
          r.target.classList.contains("tableWrapper")
        ) {
          return false;
        }
        return true;
      });
      if (!relevant) return;
      // Common case: the document has no tables. Skip the re-observe + measure
      // entirely — inserting a table is itself a mutation that re-triggers this,
      // so we never miss one.
      if (!root.querySelector(".tableWrapper")) return;
      scheduleSync();
    });
    mo.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });

    observeTargets();
    syncAll();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      root.removeEventListener("scroll", onScroll, true);
      ro.disconnect();
      mo.disconnect();
    };
  }, [editor]);
}
