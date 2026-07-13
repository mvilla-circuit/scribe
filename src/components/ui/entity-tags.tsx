import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_SWATCH, swatchDotStyle } from "@/lib/swatches";
import { matchesNormalizedQuery } from "@/lib/text-match";
import { cn, resolveEditedValue } from "@/lib/utils";

import { RemovableChip } from "./chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Input } from "./input";
import { MorandiSwatchGrid } from "./morandi-swatch-grid";

/** Minimal tag data rendered by an entity tag surface. */
interface EntityTag {
  id: string;
  name: string;
  color: string | null;
}

/** Props for the shared presentational entity tag editor. */
export interface EntityTagsProps {
  tags: EntityTag[];
  onAdd: (name: string, color: string) => void;
  onRemove: (tagId: string) => void;
  onRecolor: (tagId: string, color: string) => void;
  onRename: (tagId: string, name: string) => void;
  /** Accessible label for the root tag group. */
  ariaLabel?: string;
  /** Optional suggestions for typeahead from existing tags. */
  suggestions?: EntityTag[];
  /** Deletes a tag from the suggestions list and its other uses. */
  onDeleteSuggestion?: (tagId: string) => void;
}

const MAX_SUGGESTIONS = 6;

function preventCloseAutoFocus(event: Event): void {
  event.preventDefault();
}

/**
 * A shared entity tag row with editable chips and a trailing add control.
 */
export function EntityTags({
  tags,
  onAdd,
  onRemove,
  onRecolor,
  onRename,
  ariaLabel = "Tags",
  suggestions = [],
  onDeleteSuggestion,
}: EntityTagsProps) {
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
      aria-label={ariaLabel}
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
        suggestions={availableSuggestions}
        onAdd={onAdd}
        onDeleteSuggestion={onDeleteSuggestion}
      />
    </div>
  );
}

interface TagChipMenuProps {
  tag: EntityTag;
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
      removeClassName="size-4 hover:bg-elevated hover:text-text"
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

/**
 * Fade in on masthead hover/focus (no width animation), matching the sibling
 * Add icon / Add cover affordances that share the `group/masthead`.
 */
const ADD_TAG_REVEAL =
  "opacity-0 transition-opacity motion-reduce:transition-none focus-visible:opacity-100 group-hover/masthead:opacity-100 group-focus-within/masthead:opacity-100 data-[state=open]:opacity-100";

interface AddTagControlProps {
  suggestions: EntityTag[];
  onAdd: (name: string, color: string) => void;
  onDeleteSuggestion?: (tagId: string) => void;
}

function AddTagControl({
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
            "inline-flex shrink-0 items-center gap-0.5 rounded-full py-0.5 pl-1.5 pr-2 text-xs font-medium text-muted outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring",
            ADD_TAG_REVEAL,
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
  suggestions?: EntityTag[];
  onCommitName: (name: string) => void;
  onPickColor: (hue: string) => void;
  onPickSuggestion?: (tag: EntityTag) => void;
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
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            const outcome = resolveEditedValue(draft, {
              previous: initialName,
            });
            if (outcome.commit) onCommitName(outcome.value);
            else onCancel();
          } else if (event.key === "Escape") {
            event.preventDefault();
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
