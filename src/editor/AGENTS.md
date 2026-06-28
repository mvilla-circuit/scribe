# AGENTS.md — src/editor

The rich-text editor, built on **TipTap 3 + ProseMirror**. Custom nodes/marks
and commands live in `src/editor/extensions/`. See the root
[`AGENTS.md`](../../AGENTS.md) for repo-wide conventions.

## Area-specific rules

- **Loosely-typed library callbacks**: inside `src/editor/extensions/**`, the
  `@typescript-eslint/no-unsafe-*` family is intentionally disabled because
  TipTap's node-attribute and schema callbacks are typed as `any`. Rely on that
  scoped carve-out instead of adding inline `eslint-disable` comments, and keep
  any casts as local and narrow as possible. The carve-out does **not** apply to
  the rest of `src/editor/`.
- **No collaboration / Yjs**: this app has no collab. TipTap's collaboration
  peers are aliased to a no-op shim at `src/editor/shims/tiptap-collab.ts` (see
  `vite.config.ts`). Don't add `@tiptap/extension-collaboration`, `@tiptap/y-tiptap`,
  Yjs, or other collab dependencies.
- **JSDoc**: exported editor utilities (the `editor/` layer) require a
  description block on their public API, per the root conventions.

## Hot path

The editor runs work on every keystroke and selection change. Keep it lean:

- **Build once per instance**: memoize the extension set and the normalized
  initial content (keyed by `documentId`), not per render. Migrations should
  return the original node when nothing changed so a modern document isn't
  deep-cloned on mount.
- **Short-circuit per-keystroke selectors**: state probes that run on every
  transaction (e.g. table `can()`/`isActive` checks) must return a constant
  snapshot when they don't apply, before doing the real work.
- **Debounce attribute writes**: commit node-attribute edits (quote citations)
  and whole-document walks (outline recompute) on blur/idle, not on every
  keystroke.
- **Contain save-state renders**: wrap the floating overlay children
  (`BubbleToolbar`, `BlockHandle`, `TableControls`, `PagePicker`) in `React.memo`
  and keep `saveState` consumption scoped, so a save transition doesn't cascade.
- **Guard async after unmount**: autosave and other in-flight promises must check
  a `mounted` ref before touching state in their `.then`.

## Boundaries

`editor` may import from `components`, `data`, `store`, and `lib` (and `components`
may import back into `editor`). It may **not** import from `theme` or `fonts`.
