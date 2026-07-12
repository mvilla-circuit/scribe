import { type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

import { StaticTagChip } from "./tag-chip";

/** The minimal tag shape a gallery surface needs to render a read-only chip. */
export interface GalleryTag {
  id: string;
  name: string;
  color: string | null;
}

export interface TagChipsRowProps extends Omit<
  ComponentPropsWithoutRef<"span">,
  "className"
> {
  tags: GalleryTag[];
  /**
   * Maximum number of chips shown before collapsing the rest into a "+N".
   * When omitted, every tag is shown.
   */
  max?: number;
  className?: string;
}

/**
 * A read-only row of tag chips. When `max` is set, remaining tags collapse into
 * a muted `+N`. Renders nothing for an empty list, so callers can spread it in
 * unconditionally. Shared by `CoverCard` and `CollectionListRow`.
 */
export function TagChipsRow({
  tags,
  max,
  className,
  ...props
}: TagChipsRowProps) {
  if (tags.length === 0) return null;

  const visible = max === undefined ? tags : tags.slice(0, max);
  const overflow = tags.length - visible.length;

  return (
    <span
      className={cn("flex flex-wrap items-center gap-1", className)}
      {...props}
    >
      {visible.map((tag) => (
        <StaticTagChip key={tag.id} name={tag.name} color={tag.color} />
      ))}
      {overflow > 0 && <span className="text-xs text-muted">+{overflow}</span>}
    </span>
  );
}
