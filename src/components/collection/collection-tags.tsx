import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MORANDI_SWATCHES, swatchDotStyle } from "@/lib/swatches";
import { cn } from "@/lib/utils";

import { TagChip } from "./tag-chip";

/** A tag assigned to (or assignable to) a collection. */
export interface CollectionTag {
  id: string;
  name: string;
  color: string | null;
}

export interface CollectionTagsProps {
  tags: CollectionTag[];
  onAdd: (name: string) => void;
  onRemove: (tagId: string) => void;
  onRecolor: (tagId: string, color: string) => void;
  /** Optional suggestions for typeahead from existing library tags. */
  suggestions?: CollectionTag[];
}

/**
 * The masthead's tag row: a chip per assigned tag (click opens a recolor +
 * remove popover) and a trailing "Add tag" control. Purely props-driven —
 * callers own persistence, so this can be tested and reused before the data
 * hooks that back it land.
 */
export function CollectionTags({
  tags,
  onAdd,
  onRemove,
  onRecolor,
  suggestions = [],
}: CollectionTagsProps) {
  const assignedNames = useMemo(
    () => new Set(tags.map((tag) => tag.name.toLowerCase())),
    [tags],
  );
  const availableSuggestions = useMemo(
    () =>
      suggestions.filter((tag) => !assignedNames.has(tag.name.toLowerCase())),
    [suggestions, assignedNames],
  );

  return (
    <div
      aria-label="Collection tags"
      className="mt-2 flex flex-wrap items-center gap-1.5"
    >
      {tags.map((tag) => (
        <TagChipMenu
          key={tag.id}
          tag={tag}
          onRecolor={(color) => {
            onRecolor(tag.id, color);
          }}
          onRemove={() => {
            onRemove(tag.id);
          }}
        />
      ))}
      <AddTagControl
        isEmpty={tags.length === 0}
        suggestions={availableSuggestions}
        onAdd={onAdd}
      />
    </div>
  );
}

function TagChipMenu({
  tag,
  onRecolor,
  onRemove,
}: {
  tag: CollectionTag;
  onRecolor: (color: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <TagChip name={tag.name} color={tag.color} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div
          role="group"
          aria-label={`Color for ${tag.name}`}
          className="grid grid-cols-5 gap-1 p-2"
        >
          {MORANDI_SWATCHES.map((hue) => (
            <button
              key={hue}
              type="button"
              aria-label={`${hue} for ${tag.name}`}
              aria-pressed={tag.color === hue}
              onClick={() => {
                onRecolor(hue);
                setOpen(false);
              }}
              style={swatchDotStyle(hue)}
              className={cn(
                "size-5 rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring",
                tag.color === hue && "ring-2 ring-ring",
              )}
            />
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          danger
          onSelect={() => {
            onRemove();
          }}
        >
          <X className="size-4" aria-hidden="true" />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const MAX_SUGGESTIONS = 6;

function AddTagControl({
  isEmpty,
  suggestions,
  onAdd,
}: {
  isEmpty: boolean;
  suggestions: CollectionTag[];
  onAdd: (name: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const filtered = useMemo(() => {
    const query = draft.trim().toLowerCase();
    const matches =
      query === ""
        ? suggestions
        : suggestions.filter((tag) => tag.name.toLowerCase().includes(query));
    return matches.slice(0, MAX_SUGGESTIONS);
  }, [suggestions, draft]);

  const commit = (name: string) => {
    const trimmed = name.trim();
    setDraft("");
    setIsEditing(false);
    if (trimmed) onAdd(trimmed);
  };

  const cancel = () => {
    setDraft("");
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        aria-label="Add tag"
        onClick={() => {
          setIsEditing(true);
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-muted outline-none transition-opacity hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring",
          isEmpty &&
            "opacity-0 focus-visible:opacity-100 group-hover/masthead:opacity-100",
        )}
      >
        <Plus className="size-3" aria-hidden="true" />
        Add tag
      </button>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        aria-label="New tag name"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        onBlur={cancel}
        placeholder="Tag name"
        className="h-6 w-28 rounded-full border border-border bg-bg px-2 text-xs text-text outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
      />
      {filtered.length > 0 && (
        <div
          role="listbox"
          aria-label="Tag suggestions"
          className="absolute left-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-md border border-border bg-elevated py-1 shadow-popover"
        >
          {filtered.map((tag) => (
            <button
              key={tag.id}
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                // Keep the input focused so this click registers as a
                // selection instead of a blur that would cancel the add.
                e.preventDefault();
              }}
              onClick={() => {
                commit(tag.name);
              }}
              className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs text-text outline-none hover:bg-hover"
            >
              <span
                style={swatchDotStyle(tag.color)}
                className="size-2 shrink-0 rounded-full"
                aria-hidden="true"
              />
              <span className="truncate">{tag.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
