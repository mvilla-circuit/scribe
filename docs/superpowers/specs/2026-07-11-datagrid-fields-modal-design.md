# Datagrid Fields modal — Notion-like redesign

**Date:** 2026-07-11  
**Status:** Approved for planning  
**Scope:** `FieldManager` UI for create / rename / retype / reorder / delete (and nested option editing for select-like types)

## Problem

The current Fields dialog pairs a bordered name `<input>` with a native `<select>` inside boxed cards, plus up/down chevrons for reorder. That chrome feels form-heavy and at odds with Scribe’s calm editorial UI. Creating a field also dumps a generic “New field” + default Text type, rather than choosing type first.

## Goals

- Match Notion’s property-management feel: type-first create, optional rename, quiet list rows.
- Make create, remove, and reorder feel effortless and visually light.
- Keep persistence behavior unchanged: edits still flow through `datagrid-fields` helpers and `onChange` as today.

## Non-goals

- Formula / rollup field types.
- Confirm dialogs when deleting fields that already hold data (defer; v1 deletes immediately).
- Drag-and-drop for option rows inside select config (keep simple add/remove for options).
- Changing how fields are stored in `datagrids.fields` jsonb.

## Design

### Create (type-first)

1. User clicks **Add field**.
2. A popover/menu lists field types with icon + label (the same set as today’s `FIELD_TYPE_OPTIONS`, including created/updated time).
3. Choosing a type **immediately creates** a field:
   - `type` = chosen type
   - `name` = default label for that type (`Text`, `Number`, `Date`, `Select`, `Multi-select`, `Status`, `Checkbox`, `URL`, `Relation`, `Created time`, `Updated time`)
   - `config` = `{}`, or `{ options: [] }` for select / multi-select / status
4. Focus moves to the new row’s **name** control so the user can rename or leave the default.

No empty placeholder row. No side-by-side name input + type `<select>` on create.

### List row chrome

Each field is one quiet list row (no per-field bordered card):

| Region      | Behavior                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------- |
| Drag handle | Reorder via pointer drag (replace up/down chevrons)                                           |
| Name        | Inline editable text; borderless until hover/focus (match row-detail `INPUT_CLASS` quietness) |
| Type chip   | Shows current type (icon + short label); click opens the same type menu to retype             |
| Trash       | Appears on row hover (and keyboard focus within the row); click deletes immediately           |

Row layout (left → right): `drag · name · type chip · trash`.

### Retype

Changing type via the chip uses the existing `updateField` / config reset rules (option types keep or seed `options`; non-option types clear option config). Expanding option editors follows type.

### Option config (select / multi-select / status)

When the field type needs options, a nested block appears **under** the row (indent or subtle divider — not a second full card). Keep today’s option UX in spirit (name, color swatches, add/remove), restyled to sit under the quiet row rather than inside a heavy box. Polish of option color pickers is secondary to the create/reorder/remove redesign.

### Remove

- Direct **trash on hover** (and when the row contains focus), not buried in a ⋯ menu.
- v1: delete immediately with no confirmation.
- Empty-state copy when there are zero fields remains.

### Footer

- Left: **Add field** (opens type menu).
- Right: **Done** (closes dialog). Persistence stays live-on-edit as today.

### Visual language

- Tokens only (`bg-surface` / `bg-bg`, `border-border`, `text-muted`, `text-danger` on trash hover).
- Prefer hairline separators or whitespace between rows over nested cards.
- Type menu: elevated popover (`shadow-popover`), same family as other Scribe menus — not a native `<select>`.
- Motion: existing quiet transitions; respect `prefers-reduced-motion`.

## Data / API

No schema changes. Continue to use:

- `addField` / `updateField` / `deleteField` / `reorderField` from `src/data/datagrid-fields.ts`
- Parent `onChange(fields)` → `useUpdateDatagrid` fields patch

Add a small pure helper if useful, e.g. `defaultFieldName(type): string`, covered by unit tests.

## Testing

- Unit: default name per type; type-first add produces correct field shape.
- Component: Add field → pick type → row appears with default name and focused name control; hover reveals trash; delete removes row; type chip opens menu and retypes; drag reorder updates order (or keyboard-accessible reorder fallback if drag tests are brittle — prefer testing the reorder callback with a simulated drop / existing dnd test patterns in the repo).
- Regression: option editor still appears for select-like types.

## Open points (resolved)

- **Delete affordance:** direct trash on hover (approved).
- **Create flow:** type-first with editable default name (approved).
- **Row model:** Option A list + chip (approved).
