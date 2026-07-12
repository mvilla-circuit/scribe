import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MorandiSwatchGrid } from "@/components/ui/morandi-swatch-grid";
import { DEFAULT_SWATCH, swatchDotStyle } from "@/lib/swatches";
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
  onAdd: (name: string, color: string) => void;
  onRemove: (tagId: string) => void;
  onRecolor: (tagId: string, color: string) => void;
  onRename: (tagId: string, name: string) => void;
  /** Optional suggestions for typeahead from existing library tags. */
  suggestions?: CollectionTag[];
  /** Deletes a library tag from the suggestions list (and everywhere it was used). */
  onDeleteSuggestion?: (tagId: string) => void;
}

/**
 * The masthead's tag row: a chip per assigned tag (click opens the shared
 * name + color editor; hover reveals a quick-remove X) and a trailing
 * "Add tag" control that opens the same editor shape for creates.
 */
export function CollectionTags({
  tags,
  onAdd,
  onRemove,
  onRecolor,
  onRename,
  suggestions = [],
  onDeleteSuggestion,
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
          onRename={(name) => {
            onRename(tag.id, name);
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
        onDeleteSuggestion={onDeleteSuggestion}
      />
    </div>
  );
}

const MAX_SUGGESTIONS = 6;

function TagChipMenu({
  tag,
  onRecolor,
  onRename,
  onRemove,
}: {
  tag: CollectionTag;
  onRecolor: (color: string) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="group/tag relative inline-flex max-w-full items-center">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <TagChip
            name={tag.name}
            color={tag.color}
            className="group-hover/tag:pr-5"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56 p-0"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <TagEditorPanel
            nameLabel="Tag name"
            initialName={tag.name}
            color={tag.color ?? DEFAULT_SWATCH}
            colorGroupLabel={`Color for ${tag.name}`}
            colorButtonLabel={(hue) => `${hue} for ${tag.name}`}
            onCommitName={(name) => {
              if (name !== tag.name) onRename(name);
              setOpen(false);
            }}
            onPickColor={(hue) => {
              onRecolor(hue);
              setOpen(false);
            }}
            onCancel={() => {
              setOpen(false);
            }}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        type="button"
        aria-label={`Remove ${tag.name}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        className="absolute right-0.5 top-1/2 z-10 flex size-4 -translate-y-1/2 items-center justify-center rounded-full text-muted opacity-0 outline-none transition-opacity hover:bg-elevated hover:text-text focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring pointer-events-none group-hover/tag:pointer-events-auto group-hover/tag:opacity-100 motion-reduce:transition-none"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </div>
  );
}

function AddTagControl({
  isEmpty,
  suggestions,
  onAdd,
  onDeleteSuggestion,
}: {
  isEmpty: boolean;
  suggestions: CollectionTag[];
  onAdd: (name: string, color: string) => void;
  onDeleteSuggestion?: (tagId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftColor, setDraftColor] = useState<string>(DEFAULT_SWATCH);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDraftColor(DEFAULT_SWATCH);
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Add tag"
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full py-0.5 pl-1.5 pr-2 text-xs font-medium text-muted outline-none transition-opacity hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:opacity-100",
            isEmpty &&
              "opacity-0 focus-visible:opacity-100 group-hover/masthead:opacity-100",
          )}
        >
          <Plus className="size-3 shrink-0" aria-hidden="true" />
          Add tag
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 p-0"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <TagEditorPanel
          nameLabel="New tag name"
          initialName=""
          color={draftColor}
          colorGroupLabel="Tag color"
          colorButtonLabel={(hue) => hue}
          suggestions={suggestions}
          onCommitName={(name) => {
            onAdd(name, draftColor);
            setDraftColor(DEFAULT_SWATCH);
            setOpen(false);
          }}
          onPickColor={(hue) => {
            setDraftColor(hue);
          }}
          onPickSuggestion={(tag) => {
            onAdd(tag.name, tag.color ?? DEFAULT_SWATCH);
            setDraftColor(DEFAULT_SWATCH);
            setOpen(false);
          }}
          onDeleteSuggestion={onDeleteSuggestion}
          onCancel={() => {
            setOpen(false);
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TagEditorPanel({
  nameLabel,
  initialName,
  color,
  colorGroupLabel,
  colorButtonLabel,
  suggestions = [],
  onCommitName,
  onPickColor,
  onPickSuggestion,
  onDeleteSuggestion,
  onCancel,
}: {
  nameLabel: string;
  initialName: string;
  color: string;
  colorGroupLabel: string;
  colorButtonLabel: (hue: string) => string;
  suggestions?: CollectionTag[];
  onCommitName: (name: string) => void;
  onPickColor: (hue: string) => void;
  onPickSuggestion?: (tag: CollectionTag) => void;
  onDeleteSuggestion?: (tagId: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const filtered = useMemo(() => {
    if (!onPickSuggestion) return [];
    const query = draft.trim().toLowerCase();
    const matches =
      query === ""
        ? suggestions
        : suggestions.filter((tag) => tag.name.toLowerCase().includes(query));
    return matches.slice(0, MAX_SUGGESTIONS);
  }, [suggestions, draft, onPickSuggestion]);

  return (
    <div className="p-2">
      <input
        ref={inputRef}
        aria-label={nameLabel}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const trimmed = draft.trim();
            if (trimmed) onCommitName(trimmed);
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder="Tag name"
        className="mb-4 h-7 w-full rounded-md border border-border bg-bg px-2 text-xs text-text outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div role="group" aria-label={colorGroupLabel}>
        <MorandiSwatchGrid
          value={color}
          onChange={onPickColor}
          ariaLabelForHue={colorButtonLabel}
        />
      </div>
      {filtered.length > 0 && onPickSuggestion && (
        <>
          <DropdownMenuSeparator className="my-2" />
          <div aria-label="Tag suggestions" className="py-0.5">
            {filtered.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-0.5 rounded-md hover:bg-hover"
              >
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    onPickSuggestion(tag);
                  }}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <span
                    style={swatchDotStyle(tag.color)}
                    className="size-2 shrink-0 rounded-full"
                    aria-hidden="true"
                  />
                  <span className="truncate">{tag.name}</span>
                </DropdownMenuItem>
                {onDeleteSuggestion && (
                  <button
                    type="button"
                    aria-label={`Delete ${tag.name}`}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onDeleteSuggestion(tag.id);
                    }}
                    className="mr-1 flex size-5 shrink-0 items-center justify-center rounded-md text-muted outline-none hover:bg-elevated hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
