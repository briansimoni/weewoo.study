import { assertEquals } from "@std/assert";
import { type CartItem, cartItemName } from "./cart_store.ts";

const item = (overrides: Partial<CartItem["variant"]> = {}): CartItem => ({
  quantity: 1,
  variant: {
    variant_id: "10779",
    printful_product_id: "377478087",
    product_template_id: "85855720",
    price: 39.99,
    images: [],
    ...overrides,
  },
});

Deno.test("cartItemName uses the catalog's product name", () => {
  assertEquals(
    cartItemName(item(), { "377478087": "Unisex Hoodie" }),
    "Unisex Hoodie",
  );
});

Deno.test("cartItemName falls back to the variant name, never the ID", () => {
  assertEquals(cartItemName(item({ name: "Lavender" }), {}), "Lavender");
  assertEquals(cartItemName(item(), {}), "WeeWoo merch");
});
