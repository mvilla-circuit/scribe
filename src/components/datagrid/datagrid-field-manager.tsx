import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  CheckSquare2,
  CircleDot,
  Clock,
  GitBranch,
  GripVertical,
  Hash,
  Link2,
  List,
  ListChecks,
  Plus,
  Trash2,
  Type,
} from "lucide-react";
import { type ReactNode, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { RemovableChip } from "@/components/ui/chip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InlineRename } from "@/components/ui/inline-rename";
import { Input } from "@/components/ui/input";
import { MorandiSwatchGrid } from "@/components/ui/morandi-swatch-grid";
import {
  addField,
  deleteField,
  newFieldFromType,
  reorderField,
  updateField,
} from "@/data/datagrid-fields";
import {
  DATAGRID_FIELD_TYPE_DEFS,
  fieldTypeDef,
} from "@/lib/datagrid-field-types";
import type {
  DatagridField,
  DatagridFieldType,
  DatagridSelectOption,
} from "@/lib/datagrid-schema";
import { cn, resolveEditedValue } from "@/lib/utils";

import { swatchDotStyle, swatchForIndex } from "./datagrid-colors";

const FIELD_TYPE_ICONS: Record<DatagridFieldType, typeof Type> = {
  text: Type,
  number: Hash,
  date: Calendar,
  select: List,
  multi_select: ListChecks,
  status: CircleDot,
  checkbox: CheckSquare2,
  url: Link2,
  relation: GitBranch,
  created_time: Clock,
  updated_time: Clock,
};

const FIELD_TYPE_OPTIONS = DATAGRID_FIELD_TYPE_DEFS.map((definition) => ({
  value: definition.type,
  label: definition.label,
  Icon: FIELD_TYPE_ICONS[definition.type],
}));

const OPTION_TYPES = new Set<DatagridFieldType>([
  "select",
  "multi_select",
  "status",
]);

interface FieldManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: DatagridField[];
  onChange: (fields: DatagridField[]) => void;
}

/**
 * Dialog to edit a datagrid's property schema: type-first create, rename,
 * retype, drag/keyboard reorder, and delete, plus option editing for
 * select/status fields. Edits route through `datagrid-fields` helpers and
 * `onChange` for the parent to persist onto `datagrids.fields`.
 */
export function FieldManager({
  open,
  onOpenChange,
  fields,
  onChange,
}: FieldManagerProps) {
  const pendingFocusId = useRef<string | null>(null);
  const nameInputs = useRef(new Map<string, HTMLInputElement>());
  // Local draft is the source of truth while the dialog is open so rapid edits
  // (add option → rename → reorder) don't base the next write on a stale
  // `fields` prop before the parent's optimistic cache re-renders.
  const [draftFields, setDraftFields] = useState(fields);
  const [seededOpen, setSeededOpen] = useState(open);
  if (open !== seededOpen) {
    setSeededOpen(open);
    if (open) setDraftFields(fields);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const apply = (next: DatagridField[]) => {
    setDraftFields(next);
    onChange(next);
  };

  const handleAddField = (type: DatagridFieldType) => {
    const id = crypto.randomUUID();
    apply(addField(draftFields, newFieldFromType(type, id)));
    pendingFocusId.current = id;
  };

  const handleRename = (id: string, name: string) => {
    apply(updateField(draftFields, id, { name }));
  };

  const handleRetype = (id: string, type: DatagridFieldType) => {
    const defaultConfig = fieldTypeDef(type).defaultConfig;
    const field = draftFields.find((f) => f.id === id);
    const config =
      defaultConfig.options === undefined
        ? { ...defaultConfig }
        : { ...defaultConfig, options: field?.config.options ?? [] };
    apply(updateField(draftFields, id, { type, config }));
  };

  const handleDelete = (id: string) => {
    apply(deleteField(draftFields, id));
  };

  const handleMove = (id: string, delta: number) => {
    const index = draftFields.findIndex((f) => f.id === id);
    if (index === -1) return;
    apply(reorderField(draftFields, id, index + delta));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const overIndex = draftFields.findIndex((f) => f.id === over.id);
    if (overIndex === -1) return;
    apply(reorderField(draftFields, String(active.id), overIndex));
  };

  const handleOptionsChange = (id: string, options: DatagridSelectOption[]) => {
    const field = draftFields.find((f) => f.id === id);
    if (!field) return;
    apply(
      updateField(draftFields, id, { config: { ...field.config, options } }),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(34rem,calc(100vw-2rem))]">
        <DialogTitle>Fields</DialogTitle>
        <DialogDescription>
          Add and organize the properties stored on each row.
        </DialogDescription>

        <div className="mt-4 flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
          {draftFields.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No fields yet. Add one to start building your schema.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={draftFields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {draftFields.map((field, index) => (
                  <SortableFieldRow
                    key={field.id}
                    field={field}
                    isFirst={index === 0}
                    isLast={index === draftFields.length - 1}
                    onRename={handleRename}
                    onRetype={handleRetype}
                    onDelete={handleDelete}
                    onMove={handleMove}
                    onOptionsChange={handleOptionsChange}
                    nameInputRef={(input) => {
                      if (input) nameInputs.current.set(field.id, input);
                      else nameInputs.current.delete(field.id);
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="mt-4 flex justify-between">
          <FieldTypeMenu
            onSelect={handleAddField}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const id = pendingFocusId.current;
              if (!id) return;
              const input = nameInputs.current.get(id);
              input?.focus();
              input?.select();
              pendingFocusId.current = null;
            }}
            trigger={
              <Button variant="secondary">
                <Plus className="size-4" aria-hidden="true" />
                Add field
              </Button>
            }
          />
          <Button
            variant="primary"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SortableFieldRow({
  field,
  isFirst,
  isLast,
  onRename,
  onRetype,
  onDelete,
  onMove,
  onOptionsChange,
  nameInputRef,
}: {
  field: DatagridField;
  isFirst: boolean;
  isLast: boolean;
  onRename: (id: string, name: string) => void;
  onRetype: (id: string, type: DatagridFieldType) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, delta: number) => void;
  onOptionsChange: (id: string, options: DatagridSelectOption[]) => void;
  nameInputRef: (input: HTMLInputElement | null) => void;
}) {
  const [draftName, setDraftName] = useState(field.name);
  const [syncedName, setSyncedName] = useState(field.name);
  if (field.name !== syncedName) {
    setSyncedName(field.name);
    setDraftName(field.name);
  }
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const typeOption = FIELD_TYPE_OPTIONS.find(
    (option) => option.value === field.type,
  );

  const commitRename = () => {
    const outcome = resolveEditedValue(draftName, { previous: field.name });
    if (outcome.commit) {
      setDraftName(outcome.value);
      onRename(field.id, outcome.value);
    } else {
      setDraftName(field.name);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(
        "group/field rounded-md px-1 py-1 hover:bg-hover",
        isDragging && "bg-hover opacity-80",
      )}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`Reorder ${field.name}`}
          {...attributes}
          {...listeners}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              e.stopPropagation();
              if (!isLast) onMove(field.id, 1);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              e.stopPropagation();
              if (!isFirst) onMove(field.id, -1);
            }
          }}
          className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>

        <Input
          ref={nameInputRef}
          aria-label={`Field name for ${field.name}`}
          value={draftName}
          onChange={(e) => {
            setDraftName(e.target.value);
          }}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setDraftName(field.name);
            }
          }}
          className="h-auto flex-1 border-transparent bg-transparent px-2 py-1 hover:border-border focus-visible:border-border"
        />

        <FieldTypeMenu
          onSelect={(type) => {
            onRetype(field.id, type);
          }}
          trigger={
            <button
              type="button"
              aria-label={`Field type for ${field.name}: ${typeOption?.label ?? field.type}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-tree-group px-2 py-1 text-xs font-medium text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
            >
              {typeOption && (
                <typeOption.Icon className="size-3.5" aria-hidden="true" />
              )}
              {typeOption?.label ?? field.type}
            </button>
          }
        />

        <button
          type="button"
          aria-label={`Delete ${field.name}`}
          onClick={() => {
            onDelete(field.id);
          }}
          className="flex size-7 items-center justify-center rounded-md text-muted opacity-0 outline-none transition-opacity hover:text-danger focus:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/field:opacity-100 group-focus-within/field:opacity-100"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      {OPTION_TYPES.has(field.type) && (
        <OptionEditor
          field={field}
          onChange={(options) => {
            onOptionsChange(field.id, options);
          }}
        />
      )}
    </div>
  );
}

function OptionEditor({
  field,
  onChange,
}: {
  field: DatagridField;
  onChange: (options: DatagridSelectOption[]) => void;
}) {
  const options = field.config.options ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [colorOptionId, setColorOptionId] = useState<string | null>(null);

  const addOption = () => {
    const id = crypto.randomUUID();
    setEditingId(id);
    onChange([
      ...options,
      {
        id,
        name: "New option",
        color: swatchForIndex(options.length),
      },
    ]);
  };

  const renameOption = (id: string, name: string) => {
    onChange(options.map((o) => (o.id === id ? { ...o, name } : o)));
  };

  const recolorOption = (id: string, color: string) => {
    onChange(options.map((o) => (o.id === id ? { ...o, color } : o)));
  };

  const removeOption = (id: string) => {
    onChange(options.filter((o) => o.id !== id));
  };

  return (
    <div className="mt-1 ml-8 flex flex-col items-start gap-1.5 rounded-md bg-tree-group px-2 py-2">
      {options.map((option) => (
        <RemovableChip
          key={option.id}
          name={option.name}
          color={option.color}
          onRemove={() => {
            removeOption(option.id);
          }}
          removeLabel={`Delete option ${option.name}`}
          removeReveal="hover"
          removeClassName="size-5 hover:bg-hover hover:text-danger"
          className="min-h-7 max-w-full px-1.5 py-0.5"
        >
          <div className="flex min-w-0 items-center gap-1">
            <DropdownMenu
              open={colorOptionId === option.id}
              onOpenChange={(open) => {
                setColorOptionId(open ? option.id : null);
              }}
            >
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Color for ${option.name}`}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    style={swatchDotStyle(option.color)}
                    className="size-2.5 rounded-full"
                    aria-hidden="true"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="p-2">
                <MorandiSwatchGrid
                  value={option.color}
                  onChange={(hue) => {
                    recolorOption(option.id, hue);
                    setColorOptionId(null);
                  }}
                  ariaLabelForHue={(hue) => `${hue} for ${option.name}`}
                />
              </DropdownMenuContent>
            </DropdownMenu>

            {editingId === option.id ? (
              <InlineRename
                initialValue={option.name}
                ariaLabel={`Rename ${option.name}`}
                onCommit={(name) => {
                  renameOption(option.id, name);
                  setEditingId(null);
                }}
                onCancel={() => {
                  setEditingId(null);
                }}
                className="min-w-[12rem] flex-1 py-0.5"
              />
            ) : (
              <button
                type="button"
                aria-label={`Rename ${option.name}`}
                onClick={() => {
                  setEditingId(option.id);
                }}
                className="min-w-0 truncate rounded px-1 py-0.5 text-left outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
              >
                {option.name}
              </button>
            )}
          </div>
        </RemovableChip>
      ))}
      <button
        type="button"
        onClick={addOption}
        className="mt-0.5 inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Add option
      </button>
    </div>
  );
}

function FieldTypeMenu({
  trigger,
  onSelect,
  onCloseAutoFocus,
}: {
  trigger: ReactNode;
  onSelect: (type: DatagridFieldType) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent onCloseAutoFocus={onCloseAutoFocus}>
        {FIELD_TYPE_OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => {
              onSelect(value);
            }}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
