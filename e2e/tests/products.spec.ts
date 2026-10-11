import { expect, type Page, test } from "@playwright/test";
import { loginAs } from "./helpers.ts";
import { readFileSync } from "node:fs";

const seedCatalog = JSON.parse(
  // Specs run from the repository root.
  readFileSync("lib/seed_catalog.json", "utf8"),
) as { products: { printful_id: string }[] };

/**
 * The admin product pages, as the seed admin. Without PRINTFUL_SECRET (CI,
 * local runs) Printful is a stub built from the seed catalog plus one
 * unimported product; previews use the real Printful store. Every test undoes
 * what it changes, so re-runs against a preview stay clean.
 */
const HOODIE = "377478087"; // "Unisex Hoodie" in lib/seed_catalog.json
const STUB_PRODUCT = "[Seed] Unimported Mug";

test.beforeEach(async ({ page }) => {
  await loginAs(page, "seed|admin", "/admin/product-manager");
});

async function openHoodie(page: Page) {
  await page.goto(`/admin/product-manager/product/${HOODIE}`);
  await page.waitForLoadState("networkidle");
}

test("the product list shows the shop's products", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  const shop = page.getByRole("region", { name: /In the shop/ });
  await expect(shop.getByRole("link", { name: /Unisex Hoodie/ }))
    .toBeVisible();
  await expect(page.getByRole("heading", { name: /On Printful/ }))
    .toBeVisible();
});

test("a product shows its summary, colors and variants", async ({ page }) => {
  await openHoodie(page);
  await expect(page.getByRole("heading", { name: "Unisex Hoodie" }))
    .toBeVisible();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
  await expect(page.getByText(/saved to the shop/)).toBeVisible();
  // The variant editor starts from the stored price. Pin the row by its ID:
  // filters on its buttons stop matching once it's in edit mode.
  const testId = await page.locator('[data-testid^="variant-"]').filter({
    hasText: /\$\d+\.\d\d/,
  }).first().getAttribute("data-testid");
  const row = page.getByTestId(testId!);
  const shown = (await row.getByText(/^\$\d+\.\d\d$/).textContent())!;
  await row.getByRole("button", { name: /^Edit / }).click();
  await expect(row.getByLabel("Price")).toHaveValue(shown.slice(1));
  // Its color is selected, even when the stored name differs in case.
  await expect(row.getByLabel("Color")).not.toHaveValue("");
  await row.getByRole("button", { name: "Cancel" }).click();
  await expect(row.getByLabel("Price")).toHaveCount(0);
});

test("deactivating asks first, and activating restores it", async ({ page }) => {
  // Other specs run in parallel and expect the hoodie in the shop, so answer
  // the toggle here instead of really hiding it (the endpoint is unchanged).
  const hoodie = seedCatalog.products.find((p) => p.printful_id === HOODIE)!;
  let active = true;
  await page.route(`**/api/admin/product/${HOODIE}/toggle-active`, (route) => {
    active = !active;
    return route.fulfill({
      json: { success: true, product: { ...hoodie, active } },
    });
  });
  await openHoodie(page);
  await page.getByRole("button", { name: "Deactivate", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: /Hide Unisex Hoodie/ });
  await dialog.getByRole("button", { name: "Deactivate", exact: true }).click();
  await expect(page.getByText("Inactive", { exact: true })).toBeVisible();
  await expect(page.getByText(/hidden from the shop/)).toBeVisible();
  // Wait out the dialog's closing fade before using the page again.
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Activate", exact: true }).click();
  await page.getByRole("dialog", { name: /Put Unisex Hoodie/ })
    .getByRole("button", { name: "Activate", exact: true }).click();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
});

test("a color edits in a dialog and saves", async ({ page }) => {
  await openHoodie(page);
  await page.getByRole("button", { name: "Edit black", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit black" });
  await dialog.getByLabel("Hex").fill("nope");
  await expect(dialog.getByText(/Use #RGB or #RRGGBB/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Save color" }))
    .toBeDisabled();
  await dialog.getByLabel("Hex").fill("#000000");
  await dialog.getByRole("button", { name: "Save color" }).click();
  await expect(page.getByText("Colors saved.")).toBeVisible();
  await expect(dialog).toBeHidden();
});

test("the JSON editor won't save invalid JSON", async ({ page }) => {
  await openHoodie(page);
  await page.getByRole("button", { name: "Edit JSON" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit product JSON" });
  const editor = dialog.getByRole("textbox", { name: "Product JSON" });
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("oops");
  await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

test("deleting a product asks first", async ({ page }) => {
  await openHoodie(page);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Delete Unisex Hoodie?" });
  await expect(dialog.getByText("stays in Printful")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

test("an admin imports a Printful product and deletes it again", async ({ page }) => {
  const review = page.getByRole("link", { name: `Review ${STUB_PRODUCT}` });
  test.skip(
    (await review.count()) === 0,
    "Only the Printful stub (no PRINTFUL_SECRET) has the unimported product",
  );
  await review.click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Not imported")).toBeVisible();
  await page.getByRole("button", { name: "Import into the shop" }).click();
  await expect(page.getByText(/^Imported /)).toBeVisible();
  await expect(page.getByText("Inactive", { exact: true })).toBeVisible();
  await expect(page.getByText(/no Product Template ID/)).toBeVisible();

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog", { name: `Delete ${STUB_PRODUCT}?` })
    .getByRole("button", { name: "Delete product" }).click();
  await page.waitForURL(/\/admin\/product-manager\?deleted=/);
  await expect(page.getByText(`Deleted ${STUB_PRODUCT}.`)).toBeVisible();
  await expect(page.getByRole("link", { name: `Review ${STUB_PRODUCT}` }))
    .toBeVisible();
});
