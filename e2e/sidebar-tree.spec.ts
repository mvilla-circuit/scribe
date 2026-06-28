import { expect, test } from "./fixtures";

const TS = "2026-01-01T00:00:00.000Z";

test.use({
  seed: {
    folders: [
      {
        id: "f1",
        user_id: "user-1",
        name: "My Folder",
        parent_folder_id: null,
        position: 1024,
        created_at: TS,
        updated_at: TS,
      },
    ],
    books: [
      {
        id: "b1",
        user_id: "user-1",
        title: "Inside Book",
        subtitle: null,
        cover_url: null,
        icon: null,
        theme: {},
        folder_id: "f1",
        position: 1024,
        created_at: TS,
        updated_at: TS,
      },
      {
        id: "b2",
        user_id: "user-1",
        title: "Root Book",
        subtitle: null,
        cover_url: null,
        icon: null,
        theme: {},
        folder_id: null,
        position: 2048,
        created_at: TS,
        updated_at: TS,
      },
    ],
    documents: [],
  },
});

test.describe("library sidebar", () => {
  test("renders the seeded tree and reveals a book when its folder expands", async ({
    authedPage,
  }) => {
    await authedPage.goto("/");

    await expect(
      authedPage.getByRole("treeitem", { name: /My Folder/ }),
    ).toBeVisible();
    await expect(
      authedPage.getByRole("treeitem", { name: /Root Book/ }),
    ).toBeVisible();

    // The nested book stays hidden while its folder is collapsed.
    await expect(
      authedPage.getByRole("treeitem", { name: /Inside Book/ }),
    ).toHaveCount(0);

    await authedPage.getByRole("treeitem", { name: /My Folder/ }).click();

    await expect(
      authedPage.getByRole("treeitem", { name: /Inside Book/ }),
    ).toBeVisible();
  });
});
