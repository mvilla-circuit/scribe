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

## Boundaries

`editor` may import from `components`, `data`, `store`, and `lib` (and `components`
may import back into `editor`). It may **not** import from `theme` or `fonts`.
