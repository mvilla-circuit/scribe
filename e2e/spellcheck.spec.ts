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

test.describe("spellcheck", () => {
  test("squiggles a misspelling and clears it after Add to dictionary", async ({
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

    await authedPage.keyboard.type("helllo");

    // The custom checker lazy-loads its dictionary, then draws a red squiggle
    // over the misspelling — allow generous time for that first load.
    const squiggle = editor.locator(".scribe-spell-error");
    await expect(squiggle).toHaveText("helllo", { timeout: 30_000 });

    // Clicking the squiggle opens the menu; "Add to dictionary" is account-wide.
    await squiggle.click();
    await authedPage.getByRole("button", { name: "Add to dictionary" }).click();

    // Once added, the word is no longer flagged.
    await expect(editor.locator(".scribe-spell-error")).toHaveCount(0);
  });
});
