import { describe, expect, it } from "vitest";

import {
  checkRowTargets,
  isRelationRef,
  isRelationTargetType,
  normalizeRelationRefs,
  RELATION_TARGET_TYPES,
  rowTargetsWithinCollection,
  validateRelationRefs,
} from "./datagrid-relation";

describe("isRelationTargetType", () => {
  it("accepts the four allowed target types", () => {
    for (const type of RELATION_TARGET_TYPES) {
      expect(isRelationTargetType(type)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isRelationTargetType("widget")).toBe(false);
    expect(isRelationTargetType("")).toBe(false);
    expect(isRelationTargetType(null)).toBe(false);
    expect(isRelationTargetType(42)).toBe(false);
  });
});

describe("isRelationRef", () => {
  it("accepts a well-formed ref", () => {
    expect(isRelationRef({ type: "book", id: "b1" })).toBe(true);
  });

  it("rejects refs with a bad type, missing id, or wrong shape", () => {
    expect(isRelationRef({ type: "widget", id: "x" })).toBe(false);
    expect(isRelationRef({ type: "book", id: "" })).toBe(false);
    expect(isRelationRef({ type: "book" })).toBe(false);
    expect(isRelationRef({ id: "b1" })).toBe(false);
    expect(isRelationRef(null)).toBe(false);
    expect(isRelationRef("book:b1")).toBe(false);
  });
});

describe("normalizeRelationRefs", () => {
  it("returns an empty array for non-array input", () => {
    expect(normalizeRelationRefs(null)).toEqual([]);
    expect(normalizeRelationRefs("book:b1")).toEqual([]);
    expect(normalizeRelationRefs({ type: "book", id: "b1" })).toEqual([]);
  });

  it("keeps valid refs and drops invalid ones", () => {
    expect(
      normalizeRelationRefs([
        { type: "book", id: "b1" },
        { type: "widget", id: "x" },
        { type: "entry", id: "" },
        { id: "no-type" },
        { type: "document", id: "d9" },
      ]),
    ).toEqual([
      { type: "book", id: "b1" },
      { type: "document", id: "d9" },
    ]);
  });

  it("trims ids and dedupes by type + id", () => {
    expect(
      normalizeRelationRefs([
        { type: "book", id: " b1 " },
        { type: "book", id: "b1" },
        { type: "datagrid_row", id: "b1" },
      ]),
    ).toEqual([
      { type: "book", id: "b1" },
      { type: "datagrid_row", id: "b1" },
    ]);
  });
});

describe("validateRelationRefs", () => {
  it("returns normalized refs with no errors for valid input", () => {
    const result = validateRelationRefs([
      { type: "book", id: "b1" },
      { type: "entry", id: "e2" },
    ]);
    expect(result.errors).toEqual([]);
    expect(result.refs).toEqual([
      { type: "book", id: "b1" },
      { type: "entry", id: "e2" },
    ]);
  });

  it("reports an indexed error for each invalid entry", () => {
    const result = validateRelationRefs([
      { type: "book", id: "b1" },
      { type: "widget", id: "x" },
    ]);
    expect(result.refs).toEqual([{ type: "book", id: "b1" }]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ index: 1 });
  });

  it("errors when the value is not an array", () => {
    const result = validateRelationRefs("nope");
    expect(result.refs).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });
});

describe("checkRowTargets", () => {
  it("splits datagrid_row refs into in- and out-of-collection", () => {
    const refs = [
      { type: "datagrid_row" as const, id: "r1" },
      { type: "datagrid_row" as const, id: "rX" },
      { type: "book" as const, id: "b1" },
    ];
    const result = checkRowTargets(refs, ["r1", "r2"]);
    expect(result.valid).toEqual([
      { type: "datagrid_row", id: "r1" },
      { type: "book", id: "b1" },
    ]);
    expect(result.invalid).toEqual([{ type: "datagrid_row", id: "rX" }]);
  });

  it("treats non-row targets as always valid", () => {
    const refs = [
      { type: "book" as const, id: "b1" },
      { type: "document" as const, id: "d1" },
    ];
    const result = checkRowTargets(refs, []);
    expect(result.invalid).toEqual([]);
    expect(result.valid).toEqual(refs);
  });
});

describe("rowTargetsWithinCollection", () => {
  it("is true only when every row target is allowed", () => {
    const refs = [
      { type: "datagrid_row" as const, id: "r1" },
      { type: "book" as const, id: "b1" },
    ];
    expect(rowTargetsWithinCollection(refs, ["r1"])).toBe(true);
    expect(rowTargetsWithinCollection(refs, ["r2"])).toBe(false);
  });
});
