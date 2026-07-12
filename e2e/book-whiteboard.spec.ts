import { expect, test } from "./fixtures";

const TS = "2026-01-01T00:00:00.000Z";

test.describe("book whiteboard", () => {
  test.use({
    seed: {
      books: [
        {
          id: "book-whiteboard",
          user_id: "user-1",
          title: "Field Notes",
          subtitle: null,
          cover_url: null,
          icon: null,
          theme: {},
          folder_id: null,
          collection_id: null,
          position: 1024,
          created_at: TS,
          updated_at: TS,
        },
      ],
      folders: [],
      documents: [
        {
          id: "title-page",
          user_id: "user-1",
          book_id: "book-whiteboard",
          parent_document_id: null,
          title: "Field Notes",
          subtitle: null,
          cover_url: null,
          content: {},
          icon: null,
          banner_color: null,
          banner_text: null,
          font_overrides: null,
          is_title_page: true,
          show_outline: true,
          show_subtitle: false,
          show_contents: false,
          spellcheck_enabled: true,
          spellcheck_ignores: [],
          position: 0,
          created_at: TS,
          updated_at: TS,
        },
      ],
    },
  });

  test("creates a whiteboard from the book outline", async ({ authedPage }) => {
    await authedPage.goto("/");
    await authedPage.getByRole("treeitem", { name: /Field Notes/ }).click();

    await authedPage.getByRole("button", { name: "Add to outline" }).click();
    await authedPage.getByRole("menuitem", { name: "New whiteboard" }).click();

    await expect(authedPage.getByTestId("whiteboard-page")).toBeVisible();
    await expect(authedPage.getByTestId("whiteboard-canvas")).toBeVisible();
  });
});
