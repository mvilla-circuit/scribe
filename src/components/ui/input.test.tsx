import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("renders the current value and forwards changes via onChange", () => {
    const onChange = vi.fn();
    render(
      <Input aria-label="Title" value="draft" onChange={onChange} readOnly />,
    );

    const input = screen.getByRole("textbox", { name: "Title" });
    expect(input).toHaveValue("draft");

    fireEvent.change(input, { target: { value: "final" } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("forwards a ref to the underlying input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input aria-label="Title" ref={ref} readOnly />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("merges a custom className with the shared chrome", () => {
    render(<Input aria-label="Title" className="pl-8" readOnly />);

    const input = screen.getByRole("textbox", { name: "Title" });
    expect(input).toHaveClass("pl-8");
    expect(input).toHaveClass("border-border");
  });
});
