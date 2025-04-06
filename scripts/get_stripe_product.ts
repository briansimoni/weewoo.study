// Script to fetch product information from Stripe
import Stripe from "npm:stripe@17.7.0";
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";

// Load environment variables
const env = config();
const stripeApiKey = env.STRIPE_API_KEY || Deno.env.get("STRIPE_API_KEY");

if (!stripeApiKey) {
  console.error("Error: STRIPE_API_KEY is not set in environment variables");
  Deno.exit(1);
}

// Initialize Stripe client
const stripe = new Stripe(stripeApiKey, {
  apiVersion: "2025-02-24.acacia",
});

// Product ID to look up
const productId = "prod_RyV7QvdEEGRbjF";

async function getProductInfo() {
  try {
    console.log(`Fetching product information for: ${productId}`);

    // Get the product
    const product = await stripe.products.retrieve(productId);
    console.log("\nProduct Details:");
    console.log(JSON.stringify(product, null, 2));

    // Get prices associated with this product
    const prices = await stripe.prices.list({
      product: productId,
    });

    console.log("\nAssociated Prices:");
    console.log(JSON.stringify(prices.data, null, 2));

    return { product, prices: prices.data };
  } catch (error) {
    console.error("Error fetching product information:", error);
    throw error;
  }
}

// Execute the function
getProductInfo()
  .then(() => console.log("\nDone!"))
  .catch((error) => {
    console.error("Script failed:", error);
    Deno.exit(1);
  });
