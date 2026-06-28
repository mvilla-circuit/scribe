import { expect, test } from "./fixtures";

const TS = "2026-01-01T00:00:00.000Z";

test.use({
  seed: {
    folders: [],
    books: [
      {
        id: "b1",
        user_id: "user-1",
        title: "My Book",
        subtitle: null,
        cover_url: null,
        icon: null,
        theme: {},
        folder_id: null,
        position: 1024,
        created_at: TS,
        updated_at: TS,
      },
    ],
    documents: [],
  },
});

test.describe("editor typing", () => {
  test("types a paragraph and a markdown heading into a page", async ({
    authedPage,
  }) => {
    await authedPage.goto("/");

    // Open the book, then add its first page to land in the editor.
    await authedPage.getByRole("treeitem", { name: /My Book/ }).click();
    // The title page's contents CTA (scoped to its article; the sidebar outline
    // panel shows the same label).
    await authedPage
      .getByRole("article")
      .getByRole("button", { name: /add your first page/i })
      .click();

    const editor = authedPage.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await editor.click();

    await authedPage.keyboard.type("Hello world");
    await expect(editor).toContainText("Hello world");

    // The "# " input rule promotes the line to a heading on the fly.
    await authedPage.keyboard.press("Enter");
    await authedPage.keyboard.type("# A heading");
    await expect(editor.locator("h1")).toHaveText("A heading");
  });
});
