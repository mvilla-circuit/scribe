import { expect, test } from "./fixtures";

test.describe("create book", () => {
  test("creates a book from the empty state and opens its title page", async ({
    authedPage,
  }) => {
    await authedPage.goto("/");

    await expect(
      authedPage.getByText(/create your first book to start writing/i),
    ).toBeVisible();

    // The main empty state and the (also-empty) sidebar each render a "New
    // book" button; only the main one opens the book, so scope to the section.
    await authedPage
      .locator("section")
      .getByRole("button", { name: "New book" })
      .click();

    // We're now on the new book's Title Page: its settings bar and the empty
    // contents call-to-action are both unique to that view.
    await expect(
      authedPage.getByRole("navigation", { name: "Book settings" }),
    ).toBeVisible();
    // The contents call-to-action also appears in the sidebar outline panel, so
    // scope to the title page's article.
    await expect(
      authedPage
        .getByRole("article")
        .getByRole("button", { name: /add your first page/i }),
    ).toBeVisible();
  });
});
