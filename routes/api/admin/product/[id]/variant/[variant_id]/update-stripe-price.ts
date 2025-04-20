import { Handlers } from "$fresh/server.ts";
import { ProductStore } from "../../../../../../../lib/product_store.ts";
import Stripe from "npm:stripe";
import "$std/dotenv/load.ts";

export const handler: Handlers = {
  /**
   * Update the Stripe price for a variant that already has a stripe_product_id
   */
  async POST(req, ctx) {
    try {
      const productId = ctx.params.id;
      const variantId = ctx.params.variant_id;

      if (!productId || !variantId) {
        return new Response(
          JSON.stringify({ error: "Product ID and Variant ID are required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Parse the request body to get the new price
      const data = await req.json();
      const newPrice = data.price;

      if (!newPrice || isNaN(Number(newPrice))) {
        return new Response(
          JSON.stringify({ error: "Valid price is required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Get the product store
      const productStore = await ProductStore.make();

      // Get the variant
      const variant = await productStore.getVariant(productId, variantId);
      if (!variant) {
        return new Response(JSON.stringify({ error: "Variant not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check if the variant has a stripe_product_id
      if (!variant.stripe_product_id) {
        return new Response(
          JSON.stringify({
            error: "Variant does not have a Stripe product ID",
            variant,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Get Stripe API key
      const stripeAPIKey = Deno.env.get("STRIPE_API_KEY");
      if (!stripeAPIKey) {
        return new Response(
          JSON.stringify({
            error: "STRIPE_API_KEY environment variable is not set",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Initialize Stripe client
      const stripe = new Stripe(stripeAPIKey);

      // Retrieve the Stripe product to verify it exists
      const _stripeProduct = await stripe.products.retrieve(
        variant.stripe_product_id,
      );

      // Create a new price for the product
      const price = await stripe.prices.create({
        product: variant.stripe_product_id,
        unit_amount: Math.trunc(Number(newPrice) * 100), // Convert to cents
        currency: "usd",
        billing_scheme: "per_unit",
      });

      // Update the default price on the product
      await stripe.products.update(variant.stripe_product_id, {
        default_price: price.id,
      });

      await productStore.updateVariant(variant);

      return new Response(
        JSON.stringify({
          success: true,
          variant,
          message: "Stripe price updated successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error updating Stripe price:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error
            ? error.message
            : "An unknown error occurred",
          details: error instanceof Error ? error.stack : undefined,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
