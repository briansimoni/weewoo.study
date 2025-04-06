// Script to verify that all product variants have a valid stripe_product_id
import { ProductStore } from "../lib/product_store.ts";
import Stripe from "npm:stripe";
import "$std/dotenv/load.ts";

async function verifyStripeProducts() {
  console.log("Starting verification of stripe_product_id for all variants...");

  // Get Stripe API key
  const stripeAPIKey = Deno.env.get("STRIPE_API_KEY");
  if (!stripeAPIKey) {
    console.error("STRIPE_API_KEY environment variable is not set");
    Deno.exit(1);
  }

  // Initialize Stripe client
  const stripe = new Stripe(stripeAPIKey);

  // Initialize the product store
  const productStore = await ProductStore.make();

  // Get all products
  const products = await productStore.listProducts();
  console.log(`Found ${products.length} products to verify`);

  let totalVariants = 0;
  let validVariants = 0;
  let invalidVariants = 0;
  let missingStripeProducts = 0;

  // Process each product
  for (const product of products) {
    console.log(
      `\nVerifying product: ${product.name} (${product.printful_id})`,
    );

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
      console.log(
        `\nChecking variant ${variant.variant_id} (${variant.color.name} ${variant.size})`,
      );

      // Check if stripe_product_id exists
      if (!variant.stripe_product_id) {
        console.error(
          `❌ Variant ${variant.variant_id} has no stripe_product_id`,
        );
        invalidVariants++;
        continue;
      }

      // Verify that the stripe_product_id exists in Stripe
      try {
        const stripeProduct = await stripe.products.retrieve(
          variant.stripe_product_id,
        );
        console.log(
          `✅ Verified Stripe product: ${stripeProduct.name} (${stripeProduct.id})`,
        );

        // Check if the variant can be found using the secondary index
        const indexedVariant = await productStore.getVariantByStripeProductId(
          variant.stripe_product_id,
        );
        if (indexedVariant) {
          console.log(`✅ Variant found in secondary index`);
          validVariants++;
        } else {
          console.warn(
            `⚠️ Variant not found in secondary index, needs backfill`,
          );
          invalidVariants++;
        }
      } catch (error) {
        console.error(
          `❌ Error retrieving Stripe product ${variant.stripe_product_id}:`,
          error.message,
        );
        missingStripeProducts++;
        invalidVariants++;
      }
    }
  }

  console.log("\n=== Verification Summary ===");
  console.log(`Total variants: ${totalVariants}`);
  console.log(`Valid variants: ${validVariants}`);
  console.log(`Invalid variants: ${invalidVariants}`);
  console.log(`Missing Stripe products: ${missingStripeProducts}`);

  // Close the KV connection
  productStore.closeConnection();

  if (invalidVariants > 0) {
    console.log(
      "\n⚠️ Some variants need attention. Run the backfill_stripe_index.ts script to fix secondary index issues.",
    );
  } else {
    console.log(
      "\n✅ All variants have valid stripe_product_id and are properly indexed!",
    );
  }
}

// Run the verification function
verifyStripeProducts()
  .then(() => {
    console.log("Verification completed");
    Deno.exit(0);
  })
  .catch((error) => {
    console.error("Verification failed:", error);
    Deno.exit(1);
  });
