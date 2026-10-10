import { expect, test } from "@playwright/test";
import { answerCorrectly, gotoReady, loginAs } from "./helpers.ts";

test("a signed-in user answers a question and their streak and stats update", async ({ page }) => {
  // seed|new-user starts with no attempts and no streak.
  await loginAs(page, "seed|new-user", "/emt/practice");
  await expect(page.getByText(/^\[Seed\]/)).toBeVisible();

  await answerCorrectly(page);
  // A correct answer starts (or continues) the streak, shown in the navbar.
  await expect(page.getByTestId("streak-days")).not.toHaveText("0");

  await gotoReady(page, "/profile");
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

test("question feedback opens a dialog that needs a reason and closes on Escape", async ({ page }) => {
  await loginAs(page, "seed|new-user", "/emt/practice");
  await answerCorrectly(page);

  await page.getByRole("button", { name: "Thumbs down" }).click();
  const dialog = page.getByRole("dialog", {
    name: "What issues did you find with this question?",
  });
  await expect(dialog).toBeVisible();
  const submit = dialog.getByRole("button", { name: "Submit" });
  await expect(submit).toBeDisabled();
  await dialog.getByRole("textbox", { name: "Feedback" }).fill("Typo");
  await expect(submit).toBeEnabled();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  // The rating buttons stay usable: nothing was submitted.
  await expect(page.getByRole("button", { name: "Thumbs down" })).toBeEnabled();
});
