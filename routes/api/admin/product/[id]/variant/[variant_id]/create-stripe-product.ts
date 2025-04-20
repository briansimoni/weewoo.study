import { Handlers } from "$fresh/server.ts";
import { ProductStore } from "../../../../../../../lib/product_store.ts";
import Stripe from "npm:stripe";
import "$std/dotenv/load.ts";

export const handler: Handlers = {
  /**
   * Create a Stripe product for a variant that doesn't have a stripe_product_id
   */
  async POST(_req, ctx) {
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

      // Get the product store
      const productStore = await ProductStore.make();

      // Get the product
      const product = await productStore.getProduct(productId);
      if (!product) {
        return new Response(JSON.stringify({ error: "Product not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get the variant
      const variant = await productStore.getVariant(productId, variantId);
      if (!variant) {
        return new Response(JSON.stringify({ error: "Variant not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check if the variant already has a valid stripe_product_id
      if (variant.stripe_product_id) {
        return new Response(
          JSON.stringify({
            error: "Variant already has a Stripe product ID",
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

      // Create a Stripe product
      const stripeProduct = await stripe.products.create({
        name: `${product.name} ${variant.color.name} ${variant.size}`,
        images: variant.images.slice(0, 8), // Stripe allows up to 8 images
        tax_code: "txcd_30011000", // Standard physical goods
        shippable: true,
      });

      // Create a price for the product
      const price = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.trunc(variant.price * 100), // Convert to cents
        currency: "usd",
        billing_scheme: "per_unit",
      });

      // Set default price on the product
      await stripe.products.update(stripeProduct.id, {
        default_price: price.id,
      });

      // Update the variant with the new Stripe product ID
      const updatedVariant = {
        ...variant,
        stripe_product_id: stripeProduct.id,
      };

      await productStore.updateVariant(updatedVariant);

      return new Response(
        JSON.stringify({
          success: true,
          variant: updatedVariant,
          stripe_product: {
            id: stripeProduct.id,
            name: stripeProduct.name,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error creating Stripe product:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
