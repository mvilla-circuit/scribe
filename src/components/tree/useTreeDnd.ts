import {
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMemo, useState } from "react";

import { getPositionBetween } from "../../data/ordering";
import type { DndNode, Projection } from "./treeDnd";

// Drag-and-drop orchestration shared by the Library tree and the in-book
// Outline. Both maintain the same transient drag state, sensors, and derived
// memos (descendant hiding, live projection, the lifted node), and run the same
// drag lifecycle. Each tree supplies only its domain logic: how to project a
// drop, how to find neighbours, and what "move" means.
interface UseTreeDndParams<T extends DndNode> {
  // The fully flattened, ordered node list (before descendant hiding).
  flattened: T[];
  removeDescendants: (nodes: T[], ids: string[]) => T[];
  project: (
    nodes: T[],
    activeId: string,
    overId: string,
    offsetX: number,
  ) => Projection | null;
  neighbours: (
    nodes: T[],
    activeId: string,
    overId: string,
    parentId: string | null,
  ) => { prev?: number; next?: number };
  // Persist a completed move. `position` is a fresh fractional index between
  // the drop neighbours; `node` is the dragged node from the flattened list.
  onMove: (move: {
    id: string;
    parentId: string | null;
    position: number;
    node: T;
  }) => void;
  // Run alongside drag start (e.g. exit an in-progress rename).
  onDragStart?: () => void;
}

export function useTreeDnd<T extends DndNode>({
  flattened,
  removeDescendants,
  project,
  neighbours,
  onMove,
  onDragStart,
}: UseTreeDndParams<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Hide the dragged node's descendants so it can't be nested inside itself.
  const visibleNodes = useMemo(() => {
    if (!activeId) return flattened;
    return removeDescendants(flattened, [activeId]);
  }, [flattened, activeId, removeDescendants]);

  const projection = useMemo(() => {
    if (!activeId || !overId) return null;
    return project(visibleNodes, activeId, overId, offsetX);
  }, [visibleNodes, activeId, overId, offsetX, project]);

  const activeNode = useMemo(
    () => flattened.find((n) => n.id === activeId) ?? null,
    [flattened, activeId],
  );

  const reset = () => {
    setActiveId(null);
    setOverId(null);
    setOffsetX(0);
  };

  const handlers = {
    onDragStart: (event: DragStartEvent) => {
      setActiveId(String(event.active.id));
      setOverId(String(event.active.id));
      setOffsetX(0);
      onDragStart?.();
    },
    onDragMove: (event: DragMoveEvent) => {
      setOffsetX(event.delta.x);
      if (event.over) setOverId(String(event.over.id));
    },
    onDragEnd: (event: DragEndEvent) => {
      const over = event.over ? String(event.over.id) : null;
      const active = String(event.active.id);
      const proj = over ? project(visibleNodes, active, over, offsetX) : null;

      reset();
      if (!proj || !over) return;
      if (proj.parentId === active) return; // never parent to self

      const node = flattened.find((n) => n.id === active);
      if (!node) return;

      const { prev, next } = neighbours(
        visibleNodes,
        active,
        over,
        proj.parentId,
      );
      const position = getPositionBetween(prev, next);
      onMove({ id: active, parentId: proj.parentId, position, node });
    },
    onDragCancel: reset,
  };

  // Projected depth for the row currently being dragged (drives its insertion
  // line), or null for every other row.
  const projectionDepthFor = (id: string) =>
    id === activeId ? (projection?.depth ?? null) : null;

  return {
    activeId,
    sensors,
    visibleNodes,
    activeNode,
    projectionDepthFor,
    handlers,
  };
}
