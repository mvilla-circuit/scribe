import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TagChipsRow } from "./tag-chips-row";

const TAGS = [
  { id: "t1", name: "Fantasy", color: "sky" },
  { id: "t2", name: "Epic", color: "moss" },
  { id: "t3", name: "Series", color: "clay" },
  { id: "t4", name: "Draft", color: "plum" },
];

describe("TagChipsRow", () => {
  it("caps chips at max and shows a muted overflow count", () => {
    render(<TagChipsRow tags={TAGS} max={3} />);

    expect(screen.getByText("Fantasy")).toBeInTheDocument();
    expect(screen.getByText("Epic")).toBeInTheDocument();
    expect(screen.getByText("Series")).toBeInTheDocument();
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
    expect(screen.getByText("+1")).toHaveClass("text-muted");
  });

  it("renders nothing for an empty tag list", () => {
    const { container } = render(<TagChipsRow tags={[]} max={3} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("omits the overflow count when everything fits", () => {
    render(<TagChipsRow tags={TAGS.slice(0, 2)} max={3} />);

    expect(screen.getByText("Fantasy")).toBeInTheDocument();
    expect(screen.getByText("Epic")).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("shows all tags when max is omitted", () => {
    render(<TagChipsRow tags={TAGS} />);

    for (const tag of TAGS) {
      expect(screen.getByText(tag.name)).toBeInTheDocument();
    }
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });
});
