import { fireEvent, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  DatagridField,
  DatagridPropertyValue,
  DatagridRelationRef,
} from "@/lib/datagrid-schema";
import { renderWithProviders } from "@/test/render-with-query";

import { DatagridFieldEditor } from "./datagrid-field-editor";
import type { RelationTargets } from "./datagrid-relations";
import { DatagridRowProperties } from "./datagrid-row-properties";

const RELATION_FIELD: DatagridField = {
  id: "links",
  name: "Related",
  type: "relation",
  config: {},
};

const targets: RelationTargets = {
  options: [
    {
      ref: { type: "book", id: "book-1" },
      label: "A Book",
      subtitle: "Book",
    },
    {
      ref: { type: "datagrid_row", id: "row-1" },
      label: "Neighbor",
      subtitle: "Row",
    },
  ],
  resolveLabel: (ref: DatagridRelationRef) =>
    ref.id === "book-1" ? "A Book" : ref.id === "row-1" ? "Neighbor" : ref.id,
  navigate: vi.fn(),
};

function EditorHarness() {
  const [value, setValue] = useState<DatagridPropertyValue>(null);
  return (
    <DatagridFieldEditor
      field={RELATION_FIELD}
      value={value}
      relationTargets={targets}
      onCommit={setValue}
    />
  );
}

function PropertiesHarness() {
  const [properties, setProperties] = useState<
    Record<string, DatagridPropertyValue>
  >({});
  return (
    <DatagridRowProperties
      fields={[RELATION_FIELD]}
      properties={properties}
      createdAt="2026-01-01T00:00:00.000Z"
      updatedAt="2026-01-01T00:00:00.000Z"
      relationTargets={targets}
      onPatch={(fieldId, value) => {
        setProperties((prev) => ({ ...prev, [fieldId]: value }));
      }}
    />
  );
}

describe("relation picker remount", () => {
  it("keeps the picker open when DatagridFieldEditor value updates", () => {
    renderWithProviders(<EditorHarness />);
    fireEvent.click(screen.getByRole("button", { name: /Add Related/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /A Book/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /A Book/,
      }),
    ).toHaveClass("bg-selected");
  });

  it("keeps the picker open when DatagridRowProperties patches", () => {
    renderWithProviders(<PropertiesHarness />);
    fireEvent.click(screen.getByRole("button", { name: /Add Related/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /A Book/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /A Book/,
      }),
    ).toHaveClass("bg-selected");
  });
});
