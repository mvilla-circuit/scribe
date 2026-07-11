# Collection Whiteboard Design

## Summary

A whiteboard is a collection-scoped leaf alongside datagrids and entries. It
provides a lightweight spatial surface for arranging notes and labels without
turning the collection into a diagramming or collaborative-canvas product.

## Data model

Each whiteboard belongs to one collection and one user. The `whiteboards` row
stores leaf metadata (`name`, `icon`, `cover_url`, and `position`) plus the
entire canvas document in a single non-null `scene` JSONB column.

The scene contains all canvas objects and their presentation state. Initial
object types are:

- **Sticky** — a compact colored note.
- **Text** — free-positioned plain text.
- **Frame** — a visual region for organizing the surface.

Frames are visual-only objects. Objects placed over a frame do not become its
children, and moving or deleting a frame has no ownership effect on overlapping
objects.

## Canvas and interactions

The editor uses a custom DOM canvas rather than a third-party diagramming
library. It supports the standard interactions needed for the initial release:

- creating and editing sticky, text, and frame objects;
- single- and multi-selection;
- dragging one object or a selected group;
- changing object z-order;
- deleting the current selection with Delete; and
- basic local undo for scene edits.

There are no connectors or object relationships in the scene model.

## Persistence

The client reads and writes the scene as one JSON document on the whiteboard
row. Scene changes are persisted with a debounced PATCH to avoid a request for
every pointer movement or keystroke. The row's `updated_at` timestamp is managed
by the shared database trigger.

The initial design is single-user and last-write-wins. It does not include
operation logs, object-level persistence, conflict resolution, or realtime
collaboration.

## Scope boundaries

The initial release explicitly excludes:

- connectors;
- snapping or alignment guides;
- images;
- freehand drawing;
- realtime collaboration;
- links from canvas objects to documents; and
- frame parent/child ownership.
