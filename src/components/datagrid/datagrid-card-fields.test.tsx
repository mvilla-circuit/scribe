import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  DatagridField,
  DatagridProperties,
  DatagridRelationRef,
} from "@/lib/datagrid-schema";
import { renderWithProviders } from "@/test/render-with-query";

import { DatagridCardFields } from "./datagrid-card-fields";
import type { RelationTargets } from "./datagrid-relations";

function makeTargets(over: Partial<RelationTargets> = {}): RelationTargets {
  return {
    options: [],
    resolveLabel: (ref: DatagridRelationRef) =>
      ref.id === "row-1" ? "Neighbor row" : ref.id,
    navigate: vi.fn(),
    ...over,
  };
}

const textField = (id: string, name: string): DatagridField => ({
  id,
  name,
  type: "text",
  config: {},
});

const selectField: DatagridField = {
  id: "stage",
  name: "Stage",
  type: "select",
  config: { options: [{ id: "o1", name: "Doing", color: "sky" }] },
};

const relationField: DatagridField = {
  id: "related",
  name: "Related",
  type: "relation",
  config: {},
};

const emptyProperties: DatagridProperties = {};

const baseRow = {
  properties: emptyProperties,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("DatagridCardFields", () => {
  it("renders non-empty field values in view order as a vertical stack", () => {
    const fields = [textField("a", "Alpha"), textField("b", "Beta")];
    renderWithProviders(
      <DatagridCardFields
        fields={fields}
        row={{
          ...baseRow,
          properties: { a: "First value", b: "Second value" },
        }}
      />,
    );

    const stack = screen.getByRole("list");
    expect(stack).toHaveClass("flex", "flex-col");
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("First value");
    expect(items[1]).toHaveTextContent("Second value");
  });

  it("renders scalar values as plain truncated text lines", () => {
    renderWithProviders(
      <DatagridCardFields
        fields={[textField("notes", "Notes")]}
        row={{ ...baseRow, properties: { notes: "Hello world" } }}
      />,
    );
    const line = screen.getByText("Hello world");
    expect(line).toHaveClass("truncate", "text-sm", "text-text");
  });

  it("renders relation values as titled chips, not raw ids", () => {
    renderWithProviders(
      <DatagridCardFields
        fields={[relationField]}
        row={{
          ...baseRow,
          properties: {
            related: [{ type: "datagrid_row", id: "row-1" }],
          },
        }}
        relationTargets={makeTargets()}
      />,
    );
    expect(screen.getByText("Neighbor row")).toBeInTheDocument();
    expect(screen.queryByText("row-1")).toBeNull();
  });

  it("omits empty and null values", () => {
    renderWithProviders(
      <DatagridCardFields
        fields={[
          textField("a", "Alpha"),
          textField("b", "Beta"),
          textField("c", "Gamma"),
        ]}
        row={{
          ...baseRow,
          properties: { a: "Kept", b: "", c: null },
        }}
      />,
    );
    expect(screen.getByText("Kept")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).toBeNull();
    expect(screen.queryByText("Gamma")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("soft-caps at five non-empty fields, skipping empties toward the cap", () => {
    const fields = [
      textField("a", "A"),
      textField("empty", "Empty"),
      textField("b", "B"),
      textField("c", "C"),
      textField("d", "D"),
      textField("e", "E"),
      textField("f", "F"),
    ];
    renderWithProviders(
      <DatagridCardFields
        fields={fields}
        row={{
          ...baseRow,
          properties: {
            a: "1",
            empty: "",
            b: "2",
            c: "3",
            d: "4",
            e: "5",
            f: "6",
          },
        }}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.queryByText("6")).toBeNull();
  });

  it("does not render field labels", () => {
    renderWithProviders(
      <DatagridCardFields
        fields={[selectField, textField("notes", "Notes")]}
        row={{
          ...baseRow,
          properties: { stage: "o1", notes: "Body" },
        }}
      />,
    );
    expect(screen.getByText("Doing")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.queryByText("Stage")).toBeNull();
    expect(screen.queryByText("Notes")).toBeNull();
  });

  it("returns null when every field is empty", () => {
    renderWithProviders(
      <DatagridCardFields
        fields={[textField("a", "Alpha")]}
        row={{ ...baseRow, properties: { a: "" } }}
      />,
    );
    expect(screen.queryByRole("list")).toBeNull();
  });
});
