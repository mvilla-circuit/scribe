# AGENTS.md — src/store

Zustand UI state, persisted to `localStorage` (the `scribe-ui` slice). See the
root [`AGENTS.md`](../../AGENTS.md) for repo-wide conventions.

## Area-specific rules

- **Boundaries**: `store` may import from `lib` only. It must not reach up into
  `components`, `editor`, `data`, `fonts`, or `theme`.
- **JSDoc**: exported state hooks and types require a description block (no
  `{type}` tags), per the root conventions.

## Persistence

- **Sanitize on every hydrate, not just on a version bump**: route the persisted
  blob through the migration/sanitizer in the persist `merge` callback, not only
  in `migrate` (which `persist` calls solely on a version mismatch). A corrupted
  or partially-shaped payload must be coerced to valid state on every load so
  reducers can't crash on it (e.g. a non-array `expandedFolderIds` reaching
  `arr.includes`).
- **Keep ephemeral selection out of `partialize`**: per-session fields
  (`activeBookId`/`activeDocId`) are deliberately not persisted — persisting them
  would write to `localStorage` on every navigation and restore stale context on
  reload. The store also wraps storage to skip redundant writes whose serialized
  payload is unchanged; don't reintroduce per-`set` writes on the hot path.
