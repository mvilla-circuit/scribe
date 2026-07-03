import { expect, test } from "./fixtures";

const TS = "2026-01-01T00:00:00.000Z";

// Long enough that the serif title must wrap onto several lines once the reading
// column is narrowed by the page outline — which is exactly when the auto-grown
// title textarea used to keep its stale one-line height and clip the tail.
const LONG_TITLE =
  "Another Account of the Creation of the Heavens and the Earth";

function documentRow(overrides: Record<string, unknown>) {
  return {
    user_id: "user-1",
    book_id: "b1",
    parent_document_id: null,
    icon: null,
    subtitle: null,
    banner_color: null,
    banner_text: null,
    show_outline: false,
    show_subtitle: false,
    show_contents: false,
    is_title_page: false,
    position: 1024,
    font_overrides: null,
    content: {},
    created_at: TS,
    updated_at: TS,
    ...overrides,
  };
}

test.use({
  seed: {
    folders: [],
    books: [
      {
        id: "b1",
        user_id: "user-1",
        title: "Genesis",
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
    documents: [
      documentRow({ id: "title", title: "Genesis", is_title_page: true }),
      documentRow({
        id: "chapter-2",
        title: LONG_TITLE,
        show_outline: true,
        position: 2048,
        // A real ProseMirror body with headings so the outline populates on load.
        content: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "2:4" }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "In the day that the LORD God made the earth and the heavens.",
                },
              ],
            },
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "2:7" }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "And the LORD God formed man of the dust of the ground.",
                },
              ],
            },
          ],
        },
      }),
    ],
  },
});

test.describe("document title with an outline", () => {
  test("is not clipped on load when an outline exists", async ({
    authedPage,
  }) => {
    // Wide enough to keep the outline visible (>= md), narrow enough (after the
    // sidebar) that reserving the outline gutter noticeably shrinks the column.
    await authedPage.setViewportSize({ width: 900, height: 820 });
    await authedPage.goto("/");

    // Open the book, then the long-titled chapter page.
    await authedPage.getByRole("treeitem", { name: /Genesis/ }).click();
    await authedPage
      .getByRole("treeitem", { name: /Another Account of the Creation/ })
      .click();

    // Wait for the body (and thus the outline) to render.
    const editor = authedPage.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await expect(editor.locator("h2").first()).toHaveText("2:4");
    await expect(
      authedPage.getByRole("navigation", { name: "Page outline" }),
    ).toBeVisible();

    const title = authedPage.getByRole("textbox", { name: "Document title" });
    await expect(title).toHaveValue(LONG_TITLE);

    // The textarea hides overflow, so any clipped tail shows up as
    // scrollHeight exceeding the box it was grown to.
    await expect
      .poll(() => title.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeLessThanOrEqual(1);
  });

  test("stays unclipped after the viewport is resized narrower", async ({
    authedPage,
  }) => {
    await authedPage.setViewportSize({ width: 1000, height: 820 });
    await authedPage.goto("/");

    await authedPage.getByRole("treeitem", { name: /Genesis/ }).click();
    await authedPage
      .getByRole("treeitem", { name: /Another Account of the Creation/ })
      .click();

    const editor = authedPage.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await expect(editor.locator("h2").first()).toHaveText("2:4");

    const title = authedPage.getByRole("textbox", { name: "Document title" });
    await expect(title).toHaveValue(LONG_TITLE);

    // Shrinking the window narrows the column after the title was measured; only
    // the ResizeObserver remeasure keeps the grown height in step.
    await authedPage.setViewportSize({ width: 820, height: 820 });

    await expect
      .poll(() => title.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeLessThanOrEqual(1);
  });
});
