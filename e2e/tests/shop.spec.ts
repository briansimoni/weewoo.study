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
    | {
      status: number;
      body: { sessionId?: string; url?: string; shippingCents?: number };
    }
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
  const shipping = page.getByTestId("shipping-amount");
  await expect(shipping).toHaveText(/^(\$\d+\.\d{2}|Free)$/);
  const shippingText = await shipping.textContent();
  await page.getByRole("button", { name: "Proceed to Checkout" }).click();
  await expect.poll(() => checkout?.status).toBeDefined();

  expect(checkout!.status, JSON.stringify(checkout!.body)).toBe(200);
  // Test mode only: a live-mode session must never be created by tests.
  expect(checkout!.body.sessionId).toMatch(/^cs_test_/);
  expect(new URL(checkout!.body.url!).host).toBe("checkout.stripe.com");
  // The session charges the shipping the cart showed
  const shownCents = shippingText === "Free"
    ? 0
    : Math.round(Number(shippingText!.slice(1)) * 100);
  expect(checkout!.body.shippingCents).toBe(shownCents);
});

test("shipping is quoted per cart and free from $50", async ({ request }) => {
  // Seed catalog: a $39.99 hoodie variant
  const quote = async (quantity: number) => {
    const response = await request.post("/api/shipping_quote", {
      data: { items: [{ stripe_product_id: "prod_RyV6nkK3nukdtx", quantity }] },
    });
    expect(response.status()).toBe(200);
    return await response.json();
  };
  const one = await quote(1);
  expect(one.free).toBe(false);
  expect(one.shippingCents).toBeGreaterThan(0);
  expect(one.freeThresholdCents).toBe(5000);
  const two = await quote(2);
  expect(two).toMatchObject({ free: true, shippingCents: 0 });

  const unknown = await request.post("/api/shipping_quote", {
    data: { items: [{ stripe_product_id: "prod_nope", quantity: 1 }] },
  });
  expect(unknown.status()).toBe(400);
});
