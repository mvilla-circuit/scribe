import { screen, within } from "@testing-library/react";
import { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

import { Masthead } from "./masthead";

function renderMasthead({
  icon = null,
  actions,
  children,
}: {
  icon?: string | null;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return renderWithProviders(
    <Masthead
      icon={icon}
      onSelectIcon={vi.fn()}
      onRemoveIcon={vi.fn()}
      changeIconLabel="Change icon"
      actions={actions}
    >
      {children}
    </Masthead>,
  );
}

/** Title stays on the title line; subtitle stays a sibling under masthead-title. */
function expectTitleLineExcludesSubtitle(subtitle: string) {
  const titleLine = screen.getByTestId("masthead-title-line");
  const subtitleEl = screen.getByText(subtitle);

  expect(titleLine).toContainElement(
    screen.getByRole("heading", { name: "Series" }),
  );
  expect(titleLine).not.toContainElement(subtitleEl);
  expect(screen.getByTestId("masthead-title")).toContainElement(subtitleEl);
}

describe("Masthead", () => {
  it("renders Add icon and actions in the same header row", () => {
    renderMasthead({
      actions: <button type="button">Add cover</button>,
      children: <h1>Series</h1>,
    });

    const header = screen.getByRole("banner");
    expect(
      within(header).getByRole("button", { name: /Add icon/i }),
    ).toBeInTheDocument();
    expect(
      within(header).getByRole("button", { name: "Add cover" }),
    ).toBeInTheDocument();
  });

  it("hangs the set icon beside the title so affordance actions cannot shift it", () => {
    renderMasthead({
      icon: "📘",
      actions: <button type="button">Add cover</button>,
      children: <h1>Series</h1>,
    });

    const iconButton = screen.getByRole("button", { name: "Change icon" });
    const titleBlock = screen.getByTestId("masthead-title");
    const actionsRow = screen.getByTestId("masthead-actions-row");

    expect(titleBlock).toContainElement(iconButton);
    expect(titleBlock).toContainElement(
      screen.getByRole("heading", { name: "Series" }),
    );
    expect(actionsRow).not.toContainElement(iconButton);
    expect(actionsRow).toContainElement(
      screen.getByRole("button", { name: "Add cover" }),
    );
  });

  it("keeps stacked icon margin and clears it only at xl when hanging", () => {
    renderMasthead({
      icon: "📘",
      children: <h1>Series</h1>,
    });

    expect(screen.getByTestId("masthead-icon")).toHaveClass(
      "mb-2",
      "xl:mb-0",
      "xl:top-1/2",
      "xl:-translate-y-1/2",
    );
    expect(
      screen.queryByTestId("masthead-actions-row"),
    ).not.toBeInTheDocument();
  });

  it("centers the hanging icon on the title line, not the full masthead block", () => {
    renderMasthead({
      icon: "📘",
      children: [<h1 key="title">Series</h1>, <p key="sub">A subtitle</p>],
    });

    const titleLine = screen.getByTestId("masthead-title-line");
    expect(titleLine).toContainElement(screen.getByTestId("masthead-icon"));
    expectTitleLineExcludesSubtitle("A subtitle");
  });

  it("flattens fragment children so a book-style title block still centers on the title", () => {
    renderMasthead({
      icon: "📘",
      children: (
        <>
          <h1>Series</h1>
          <p>A subtitle</p>
        </>
      ),
    });

    expect(screen.getByTestId("masthead-title-line")).toContainElement(
      screen.getByTestId("masthead-icon"),
    );
    expectTitleLineExcludesSubtitle("A subtitle");
  });

  it("keeps the in-flow margin when Add cover is present beside an icon", () => {
    renderMasthead({
      icon: "📘",
      actions: <button type="button">Add cover</button>,
      children: <h1>Series</h1>,
    });

    const row = screen.getByTestId("masthead-actions-row");
    expect(row).toHaveClass("mb-2");
    expect(row).not.toHaveClass("xl:mb-0");
  });
});
