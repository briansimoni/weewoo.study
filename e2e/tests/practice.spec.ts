import { expect, test } from "@playwright/test";
import { answerCorrectly, loginAs } from "./helpers.ts";

test("a signed-in user answers a question and their streak and stats update", async ({ page }) => {
  // seed|new-user starts with no attempts and no streak.
  await loginAs(page, "seed|new-user", "/emt/practice");
  await expect(page.getByText(/^\[Seed\]/)).toBeVisible();

  await answerCorrectly(page);
  // A correct answer starts (or continues) the streak, shown in the navbar.
  await expect(page.getByTestId("streak-days")).not.toHaveText("0");

  await page.goto("/profile");
  const answered = page.locator(".stat", { hasText: "Questions Answered" })
    .locator(".stat-value");
  await expect(answered).not.toHaveText(/^0\b/);
});

test("the profile of an experienced user shows their stats", async ({ page }) => {
  await loginAs(page, "seed|expert");
  await expect(page.getByRole("heading", { name: "Seed Expert" }))
    .toBeVisible();
  await expect(page.locator(".stat-title", { hasText: /^Accuracy$/ }))
    .toBeVisible();
  await expect(page.getByText(/45 Days 🔥/)).toBeVisible();
});
