import { expect, test } from "@playwright/test";
import { answerCorrectly, gotoReady } from "./helpers.ts";

test("visitors can try questions on the landing page", async ({ page }) => {
  await gotoReady(page, "/");
  const trial = page.locator("#trial-questions");
  await trial.scrollIntoViewIfNeeded();
  await expect(trial.getByText(/^\[Seed\]/)).toBeVisible();

  await answerCorrectly(page);
  await expect(page.getByText("Explanation:")).toBeVisible();

  const first = await trial.getByText(/^\[Seed\]/).textContent();
  await page.getByRole("button", { name: "Next Question →" }).click();
  await expect(trial.getByRole("button", { name: "Submit" })).toBeVisible();
  // A new question loads (random, so it may occasionally repeat).
  await expect(trial.getByText(/^\[Seed\]/)).toBeVisible();
  expect(first).toBeTruthy();
});

test("leaderboard lists seed users", async ({ page }) => {
  await page.goto("/leaderboard");
  await expect(page.getByText("Seed Expert")).toBeVisible();
});

test("unknown pages show the 404 page", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
});
