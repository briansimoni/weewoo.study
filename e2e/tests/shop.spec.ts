import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers.ts";

test("a shopper adds a product to the cart and reaches Stripe test checkout", async ({ page }) => {
  // Local CI runs need the STRIPE_TEST_API_KEY secret; previews have their own key.
  test.skip(
    !!process.env.CI && !process.env.BASE_URL && !process.env.STRIPE_API_KEY,
    "No Stripe test key in this CI run (set the STRIPE_TEST_API_KEY secret)",
  );
  // Never load Stripe itself; we only check the session the app creates.
  await page.route("https://checkout.stripe.com/**", (route) => route.abort());
  // Capture the checkout API response: the page navigates to Stripe as soon
  // as it arrives, after which the body is no longer readable.
  let checkout:
    | { status: number; body: { sessionId?: string; url?: string } }
    | undefined;
  await page.route("**/api/checkout", async (route) => {
    const response = await route.fetch();
    checkout = { status: response.status(), body: await response.json() };
    await route.fulfill({ response });
  });

  await gotoReady(page, "/shop");
  await page.locator('a[href^="/shop/"]').first().click();
  await page.waitForURL(/\/shop\/.+/);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to cart!")).toBeVisible();

  await gotoReady(page, "/cart");
  await page.getByRole("button", { name: "Proceed to Checkout" }).click();
  await expect.poll(() => checkout?.status).toBeDefined();

  expect(checkout!.status, JSON.stringify(checkout!.body)).toBe(200);
  // Test mode only: a live-mode session must never be created by tests.
  expect(checkout!.body.sessionId).toMatch(/^cs_test_/);
  expect(new URL(checkout!.body.url!).host).toBe("checkout.stripe.com");
});
