import { expect, type Locator, type Page, test } from "@playwright/test";
import { gotoReady, loginAs } from "./helpers.ts";

/**
 * Visual snapshots of key pages at mobile and desktop widths.
 *
 * Baselines are Linux-only (font rendering differs by OS) and are generated in
 * CI by the "Update visual snapshots" workflow; see README.md, "Visual
 * snapshots". Locally on
 * Windows/macOS, and against deployments (BASE_URL), these tests are skipped.
 */
test.skip(
  process.platform !== "linux" || !!process.env.BASE_URL,
  "Visual baselines are Linux-only and run against the local seeded build",
);

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1280, height: 800 },
} as const;

/** Served for GET /api/question so the question card never changes. */
const FIXED_QUESTION = {
  id: "visual-snapshot-question",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  question:
    "[Seed] A 54-year-old man has crushing chest pain radiating to his left arm. What should you do first?",
  choices: [
    "Give high-flow oxygen regardless of saturation",
    "Assess the airway, breathing and circulation",
    "Have him walk to the ambulance",
    "Give him something to eat",
  ],
  explanation: "Always start with the primary assessment.",
  category: "Cardiology",
  scope: "emt",
  timestamp_started: "2026-01-01T00:00:00.000Z",
};

/** A grey square standing in for remote product images. */
const PLACEHOLDER_IMAGE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#c8c8c8"/></svg>';

/** Make the page deterministic: no third parties, fixed question and images. */
async function stabilize(page: Page, baseURL: string) {
  await page.route(
    (url) => url.origin !== new URL(baseURL).origin,
    (route) =>
      route.request().resourceType() === "image"
        ? route.fulfill({
          contentType: "image/svg+xml",
          body: PLACEHOLDER_IMAGE,
        })
        : route.abort(),
  );
  await page.route(
    "**/api/question",
    (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ json: FIXED_QUESTION })
        : route.fallback(),
  );
}

async function snapshot(
  page: Page,
  name: string,
  options: { mask?: (page: Page) => Locator[] } = {},
) {
  for (const [viewport, size] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize(size);
    // Let layout settle after the resize (responsive images, sticky nav).
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(`${name}-${viewport}.png`, {
      fullPage: true,
      mask: options.mask?.(page),
      maxDiffPixelRatio: 0.01,
    });
  }
}

const PUBLIC_PAGES = [
  ["landing", "/"],
  ["about", "/about"],
  ["leaderboard", "/leaderboard"],
  ["shop", "/shop"],
  ["support", "/support"],
  ["not-found", "/this-page-does-not-exist"],
] as const;

for (const [name, path] of PUBLIC_PAGES) {
  test(`visual: ${name}`, async ({ page, baseURL }) => {
    await stabilize(page, baseURL!);
    await gotoReady(page, path);
    await snapshot(page, name);
  });
}

test("visual: product and cart", async ({ page, baseURL }) => {
  await stabilize(page, baseURL!);
  await gotoReady(page, "/shop");
  await page.locator('a[href^="/shop/"]').first().click();
  await page.waitForURL(/\/shop\/.+/);
  await page.waitForLoadState("networkidle");
  await snapshot(page, "product");

  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to cart!")).toBeVisible();
  await gotoReady(page, "/cart");
  await snapshot(page, "cart");
});

test("visual: profile", async ({ page, baseURL }) => {
  await stabilize(page, baseURL!);
  await loginAs(page, "seed|expert");
  await snapshot(page, "profile", {
    // The streak countdown ticks and the chart's axis is dated.
    mask: (p) => [p.locator(".countdown"), p.locator("canvas")],
  });
});

test("visual: practice", async ({ page, baseURL }) => {
  await stabilize(page, baseURL!);
  await loginAs(page, "seed|expert", "/emt/practice");
  await expect(page.getByText(FIXED_QUESTION.question)).toBeVisible();
  await snapshot(page, "practice");
});
