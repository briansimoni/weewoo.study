import { assertEquals } from "@std/assert";
import { render } from "preact-render-to-string";
import type { PrintfulProductVariant } from "../../../lib/client/printful.ts";
import type { Product, ProductVariant } from "../../../lib/product_store.ts";
import { undefinedPrintfulColors } from "./ColorDefinitions.tsx";
import {
  colorOptions,
  initialDraft,
  variantFromDraft,
} from "./VariantTable.tsx";
import { ConfirmDialog } from "../../ui/ConfirmDialog.tsx";

function printful(
  overrides: Partial<PrintfulProductVariant> = {},
): PrintfulProductVariant {
  return {
    id: 101,
    retail_price: "29.00",
    currency: "USD",
    size: "M",
    color: "Black",
    name: "Hoodie / Black / M",
    options: [{ id: "color", value: "#000000" }],
    files: [{ type: "preview", preview_url: "https://img/black.png" }],
    ...overrides,
  } as PrintfulProductVariant;
}

const product = {
  printful_id: "377478087",
  product_template_id: "85855720",
  name: "Hoodie",
  colors: [{ name: "black", hex: "#000000", thumbnail_url: "" }],
} as Product;

const stored: ProductVariant = {
  variant_id: "101",
  printful_product_id: "377478087",
  product_template_id: "85855720",
  price: 39.99,
  name: "Night shift",
  images: ["https://a", "https://b"],
  color: { name: "black", hex: "#000000" },
  stripe_product_id: "prod_1",
};

Deno.test("a variant draft starts from the stored price, not Printful's", () => {
  assertEquals(initialDraft(printful(), stored, product.colors), {
    name: "Night shift",
    price: "39.99",
    images: "https://a\nhttps://b",
    color: "black",
  });
  // Unsaved variants start from Printful, with the matching defined color.
  assertEquals(initialDraft(printful(), undefined, product.colors), {
    name: "",
    price: "29.00",
    images: "",
    color: "black",
  });
});

Deno.test("variantFromDraft validates the price and keeps the Stripe ID", () => {
  const draft = initialDraft(printful(), stored, product.colors);
  for (const price of ["", "abc", "0", "-5"]) {
    assertEquals(
      "error" in
        variantFromDraft({ ...draft, price }, printful(), stored, product),
      true,
      price,
    );
  }
  const result = variantFromDraft(
    { ...draft, images: " https://a \n\nhttps://c", name: " Trim me " },
    printful(),
    stored,
    product,
  );
  assertEquals(result, {
    variant: {
      variant_id: "101",
      printful_product_id: "377478087",
      product_template_id: "85855720",
      price: 39.99,
      size: "M",
      name: "Trim me",
      images: ["https://a", "https://c"],
      stripe_product_id: "prod_1",
      color: { name: "black", hex: "#000000" },
    },
  });
  // No color chosen: none saved.
  const plain = variantFromDraft(
    { ...draft, color: "" },
    printful(),
    stored,
    product,
  );
  assertEquals("variant" in plain && plain.variant.color, undefined);
});

Deno.test("undefinedPrintfulColors lists each new Printful color once", () => {
  const variants = [
    printful(),
    printful({ id: 102, size: "L" }),
    printful({
      id: 103,
      color: "Navy",
      options: [{ id: "color", value: "#000080" }],
      files: [],
    }),
  ];
  assertEquals(undefinedPrintfulColors(variants, product.colors!), [
    { name: "Navy", hex: "#000080", thumbnail_url: "" },
  ]);
  assertEquals(undefinedPrintfulColors(variants, []).map((c) => c.name), [
    "Black",
    "Navy",
  ]);
});

Deno.test("ConfirmDialog renders the question and both buttons", () => {
  const html = render(
    <ConfirmDialog
      open={false}
      title="Delete it?"
      confirmLabel="Delete"
      tone="error"
      onConfirm={() => {}}
      onCancel={() => {}}
    >
      Gone for good.
    </ConfirmDialog>,
  );
  assertEquals(html.includes("Delete it?"), true);
  assertEquals(html.includes("Gone for good."), true);
  assertEquals(html.includes('class="btn btn-error"'), true);
  assertEquals(html.includes(">Cancel</button>"), true);
});

Deno.test("variant colors match definitions ignoring case and keep undefined ones", () => {
  const capitalized = { ...stored, color: { name: "Black", hex: "#000000" } };
  // "Black" is the defined "black": selected, and saved as the definition.
  const draft = initialDraft(printful(), capitalized, product.colors);
  assertEquals(draft.color, "black");
  assertEquals(colorOptions(product.colors, capitalized), ["black"]);

  // A stored color with no definition stays selectable and is kept on save.
  const legacy = { ...stored, color: { name: "Glow", hex: "#ABCDEF" } };
  const legacyDraft = initialDraft(printful(), legacy, product.colors);
  assertEquals(legacyDraft.color, "Glow");
  assertEquals(colorOptions(product.colors, legacy), ["black", "Glow"]);
  const saved = variantFromDraft(legacyDraft, printful(), legacy, product);
  assertEquals("variant" in saved && saved.variant.color, {
    name: "Glow",
    hex: "#ABCDEF",
  });
});
