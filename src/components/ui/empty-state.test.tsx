import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders the title and body", () => {
    render(<EmptyState title="No documents yet" body="Add your first page." />);

    expect(screen.getByText("No documents yet")).toBeInTheDocument();
    expect(screen.getByText("Add your first page.")).toBeInTheDocument();
  });

  it("renders an optional CTA node", () => {
    render(
      <EmptyState
        title="This collection is empty"
        body="Add a doc to start writing."
        cta={<button type="button">New doc</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "New doc" })).toBeInTheDocument();
  });

  it("omits the CTA when none is provided", () => {
    render(<EmptyState title="This datagrid is empty" body="Add a row." />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
