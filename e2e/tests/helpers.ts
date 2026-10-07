import { expect, type Page } from "@playwright/test";

/**
 * Sign in as a seed user through the test-only login (/auth/test-login), which
 * exists only when STAGE is DEV or TEST and only for seed users.
 */
export async function loginAs(page: Page, userId: string, next = "/profile") {
  await page.goto(`/auth/test-login?next=${encodeURIComponent(next)}`);
  await page.getByTestId(`login-${userId}`).click();
  await page.waitForURL((url) => url.pathname === next);
  await page.waitForLoadState("networkidle");
}

/** Answer the current seed question correctly (seed questions label it). */
export async function answerCorrectly(page: Page) {
  await page.getByText(/^Correct answer for /).click();
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("heading", { name: "✅ Correct!" }))
    .toBeVisible();
}

/**
 * Navigate and wait until islands have loaded. Clicking before hydration does
 * nothing (or submits forms natively), which shows up on slower deployments.
 */
export async function gotoReady(page: Page, url: string) {
  const response = await page.goto(url);
  await page.waitForLoadState("networkidle");
  return response;
}
