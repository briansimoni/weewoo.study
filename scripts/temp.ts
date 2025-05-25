// script to update the price on a single variant

import { PrintfulApiClient } from "../lib/client/printful.ts";
import "$std/dotenv/load.ts";

// The variant ID to update
const variantId = 4750269299;

// Create an instance of the PrintfulApiClient
const printfulClient = new PrintfulApiClient();

async function updateVariantPrice() {
  try {
    console.log(`Updating variant ${variantId}...`);

    // First, get the current variant data
    const currentVariant = await printfulClient.getProductVariant(
      variantId.toString(),
    );
    console.log(
      "Current variant data:",
      JSON.stringify(currentVariant.result, null, 2),
    );

    // Update the variant with new price
    // You can modify other fields as needed
    const updatedVariant = await printfulClient.updateProductVariant({
      id: variantId,
      retail_price: 46.99, // Set your desired price here
    });

    console.log("Update successful!");
    console.log(
      "Updated variant data:",
      JSON.stringify(updatedVariant.result, null, 2),
    );
  } catch (error) {
    console.error("Error updating variant:", error);
  }
}

// Execute the function
updateVariantPrice();
