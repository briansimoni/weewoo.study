import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  printfulCatalog,
  seedPrintfulCatalog,
  STUB_UNIMPORTED_PRODUCT_ID,
} from "./printful_catalog.ts";
import seedCatalog from "./seed_catalog.json" with { type: "json" };

Deno.test("printfulCatalog refuses the stub in PROD without a secret", () => {
  assertThrows(() => printfulCatalog("PROD", ""), Error, "PRINTFUL");
  assertThrows(() => printfulCatalog("PROD", ""), Error, "PRINTFUL");
});

Deno.test("printfulCatalog uses the seed stub outside PROD without a secret", async () => {
  for (const stage of ["DEV", "TEST", undefined]) {
    const products = await printfulCatalog(stage, "").listProducts();
    assertEquals(products.length, seedCatalog.products.length + 1);
  }
});

Deno.test("the seed stub lists the seed products plus one to import", async () => {
  const products = await seedPrintfulCatalog().listProducts();
  const ids = products.map((p) => String(p.id));
  for (const product of seedCatalog.products) {
    assert(ids.includes(product.printful_id), product.printful_id);
  }
  assert(ids.includes(STUB_UNIMPORTED_PRODUCT_ID));
});

Deno.test("the seed stub's variants carry the stored variant IDs, sizes and colors", async () => {
  const [first] = seedCatalog.products;
  const { sync_product, sync_variants } = await seedPrintfulCatalog()
    .getProduct(first.printful_id);
  const stored = seedCatalog.variants.filter((v) =>
    v.printful_product_id === first.printful_id
  );
  assertEquals(sync_product.name, first.name);
  assertEquals(sync_product.variants, stored.length);
  assertEquals(sync_variants.length, stored.length);
  const variant = sync_variants[0];
  assertEquals(String(variant.product.variant_id), stored[0].variant_id);
  assertEquals(variant.size, stored[0].size);
  assertEquals(variant.color, stored[0].color?.name ?? "");
  assertEquals(variant.retail_price, stored[0].price.toFixed(2));
});

Deno.test("the seed stub rejects unknown products", async () => {
  await assertRejects(() => seedPrintfulCatalog().getProduct("1"));
});
