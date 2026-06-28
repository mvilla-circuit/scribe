// The heading levels Scribe enables, in one leaf module so the editor's
// extension config, the slash/turn-into registry, and the DOM queries that scan
// for headings (the page outline rail and the active-section tracker) all stay
// in lockstep instead of repeating the magic `[1, 2, 3]` / `"h1, h2, h3"`.

/** The heading levels offered by the editor (Heading 1–3). */
export const HEADING_LEVELS = [1, 2, 3] as const;

/** A CSS selector matching every enabled heading tag, e.g. `"h1, h2, h3"`. */
export const HEADING_SELECTOR = HEADING_LEVELS.map((level) => `h${level}`).join(
  ", ",
);
