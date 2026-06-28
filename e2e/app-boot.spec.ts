import { expect, test } from "./fixtures";

test.describe("signed in", () => {
  test("boots into the app shell empty state", async ({ authedPage }) => {
    await authedPage.goto("/");

    // The main empty state renders its primary actions regardless of how the
    // (stubbed) data requests resolve. The sidebar's empty state also offers a
    // "New book" button, so scope to the main section.
    await expect(
      authedPage.locator("section").getByRole("button", { name: "New book" }),
    ).toBeVisible();
    await expect(
      authedPage.getByText(/create your first book to start writing/i),
    ).toBeVisible();
  });
});
