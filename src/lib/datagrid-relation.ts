/**
 * Pure helpers for normalizing and validating datagrid relation references.
 * A relation cell holds a list of {@link DatagridRelationRef}s pointing at one
 * of four entity kinds; these helpers sanitize untrusted values and check that
 * same-collection row targets resolve to known row ids.
 */

import type {
  DatagridRelationRef,
  DatagridRelationTargetType,
} from "./datagrid-schema";

/** The relation target kinds a relation cell may point at. */
export const RELATION_TARGET_TYPES: readonly DatagridRelationTargetType[] = [
  "datagrid_row",
  "book",
  "entry",
  "document",
];

const TARGET_TYPE_SET = new Set<string>(RELATION_TARGET_TYPES);

/** An invalid relation entry found by {@link validateRelationRefs}. */
interface RelationRefError {
  index: number;
  message: string;
}

/** Result of {@link validateRelationRefs}: cleaned refs plus any errors. */
export interface RelationValidationResult {
  refs: DatagridRelationRef[];
  errors: RelationRefError[];
}

/** Split of refs by whether their row target is inside a collection. */
export interface RowTargetCheck {
  valid: DatagridRelationRef[];
  invalid: DatagridRelationRef[];
}

/** Type guard for the allowed relation target types. */
export function isRelationTargetType(
  value: unknown,
): value is DatagridRelationTargetType {
  return typeof value === "string" && TARGET_TYPE_SET.has(value);
}

/** Type guard for a well-formed relation ref (valid type + non-empty id). */
export function isRelationRef(value: unknown): value is DatagridRelationRef {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const ref = value as Record<string, unknown>;
  return (
    isRelationTargetType(ref.type) &&
    typeof ref.id === "string" &&
    ref.id.trim().length > 0
  );
}

/**
 * Coerces an untrusted value into a clean list of relation refs: non-arrays
 * yield `[]`, invalid entries are dropped, ids are trimmed, and duplicates
 * (same type + id) are removed while preserving first-seen order.
 */
export function normalizeRelationRefs(value: unknown): DatagridRelationRef[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const refs: DatagridRelationRef[] = [];
  for (const entry of value) {
    if (!isRelationRef(entry)) continue;
    const id = entry.id.trim();
    const key = `${entry.type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ type: entry.type, id });
  }
  return refs;
}

/**
 * Validates an untrusted value, returning the normalized refs plus an indexed
 * error for the whole value (when not an array) or for each invalid entry.
 */
export function validateRelationRefs(value: unknown): RelationValidationResult {
  if (!Array.isArray(value)) {
    return {
      refs: [],
      errors: [{ index: -1, message: "Relation value must be an array" }],
    };
  }
  const errors: RelationRefError[] = [];
  value.forEach((entry, index) => {
    if (!isRelationRef(entry)) {
      errors.push({ index, message: "Invalid relation reference" });
    }
  });
  return { refs: normalizeRelationRefs(value), errors };
}

/**
 * Splits refs by whether their target belongs to the collection. Only
 * `datagrid_row` refs are constrained (their id must be in `allowedRowIds`);
 * refs pointing at other entity kinds are always considered valid.
 */
export function checkRowTargets(
  refs: DatagridRelationRef[],
  allowedRowIds: Iterable<string>,
): RowTargetCheck {
  const allowed = new Set(allowedRowIds);
  const valid: DatagridRelationRef[] = [];
  const invalid: DatagridRelationRef[] = [];
  for (const ref of refs) {
    if (ref.type === "datagrid_row" && !allowed.has(ref.id)) {
      invalid.push(ref);
    } else {
      valid.push(ref);
    }
  }
  return { valid, invalid };
}

/** True when every `datagrid_row` ref points at an allowed row id. */
export function rowTargetsWithinCollection(
  refs: DatagridRelationRef[],
  allowedRowIds: Iterable<string>,
): boolean {
  return checkRowTargets(refs, allowedRowIds).invalid.length === 0;
}
