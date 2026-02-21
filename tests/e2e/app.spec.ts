import { expect, test } from "@playwright/test";

test("renders onboarding and lets user start empty", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Welcome to ArchLens")).toBeVisible();
  await page.getByRole("button", { name: "Start Empty" }).click();
  await expect(page.getByRole("heading", { name: "Conversation" })).toBeVisible();
});
