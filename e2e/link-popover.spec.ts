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

test.describe("link popover", () => {
  test("adds, previews, edits, and removes an inline link", async ({
    authedPage,
  }) => {
    await authedPage.goto("/");

    await authedPage.getByRole("treeitem", { name: /My Book/ }).click();
    await authedPage
      .getByRole("article")
      .getByRole("button", { name: /add your first page/i })
      .click();

    const editor = authedPage.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await editor.click();
    await authedPage.keyboard.type("example");

    // Select the word so the bubble toolbar appears, then open the link editor.
    await authedPage.keyboard.press("ControlOrMeta+a");
    await authedPage.getByRole("button", { name: "Link", exact: true }).click();

    // Add mode opens straight into the shared URL form.
    await authedPage.getByLabel("Link URL").fill("example.com");
    await authedPage.getByRole("button", { name: "Add link" }).click();

    const link = editor.locator("a");
    await expect(link).toHaveAttribute("href", "https://example.com");
    await expect(link).toHaveText("example");

    // Collapse the selection so the bubble menu doesn't cover the link.
    await authedPage.keyboard.press("ArrowRight");

    // Hover shows the full URL in the view popover.
    await link.hover();
    await expect(authedPage.locator(".scribe-linkpop-url")).toHaveText(
      "https://example.com",
    );

    // Edit -> change the URL -> the link's href updates, text is unchanged.
    await authedPage.getByRole("button", { name: "Edit link" }).click();
    await authedPage.getByLabel("Link URL").fill("example.org");
    await authedPage.getByRole("button", { name: "Update link" }).click();
    await expect(link).toHaveAttribute("href", "https://example.org");
    await expect(link).toHaveText("example");

    await authedPage.keyboard.press("ArrowRight");

    // Re-hovering after an edit must return to the URL preview (not stay stuck
    // in the edit form), so the URL is shown again before we remove it.
    await link.hover();
    await expect(authedPage.locator(".scribe-linkpop-url")).toHaveText(
      "https://example.org",
    );

    // Remove strips the link, leaving the text behind.
    await authedPage.getByRole("button", { name: "Remove link" }).click();
    await expect(editor.locator("a")).toHaveCount(0);
    await expect(editor).toContainText("example");
  });
});
