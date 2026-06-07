// Generic descendant walk shared by the document and folder hierarchies. Given a
// flat list of items and a way to read each item's parent id, it collects a
// node plus every descendant beneath it -- the set the DB cascade-deletes, which
// the UI mirrors optimistically.
export function collectSubtree<T extends { id: string }>(
  items: T[],
  rootId: string,
  getParentId: (item: T) => string | null
): Set<string> {
  const childrenByParent = new Map<string, T[]>();
  for (const item of items) {
    const parentId = getParentId(item);
    if (parentId === null) continue;
    const list = childrenByParent.get(parentId) ?? [];
    list.push(item);
    childrenByParent.set(parentId, list);
  }

  const ids = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop() as string;
    ids.add(id);
    for (const child of childrenByParent.get(id) ?? []) stack.push(child.id);
  }
  return ids;
}
