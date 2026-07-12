import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { RemovableChip } from "@/components/ui/chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { MorandiSwatchGrid } from "@/components/ui/morandi-swatch-grid";
import { DEFAULT_SWATCH, swatchDotStyle } from "@/lib/swatches";
import { matchesNormalizedQuery } from "@/lib/text-match";
import { cn, resolveEditedValue } from "@/lib/utils";

import { type TagChipData } from "./tag-chip";

/** A tag assigned to (or assignable to) a collection. */
type CollectionTag = TagChipData;

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

const MAX_SUGGESTIONS = 6;

function preventCloseAutoFocus(event: Event): void {
  event.preventDefault();
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

interface TagChipMenuProps {
  tag: CollectionTag;
  onRecolor: (color: string) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}

function TagChipMenu({ tag, onRecolor, onRename, onRemove }: TagChipMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <RemovableChip
      name={tag.name}
      color={tag.color}
      onRemove={onRemove}
      removeReveal="hover"
      removeClassName="size-4 hover:bg-elevated hover:opacity-100 hover:text-text"
      className="max-w-full"
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="min-w-0 truncate rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {tag.name}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56 p-0"
          onCloseAutoFocus={preventCloseAutoFocus}
        >
          <TagEditorPanel
            nameLabel="Tag name"
            initialName={tag.name}
            color={tag.color ?? DEFAULT_SWATCH}
            colorGroupLabel={`Color for ${tag.name}`}
            colorButtonLabel={(hue) => `${hue} for ${tag.name}`}
            onCommitName={(name) => {
              onRename(name);
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
    </RemovableChip>
  );
}

interface AddTagControlProps {
  isEmpty: boolean;
  suggestions: CollectionTag[];
  onAdd: (name: string, color: string) => void;
  onDeleteSuggestion?: (tagId: string) => void;
}

function AddTagControl({
  isEmpty,
  suggestions,
  onAdd,
  onDeleteSuggestion,
}: AddTagControlProps) {
  const [open, setOpen] = useState(false);
  const [draftColor, setDraftColor] = useState<string>(DEFAULT_SWATCH);

  function closeAndReset(): void {
    setDraftColor(DEFAULT_SWATCH);
    setOpen(false);
  }

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
        onCloseAutoFocus={preventCloseAutoFocus}
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
            closeAndReset();
          }}
          onPickColor={(hue) => {
            setDraftColor(hue);
          }}
          onPickSuggestion={(tag) => {
            onAdd(tag.name, tag.color ?? DEFAULT_SWATCH);
            closeAndReset();
          }}
          onDeleteSuggestion={onDeleteSuggestion}
          onCancel={closeAndReset}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TagEditorPanelProps {
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
}: TagEditorPanelProps) {
  const [draft, setDraft] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const filtered = useMemo(() => {
    if (!onPickSuggestion) return [];
    return suggestions
      .filter((tag) => matchesNormalizedQuery(tag.name, draft))
      .slice(0, MAX_SUGGESTIONS);
  }, [suggestions, draft, onPickSuggestion]);

  return (
    <div className="p-2">
      <Input
        ref={inputRef}
        aria-label={nameLabel}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            // A blank or unchanged name settles the same way an inline rename
            // does: close without a redundant (or empty) commit.
            const outcome = resolveEditedValue(draft, {
              previous: initialName,
            });
            if (outcome.commit) onCommitName(outcome.value);
            else onCancel();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder="Tag name"
        className="mb-4 h-7 bg-bg px-2 text-xs"
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
