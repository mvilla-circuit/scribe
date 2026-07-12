import type { Locator } from "@playwright/test";

import { expect, test } from "./fixtures";

const TS = "2026-01-01T00:00:00.000Z";

/** Resolve a locator's bounding box, or fail when Playwright returns null. */
async function boundingBoxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error("expected a bounding box");
  }
  return box;
}

test.describe("collections", () => {
  test("creates a collection from the Library menu and opens its page", async ({
    authedPage,
  }) => {
    await authedPage.goto("/");

    // Open the Library create menu and add a collection.
    await authedPage.getByRole("button", { name: "Create" }).click();
    await authedPage.getByRole("menuitem", { name: "New collection" }).click();

    // The new row lands in inline-rename; name it and commit with Enter.
    const rename = authedPage.getByPlaceholder("Collection name");
    await rename.fill("Chronicles");
    await rename.press("Enter");

    const row = authedPage.getByRole("treeitem", { name: /Chronicles/ });
    await expect(row).toBeVisible();

    // Opening the collection shows its (empty) page.
    await row.click();
    await expect(
      authedPage.getByText("This collection is empty"),
    ).toBeVisible();
  });
});

test.describe("collections with seeded data", () => {
  test.use({
    seed: {
      folders: [],
      documents: [],
      entries: [],
      collections: [
        {
          id: "c1",
          user_id: "user-1",
          name: "The Realm",
          icon: null,
          cover_url: "https://example.com/cover.jpg",
          description: null,
          parent_collection_id: null,
          fields: [],
          view: {},
          position: 1024,
          created_at: TS,
          updated_at: TS,
        },
      ],
      books: [
        {
          id: "b1",
          user_id: "user-1",
          title: "Alpha Book",
          subtitle: null,
          cover_url: null,
          icon: null,
          theme: {},
          folder_id: null,
          collection_id: "c1",
          position: 1024,
          created_at: TS,
          updated_at: TS,
        },
        {
          id: "b2",
          user_id: "user-1",
          title: "Zeta Book",
          subtitle: null,
          cover_url: null,
          icon: null,
          theme: {},
          folder_id: null,
          collection_id: "c1",
          position: 2048,
          created_at: TS,
          updated_at: TS,
        },
      ],
    },
  });

  test("renders the seeded collection and book", async ({ authedPage }) => {
    await authedPage.goto("/");
    await authedPage.getByRole("treeitem", { name: /The Realm/ }).click();
    await expect(
      authedPage.getByRole("button", { name: "Alpha Book", exact: true }),
    ).toBeVisible();
  });

  test("displays the seeded collection cover", async ({ authedPage }) => {
    await authedPage.goto("/");
    await authedPage.getByRole("treeitem", { name: /The Realm/ }).click();

    await expect(
      authedPage.getByRole("img", { name: "Page cover" }),
    ).toHaveAttribute("src", "https://example.com/cover.jpg");
  });

  test("filters the gallery and switches to list view", async ({
    authedPage,
  }) => {
    await authedPage.goto("/");
    await authedPage.getByRole("treeitem", { name: /The Realm/ }).click();

    const search = authedPage.getByRole("searchbox", {
      name: "Search collection",
    });
    await search.fill("Alpha");
    await expect(
      authedPage.getByRole("button", { name: "Alpha Book", exact: true }),
    ).toBeVisible();
    await expect(
      authedPage.getByRole("button", { name: "Zeta Book", exact: true }),
    ).toBeHidden();

    await search.fill("");
    await expect(
      authedPage.getByRole("button", { name: "Zeta Book", exact: true }),
    ).toBeVisible();

    await authedPage.getByRole("button", { name: "List view" }).click();
    // List rows use a left media cap (gallery cards do not).
    await expect(
      authedPage.getByTestId("list-row-media").first(),
    ).toBeVisible();
    await expect(
      authedPage.getByRole("button", { name: "Alpha Book", exact: true }),
    ).toBeVisible();
  });

  test("creates an entry in a collection and edits it", async ({
    authedPage,
  }) => {
    await authedPage.goto("/");
    await authedPage.getByRole("treeitem", { name: /The Realm/ }).click();
    await authedPage
      .getByRole("button", { name: "More create options" })
      .first()
      .click();
    await authedPage.getByRole("menuitem", { name: "New doc" }).click();

    const title = authedPage.getByRole("textbox", { name: "Document title" });
    await title.fill("Lore notes");
    await title.press("Enter");

    const entryRow = authedPage.getByRole("treeitem", { name: /Lore notes/ });
    await expect(entryRow).toBeVisible();
    await entryRow.click();

    const editor = authedPage.locator(".ProseMirror");
    await editor.fill("The old road winds north.");
    await expect(editor).toContainText("The old road winds north.");
  });
});

test.describe("collection gallery card heights", () => {
  const tallSubtitle =
    "A long subtitle that wraps onto a second line to grow this card taller than its neighbor";

  test.use({
    seed: {
      folders: [],
      documents: [],
      entries: [],
      collections: [
        {
          id: "c-heights",
          user_id: "user-1",
          name: "Heights",
          icon: null,
          cover_url: null,
          description: null,
          parent_collection_id: null,
          fields: [],
          view: {},
          position: 1024,
          created_at: TS,
          updated_at: TS,
        },
      ],
      books: [
        {
          id: "b-tall",
          user_id: "user-1",
          title: "Tall Card",
          subtitle: tallSubtitle,
          cover_url: null,
          icon: null,
          theme: {},
          folder_id: null,
          collection_id: "c-heights",
          position: 1024,
          created_at: TS,
          updated_at: TS,
        },
        {
          id: "b-short",
          user_id: "user-1",
          title: "Short Card",
          subtitle: null,
          cover_url: null,
          icon: null,
          theme: {},
          folder_id: null,
          collection_id: "c-heights",
          position: 2048,
          created_at: TS,
          updated_at: TS,
        },
      ],
    },
  });

  // Tailwind breakpoints drive the gallery columns (viewport-based):
  // default 2, sm 3, lg 4. Sidebar shrinks the content pane but not the mq.
  const viewports = [
    { width: 500, cols: 2 },
    { width: 800, cols: 3 },
    { width: 1280, cols: 4 },
  ] as const;

  for (const { width, cols } of viewports) {
    test(`gallery grid cards in a row share equal height (${cols} cols)`, async ({
      authedPage,
    }) => {
      await authedPage.setViewportSize({ width, height: 800 });
      await authedPage.goto("/");
      await authedPage.getByRole("treeitem", { name: /Heights/ }).click();

      const tall = authedPage.getByRole("button", {
        name: /^Tall Card /,
      });
      const short = authedPage.getByRole("button", {
        name: "Short Card",
        exact: true,
      });
      await expect(tall).toBeVisible();
      await expect(short).toBeVisible();
      await expect(authedPage.getByText(tallSubtitle)).toBeVisible();

      const tallBox = await boundingBoxOf(tall);
      const shortBox = await boundingBoxOf(short);
      expect(Math.abs(tallBox.height - shortBox.height)).toBeLessThanOrEqual(1);
      // Same row: tops align (within a pixel) when both fit in the first row.
      expect(Math.abs(tallBox.y - shortBox.y)).toBeLessThanOrEqual(1);
    });
  }
});
