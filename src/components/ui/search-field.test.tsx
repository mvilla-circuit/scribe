import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SearchField } from "./search-field";

describe("SearchField", () => {
  it("associates the label with the input so it exposes an accessible name", () => {
    render(
      <SearchField label="Search collection" value="" onChange={vi.fn()} />,
    );

    expect(
      screen.getByRole("searchbox", { name: "Search collection" }),
    ).toBeInTheDocument();
  });

  it("renders the current value", () => {
    render(<SearchField label="Search" value="dragons" onChange={vi.fn()} />);

    expect(screen.getByRole("searchbox", { name: "Search" })).toHaveValue(
      "dragons",
    );
  });

  it("forwards typed text via onChange", () => {
    const onChange = vi.fn();
    render(<SearchField label="Search" value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), {
      target: { value: "novels" },
    });

    expect(onChange).toHaveBeenCalledWith("novels");
  });

  it("uses the placeholder prop", () => {
    render(
      <SearchField
        label="Search"
        value=""
        onChange={vi.fn()}
        placeholder="Find a page"
      />,
    );

    expect(screen.getByPlaceholderText("Find a page")).toBeInTheDocument();
  });

  it("shows a leading search icon by default", () => {
    const { container } = render(
      <SearchField label="Search" value="" onChange={vi.fn()} />,
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- decorative aria-hidden svg has no accessible role to query by
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("omits the icon when icon is set to null", () => {
    const { container } = render(
      <SearchField label="Search" value="" onChange={vi.fn()} icon={null} />,
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- decorative aria-hidden svg has no accessible role to query by
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("shows a visible label when hideLabel is false", () => {
    render(
      <SearchField
        label="Search collection"
        value=""
        onChange={vi.fn()}
        hideLabel={false}
      />,
    );

    expect(screen.getByText("Search collection")).not.toHaveClass("sr-only");
  });
});
