/**
 * Regenerate lib/seed_catalog.json from a KV backup of the TEST database
 * (test.weewoo.study, admin → database → export).
 *
 *   deno run --allow-read --allow-write scripts/export_seed_catalog.ts <TEST-kv-backup.json>
 *
 * Only catalog records are copied (products and variants). Their Stripe product
 * IDs are test-mode products and their Printful IDs are the real store's, so
 * seeded previews can check out with Stripe test cards. Never export from the
 * production backup: its Stripe IDs are live-mode products.
 */
import type { Product, ProductVariant } from "../lib/product_store.ts";

const MAX_IMAGES_PER_VARIANT = 3;
const OUT = new URL("../lib/seed_catalog.json", import.meta.url);

const source = Deno.args[0];
if (!source) {
  console.error("usage: export_seed_catalog.ts <TEST-kv-backup.json>");
  Deno.exit(2);
}
if (!/TEST/i.test(source)) {
  console.error(
    "Refusing: the file name doesn't contain TEST. Export from the test database backup only.",
  );
  Deno.exit(2);
}

type Entry = { key: Deno.KvKey; value: unknown };
const blob = JSON.parse(await Deno.readTextFile(source));
const entries: Entry[] = blob.entries ?? blob;

const products = entries
  .filter((e) => e.key[0] === "products")
  .map((e) => e.value as Product)
  .sort((a, b) => a.printful_id.localeCompare(b.printful_id));

const variants = entries
  .filter((e) => e.key[0] === "variants")
  .map((e) => {
    // Drop legacy fields (e.g. payment_page from Stripe payment links).
    const v = e.value as ProductVariant & Record<string, unknown>;
    const variant: ProductVariant = {
      variant_id: v.variant_id,
      printful_product_id: v.printful_product_id,
      product_template_id: v.product_template_id,
      price: v.price,
      color: v.color,
      size: v.size,
      name: v.name,
      description: v.description,
      images: (v.images ?? []).slice(0, MAX_IMAGES_PER_VARIANT),
      stripe_product_id: v.stripe_product_id,
    };
    return variant;
  })
  .sort((a, b) =>
    a.printful_product_id.localeCompare(b.printful_product_id) ||
    a.variant_id.localeCompare(b.variant_id)
  );

await Deno.writeTextFile(
  OUT,
  JSON.stringify({ products, variants }, null, 2) + "\n",
);
console.log(
  `Wrote ${OUT.pathname}: ${products.length} products, ${variants.length} variants`,
);
