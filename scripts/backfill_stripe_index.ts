// Script to backfill the secondary index for stripe_product_id
import { ProductStore, ProductVariant } from "../lib/product_store.ts";
import "$std/dotenv/load.ts";

async function backfillStripeIndex() {
  console.log("Starting to backfill stripe_product_id secondary index...");

  // Initialize the product store
  const productStore = await ProductStore.make();

  // Get all products
  const products = await productStore.listProducts();
  console.log(`Found ${products.length} products to process`);

  let totalVariants = 0;
  let updatedVariants = 0;
  let skippedVariants = 0;

  // Process each product
  for (const product of products) {
    console.log(`Processing product: ${product.name} (${product.printful_id})`);

    // Get all variants for this product
    const variants = await productStore.listProductVariants(
      product.printful_id,
    );
    totalVariants += variants.length;

    console.log(
      `Found ${variants.length} variants for product ${product.name}`,
    );

    // Process each variant
    for (const variant of variants) {
      // Skip variants without a stripe_product_id (should not happen now that it's required)
      if (!variant.stripe_product_id) {
        console.warn(
          `Variant ${variant.variant_id} has no stripe_product_id, skipping`,
        );
        skippedVariants++;
        continue;
      }

      try {
        // Update the variant to ensure the secondary index is created
        await productStore.updateVariant(variant);
        updatedVariants++;
        console.log(
          `Updated variant ${variant.variant_id} with stripe_product_id ${variant.stripe_product_id}`,
        );
      } catch (error) {
        console.error(`Error updating variant ${variant.variant_id}:`, error);
      }
    }
  }

  console.log("\nBackfill Summary:");
  console.log(`Total variants processed: ${totalVariants}`);
  console.log(`Variants updated: ${updatedVariants}`);
  console.log(`Variants skipped: ${skippedVariants}`);

  // Close the KV connection
  productStore.closeConnection();
  console.log("Backfill completed!");
}

// Run the backfill function
backfillStripeIndex()
  .then(() => {
    console.log("Script completed successfully");
    Deno.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    Deno.exit(1);
  });
