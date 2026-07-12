import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DatagridField } from "@/lib/datagrid-schema";
import { renderWithProviders } from "@/test/render-with-query";

import { FieldManager } from "./datagrid-field-manager";

beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

function Harness({
  initial,
  onChange,
}: {
  initial: DatagridField[];
  onChange?: (f: DatagridField[]) => void;
}) {
  const [fields, setFields] = useState(initial);
  return (
    <FieldManager
      open
      onOpenChange={() => {
        // no-op: harness keeps the dialog open for the whole test
      }}
      fields={fields}
      onChange={(next) => {
        setFields(next);
        onChange?.(next);
      }}
    />
  );
}

const SELECT_FIELD: DatagridField = {
  id: "f1",
  name: "Gender",
  type: "select",
  config: {
    options: [
      { id: "female", name: "Female", color: "rosewood" },
      { id: "male", name: "Male", color: "sky" },
    ],
  },
};

describe("FieldManager", () => {
  it("creates a field from the type menu with a default name", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    renderWithProviders(<Harness initial={[]} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Add field" }));
    await user.click(await screen.findByRole("menuitem", { name: "Text" }));
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        name: "Text",
        type: "text",
        config: {},
      }),
    ]);
  });

  it("allows duplicate default names", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    renderWithProviders(<Harness initial={[]} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Add field" }));
    await user.click(await screen.findByRole("menuitem", { name: "Text" }));
    await user.click(screen.getByRole("button", { name: "Add field" }));
    await user.click(await screen.findByRole("menuitem", { name: "Text" }));

    const last = onChange.mock.calls.at(-1)?.[0] as DatagridField[];
    expect(last.map((field) => field.name)).toEqual(["Text", "Text"]);
  });

  it("focuses the name input after creating a field", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<Harness initial={[]} />);
    await user.click(screen.getByRole("button", { name: "Add field" }));
    await user.click(await screen.findByRole("menuitem", { name: "Number" }));
    expect(screen.getByLabelText("Field name for Number")).toHaveFocus();
  });

  it("does not render a native type select", () => {
    const field: DatagridField = {
      id: "f1",
      name: "Notes",
      type: "text",
      config: {},
    };
    renderWithProviders(<Harness initial={[field]} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("retypes a field via the type chip", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    const field: DatagridField = {
      id: "f1",
      name: "Notes",
      type: "text",
      config: {},
    };
    renderWithProviders(<Harness initial={[field]} onChange={onChange} />);
    await user.click(
      screen.getByRole("button", { name: "Field type for Notes: Text" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Select" }));
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        id: "f1",
        name: "Notes",
        type: "select",
        config: { options: [] },
      }),
    ]);
  });

  it("renames a field on blur, not every keystroke", () => {
    const onChange = vi.fn();
    const field: DatagridField = {
      id: "f1",
      name: "Status",
      type: "text",
      config: {},
    };
    renderWithProviders(<Harness initial={[field]} onChange={onChange} />);
    const input = screen.getByLabelText("Field name for Status");
    fireEvent.change(input, { target: { value: "Stage" } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    const last = onChange.mock.calls.at(-1)?.[0] as DatagridField[];
    expect(last[0]?.name).toBe("Stage");
  });

  it("deletes a field", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    const field: DatagridField = {
      id: "f1",
      name: "Notes",
      type: "text",
      config: {},
    };
    renderWithProviders(<Harness initial={[field]} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Delete Notes" }));
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual([]);
  });

  it("renders options as colored chips", () => {
    renderWithProviders(<Harness initial={[SELECT_FIELD]} />);

    expect(screen.getByRole("button", { name: "Rename Female" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Rename Male" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Stone for Female" }),
    ).not.toBeInTheDocument();
  });

  it("changes option color from the chip color picker", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    renderWithProviders(
      <Harness initial={[SELECT_FIELD]} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Color for Female" }));
    await user.click(
      await screen.findByRole("button", { name: "Moss for Female" }),
    );

    const last = onChange.mock.calls.at(-1)?.[0] as DatagridField[];
    expect(last[0]?.config.options?.[0]?.color).toBe("moss");
  });

  it("renames an option via expansive inline edit", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    renderWithProviders(
      <Harness initial={[SELECT_FIELD]} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Rename Female" }));
    const input = screen.getByRole("textbox", { name: "Rename Female" });
    await user.clear(input);
    await user.type(input, "Woman{Enter}");

    const last = onChange.mock.calls.at(-1)?.[0] as DatagridField[];
    expect(last[0]?.config.options?.[0]?.name).toBe("Woman");
    expect(screen.getByRole("button", { name: "Rename Woman" })).toBeVisible();
  });

  it("cancels an option rename left blank, keeping the previous name", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    renderWithProviders(
      <Harness initial={[SELECT_FIELD]} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Rename Female" }));
    const input = screen.getByRole("textbox", { name: "Rename Female" });
    await user.clear(input);
    await user.keyboard("{Enter}");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Rename Female" })).toBeVisible();
  });

  it("renames a field on blur, trimming surrounding whitespace", () => {
    const onChange = vi.fn();
    const field: DatagridField = {
      id: "f1",
      name: "Status",
      type: "text",
      config: {},
    };
    renderWithProviders(<Harness initial={[field]} onChange={onChange} />);
    const input = screen.getByLabelText("Field name for Status");
    fireEvent.change(input, { target: { value: "  Stage  " } });
    fireEvent.blur(input);
    const last = onChange.mock.calls.at(-1)?.[0] as DatagridField[];
    expect(last[0]?.name).toBe("Stage");
  });

  it("cancels a field rename left blank, reverting to the previous name", () => {
    const onChange = vi.fn();
    const field: DatagridField = {
      id: "f1",
      name: "Status",
      type: "text",
      config: {},
    };
    renderWithProviders(<Harness initial={[field]} onChange={onChange} />);
    const input = screen.getByLabelText("Field name for Status");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("Status");
  });

  it("deletes an option from the chip", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    renderWithProviders(
      <Harness initial={[SELECT_FIELD]} onChange={onChange} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Delete option Female" }),
    );

    const last = onChange.mock.calls.at(-1)?.[0] as DatagridField[];
    expect(last[0]?.config.options).toEqual([
      expect.objectContaining({ name: "Male" }),
    ]);
    expect(
      screen.queryByRole("button", { name: "Rename Female" }),
    ).not.toBeInTheDocument();
  });

  it("adds an option chip and focuses rename", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<Harness initial={[SELECT_FIELD]} />);

    await user.click(screen.getByRole("button", { name: "Add option" }));

    expect(
      screen.getByRole("textbox", { name: "Rename New option" }),
    ).toHaveFocus();
  });

  it("adds an option with the next swatch", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    const field: DatagridField = {
      id: "f1",
      name: "Stage",
      type: "select",
      config: { options: [] },
    };
    renderWithProviders(<Harness initial={[field]} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Add option" }));
    const last = onChange.mock.calls.at(-1)?.[0] as DatagridField[];
    expect(last[0]?.config.options).toEqual([
      expect.objectContaining({
        name: "New option",
        color: "stone",
      }),
    ]);
  });

  it("keeps stacking option adds when the parent fields prop lags", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const snapshots: DatagridField[][] = [];

    function StaleParent() {
      // Parent never re-renders with onChange results — mimics a slow RQ write.
      const [fields] = useState([SELECT_FIELD]);
      return (
        <FieldManager
          open
          onOpenChange={() => {
            // keep open
          }}
          fields={fields}
          onChange={(next) => {
            snapshots.push(next);
          }}
        />
      );
    }

    renderWithProviders(<StaleParent />);
    await user.click(screen.getByRole("button", { name: "Add option" }));
    await user.click(screen.getByRole("button", { name: "Add option" }));

    const last = snapshots.at(-1);
    expect(last?.[0]?.config.options).toHaveLength(4);
  });

  it("reorders a field with keyboard on the drag handle", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    const initial: DatagridField[] = [
      { id: "a", name: "Alpha", type: "text", config: {} },
      { id: "b", name: "Beta", type: "text", config: {} },
    ];
    renderWithProviders(<Harness initial={initial} onChange={onChange} />);
    screen.getByRole("button", { name: "Reorder Alpha" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: "b" }),
      expect.objectContaining({ id: "a" }),
    ]);
  });
});
