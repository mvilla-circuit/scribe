import { expect, test } from "@playwright/test";

test.describe("signed out", () => {
  test("shows the Google sign-in screen", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scribe" })).toBeVisible();
  });
});
