import { expect, test } from "./fixtures";

const TS = "2026-01-01T00:00:00.000Z";

test.describe("whiteboard", () => {
  test.use({
    seed: {
      books: [],
      folders: [],
      documents: [],
      collections: [
        {
          id: "c-whiteboard",
          user_id: "user-1",
          name: "Ideas",
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
    },
  });

  test("creates whiteboard under collection and adds sticky", async ({
    authedPage,
  }) => {
    await authedPage.goto("/");
    await authedPage.getByRole("treeitem", { name: /Ideas/ }).click();

    await authedPage
      .getByRole("button", { name: "More create options" })
      .first()
      .click();
    await authedPage.getByRole("menuitem", { name: "New whiteboard" }).click();

    const whiteboardPage = authedPage.getByTestId("whiteboard-page");
    await expect(whiteboardPage).toBeVisible();

    await authedPage.getByRole("button", { name: "Add sticky note" }).click();
    await expect(
      authedPage
        .getByTestId("whiteboard-canvas")
        .locator('[data-item-type="sticky"]'),
    ).toBeVisible();
  });

  test("persists a renamed whiteboard and sticky across reload", async ({
    authedPage,
  }) => {
    await authedPage.goto("/");
    await authedPage.getByRole("treeitem", { name: /Ideas/ }).click();
    await authedPage
      .getByRole("button", { name: "More create options" })
      .first()
      .click();
    await authedPage.getByRole("menuitem", { name: "New whiteboard" }).click();

    const name = authedPage.getByRole("textbox", { name: "Whiteboard name" });
    await name.fill("Launch plan");
    await name.press("Enter");
    const sceneSaved = authedPage.waitForResponse((response) => {
      const request = response.request();
      return (
        request.method() === "PATCH" &&
        (request.postData() ?? "").includes('"scene"')
      );
    });
    await authedPage.getByRole("button", { name: "Add sticky note" }).click();

    const sticky = authedPage
      .getByTestId("whiteboard-canvas")
      .locator('[data-item-type="sticky"]');
    await expect(sticky).toBeVisible();
    await sceneSaved;
    await authedPage.reload();

    await authedPage.getByRole("treeitem", { name: /Launch plan/ }).click();
    await expect(
      authedPage.getByRole("textbox", { name: "Whiteboard name" }),
    ).toHaveValue("Launch plan");
    await expect(
      authedPage
        .getByTestId("whiteboard-canvas")
        .locator('[data-item-type="sticky"]'),
    ).toBeVisible();
  });
});
