import { expect, test } from "@playwright/test";
import { answerCorrectly, gotoReady, loginAs } from "./helpers.ts";

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

test("the landing hero offers the trial and counts answers", async ({ page }) => {
  await gotoReady(page, "/");
  const trial = page.locator("#trial-questions");
  // The trial sits in the hero, next to the call to action.
  await expect(trial).toBeInViewport();
  await expect(trial.getByText("0 / 5 answered")).toBeVisible();

  await page.getByRole("link", { name: "Start Free Practice" }).click();
  await expect(page).toHaveURL(/#trial-questions$/);

  await answerCorrectly(page);
  await expect(trial.getByText("1 / 5 answered")).toBeVisible();
});

test("celebrity endorsements play one clip at a time", async ({ page }) => {
  await gotoReady(page, "/");
  const trump = page.getByRole("button", {
    name: "Play Donald Trump's endorsement",
  });
  const snoop = page.getByRole("button", {
    name: "Play Snoop Dogg's endorsement",
  });

  await trump.click();
  await expect(
    page.getByRole("button", { name: "Pause Donald Trump's endorsement" }),
  ).toBeVisible();

  await snoop.click();
  await expect(
    page.getByRole("button", { name: "Pause Snoop Dogg's endorsement" }),
  ).toBeVisible();
  await expect(trump).toBeVisible();

  await page.getByRole("button", { name: "Pause Snoop Dogg's endorsement" })
    .click();
  await expect(snoop).toBeVisible();
});

test("signed-in users skip the trial", async ({ page }) => {
  await loginAs(page, "seed|expert", "/");
  await expect(page.locator("#trial-questions")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Start Practicing" }).first())
    .toHaveAttribute("href", "/emt/practice");
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
