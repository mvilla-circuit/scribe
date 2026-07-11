import { expect, test } from "./fixtures";

const TS = "2026-01-01T00:00:00.000Z";

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
      collections: [
        {
          id: "c1",
          user_id: "user-1",
          name: "The Realm",
          icon: null,
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
          title: "First Light",
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
      ],
    },
  });

  test("renders the seeded collection and book", async ({ authedPage }) => {
    await authedPage.goto("/");
    await authedPage.getByRole("treeitem", { name: /The Realm/ }).click();
    await expect(
      authedPage.getByRole("button", { name: "First Light", exact: true }),
    ).toBeVisible();
  });
});
