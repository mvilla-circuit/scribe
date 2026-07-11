import { expect, test } from "./fixtures";

const TS = "2026-01-01T00:00:00.000Z";

test.describe("datagrid", () => {
  // The create flow: a datagrid is born inside a collection and opens on its
  // empty page, where a field and a row can be added and the row opened.
  test("creates a datagrid in a collection and opens a row", async ({
    authedPage,
  }) => {
    await authedPage.goto("/");

    // A datagrid lives inside a collection, so create the collection first.
    await authedPage.getByRole("button", { name: "Create" }).click();
    await authedPage.getByRole("menuitem", { name: "New collection" }).click();
    const collectionRename = authedPage.getByPlaceholder("Collection name");
    await collectionRename.fill("Data");
    await collectionRename.press("Enter");

    const collectionRow = authedPage.getByRole("treeitem", { name: /Data/ });
    await expect(collectionRow).toBeVisible();

    // Create a datagrid from the collection row's actions menu.
    await collectionRow.hover();
    await collectionRow.getByRole("button", { name: "More actions" }).click();
    await authedPage.getByRole("menuitem", { name: "New datagrid" }).click();

    // The datagrid opens on its (empty) page; commit the default name.
    await expect(authedPage.getByText("This datagrid is empty")).toBeVisible();
    await authedPage.keyboard.press("Enter");

    // Fields live under View options; create is type-first.
    await authedPage.getByRole("button", { name: "View options" }).click();
    await authedPage.getByRole("menuitem", { name: "Fields" }).click();
    await authedPage.getByRole("button", { name: "Add field" }).click();
    await authedPage.getByRole("menuitem", { name: "Text" }).click();
    await authedPage.getByRole("button", { name: "Done" }).click();

    // Empty-state CTA still says "New row"; toolbar says "New" once rows exist.
    await authedPage.getByRole("button", { name: "New row" }).click();
    await expect(authedPage.getByRole("table")).toBeVisible();

    // Open the row in a modal (the default open mode).
    await authedPage
      .getByRole("button", { name: /Open Untitled/ })
      .first()
      .click();
    await expect(authedPage.getByRole("dialog")).toBeVisible();
  });
});

// A seeded datagrid gives the layout-switch flow a stable view to persist onto
// (the create flow's optimistic view can race the stub's settle-time refetch).
test.describe("datagrid with seeded data", () => {
  test.use({
    seed: {
      folders: [],
      documents: [],
      books: [],
      collections: [
        {
          id: "c-data",
          user_id: "user-1",
          name: "Data",
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
      datagrids: [
        {
          id: "dg-1",
          user_id: "user-1",
          collection_id: "c-data",
          name: "Records",
          icon: null,
          cover_url: null,
          fields: [{ id: "f-note", name: "Note", type: "text", config: {} }],
          position: 1024,
          created_at: TS,
          updated_at: TS,
        },
      ],
      datagrid_views: [
        {
          id: "v-1",
          user_id: "user-1",
          datagrid_id: "dg-1",
          name: "Grid",
          config: {
            layout: "table",
            filters: [],
            sorts: [],
            groupBy: null,
            visibleFieldIds: [],
            columnWidths: {},
            boardFieldId: null,
            coverField: null,
          },
          position: 0,
          is_default: true,
          created_at: TS,
          updated_at: TS,
        },
      ],
      datagrid_rows: [
        {
          id: "r-1",
          user_id: "user-1",
          datagrid_id: "dg-1",
          title: "First record",
          icon: null,
          cover_url: null,
          properties: {},
          content: {},
          position: 1024,
          created_at: TS,
          updated_at: TS,
        },
      ],
    },
  });

  test("switches layouts and opens a row modal", async ({ authedPage }) => {
    await authedPage.goto("/");

    // Reveal the datagrid nested under its collection, then open it.
    await authedPage
      .getByRole("treeitem", { name: /Data/ })
      .getByRole("button", { name: "Expand collection" })
      .click();
    await authedPage.getByRole("treeitem", { name: /Records/ }).click();

    // The seeded row shows in the default table layout.
    await expect(authedPage.getByRole("table")).toBeVisible();

    // Layout lives under View options → Layout submenu.
    await authedPage.getByRole("button", { name: "View options" }).click();
    const layout = authedPage.getByRole("menuitem", { name: /Layout/ });
    await layout.focus();
    await authedPage.keyboard.press("ArrowRight");
    await authedPage.getByRole("menuitem", { name: "Gallery" }).click();
    await expect(authedPage.getByRole("table")).toHaveCount(0);

    await authedPage.getByRole("button", { name: "View options" }).click();
    await authedPage.getByRole("menuitem", { name: /Layout/ }).focus();
    await authedPage.keyboard.press("ArrowRight");
    await authedPage.getByRole("menuitem", { name: "Table" }).click();
    await expect(authedPage.getByRole("table")).toBeVisible();

    // Open the row in a modal (the default open mode).
    await authedPage
      .getByRole("button", { name: /Open First record/ })
      .first()
      .click();
    await expect(authedPage.getByRole("dialog")).toBeVisible();
  });
});
