import type { TreeChild } from "@/data/tree";

/** A tree child that can appear in a collection gallery (folders are excluded). */
export type GalleryChild = Exclude<TreeChild, { kind: "folder" }>;

/** Returns the display title for a gallery child. */
function itemTitle(child: TreeChild): string {
  switch (child.kind) {
    case "collection":
      return child.collection.name;
    case "book":
      return child.book.title;
    case "entry":
      return child.entry.title;
    case "datagrid":
      return child.datagrid.name;
    case "whiteboard":
      return child.whiteboard.name;
    case "folder":
      return child.folder.name;
  }
}

/** Narrows a tree child to kinds that can appear in a collection gallery. */
export function isGalleryChild(child: TreeChild): child is GalleryChild {
  return child.kind !== "folder";
}

/**
 * Cover shape for a gallery child: tall book covers for books and docs, wider
 * album covers for collections, datagrids, and whiteboards.
 */
export function galleryCoverAspect(child: GalleryChild): "book" | "album" {
  return child.kind === "book" || child.kind === "entry" ? "book" : "album";
}

/** Display metadata for a gallery list/grid row. */
export function galleryChildMeta(child: GalleryChild): {
  title: string;
  /** Book/datagrid subtitle, or collection description when set. */
  subtitle: string | null;
  kindLabel: string;
  icon: string | null;
  coverUrl: string | null;
} {
  switch (child.kind) {
    case "collection":
      return {
        title: child.collection.name,
        subtitle: child.collection.description,
        kindLabel: "Collection",
        icon: child.collection.icon,
        coverUrl: child.collection.cover_url,
      };
    case "book":
      return {
        title: child.book.title,
        subtitle: child.book.subtitle,
        kindLabel: "Book",
        icon: child.book.icon,
        coverUrl: child.book.cover_url,
      };
    case "entry":
      return {
        title: child.entry.title,
        subtitle: null,
        kindLabel: "Doc",
        icon: child.entry.icon,
        coverUrl: child.entry.cover_url,
      };
    case "datagrid":
      return {
        title: child.datagrid.name,
        subtitle: child.datagrid.subtitle,
        kindLabel: "Datagrid",
        icon: child.datagrid.icon,
        coverUrl: child.datagrid.cover_url,
      };
    case "whiteboard":
      return {
        title: child.whiteboard.name,
        subtitle: null,
        kindLabel: "Whiteboard",
        icon: child.whiteboard.icon,
        coverUrl: child.whiteboard.cover_url,
      };
  }
}

/** Filters collection-gallery children by case-insensitive title search. */
export function filterGalleryChildren(
  children: TreeChild[],
  query: string,
): TreeChild[] {
  const normalized = query.toLocaleLowerCase();

  return children.filter(
    (child) =>
      isGalleryChild(child) &&
      (normalized === "" ||
        itemTitle(child).toLocaleLowerCase().includes(normalized)),
  );
}

/** Sorts collection-gallery children A–Z by title without mutating the source. */
export function sortGalleryChildren(children: TreeChild[]): TreeChild[] {
  return children
    .map((child, index) => ({ child, index }))
    .sort((left, right) => {
      const comparison = itemTitle(left.child).localeCompare(
        itemTitle(right.child),
        undefined,
        { sensitivity: "base" },
      );
      return comparison === 0 ? left.index - right.index : comparison;
    })
    .map(({ child }) => child);
}
