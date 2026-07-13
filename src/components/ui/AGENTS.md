# AGENTS.md — src/components/ui

Shared design-system primitives for app chrome. See the root
[`AGENTS.md`](../../../AGENTS.md) for repo-wide conventions.

## Leaf rule

Within `components/`, treat `ui/` as a **leaf**:

```
feature (book|collection|datagrid|sidebar|tree|whiteboard|settings) → ui → lib
ui ↛ feature folders
```

Do not import from `book/`, `collection/`, `datagrid/`, `sidebar/`, `tree/`,
`whiteboard/`, or `settings/`. Pass slots (`children`, `footerExtra`, callbacks)
so domain data stays in feature folders.

Soft rule for **new** `ui/` code: no React Query / Zustand. Existing exceptions
(`IconPicker`, `PageCover` → `@/data`) stay; do not add more.

## Prefer primitives — no hand-rolling

If a primitive exists, **use it**. Do not copy its Tailwind stack into a feature
file.

| Need                          | Use                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Labeled CTA                   | `Button`                                                                                                    |
| Icon-only chrome control      | `IconButton` (+ built-in `Tooltip` / `aria-label`); use `tooltip={false}` under Radix `asChild`             |
| Text / bordered field         | `Input` or `SearchField` — **never** a raw `<input>` for text/search/url/number/date                        |
| Swatch pill                   | `Chip` / `StaticChip` / `RemovableChip`                                                                     |
| Empty dashed panel            | `EmptyState` (`tone="editorial"` + `titleStyle` for reading-surface empties)                                |
| Dashed create tile            | `DashedAddTile`                                                                                             |
| Elevated floating panel       | `Popover` / `PopoverContent`                                                                                |
| Grid/list (or similar) toggle | `SegmentedControl`                                                                                          |
| Breadcrumb trail              | `Breadcrumb` / `BreadcrumbLink` / `BreadcrumbSep`                                                           |
| Page header icon + title      | `Masthead` (first child = title line the icon centers on; fragments flatten; further siblings render below) |
| Always-on title edit          | `EditableText`                                                                                              |
| One-shot row rename           | `InlineRename`                                                                                              |
| Gallery card shell            | `CoverCard` (`footerExtra` for tags/chips)                                                                  |

Icon-only chrome that must compose with Radix `asChild` (e.g. `PopoverTrigger`)
should use `<IconButton tooltip={false}>` so the trigger receives a single
button element; wrap an outer `Tooltip` when a hover hint is still needed.

Editor chrome that must preserve selection (`preserveSelection`,
`scribe-block-btn`) stays in `editor/` as `EditorIconButton` — compose chrome
only; do not pull selection semantics into `ui/IconButton`.

Relation navigate chips (`bg-tree-group` + open + remove) stay feature-local —
not `RemovableChip` (see `RemovableChip` JSDoc).

## Raw `<input>` ban

ESLint forbids raw `<input>` JSX except:

- Inside [`input.tsx`](./input.tsx) (the primitive itself)
- Non-text types: `file`, `checkbox`, `radio`, `hidden`

Everything else goes through `Input` or `SearchField`. Override chrome with
`className` when a field needs a denser or accented look (`InlineRename`).
