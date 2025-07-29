import { Handlers } from "$fresh/server.ts";
import { ProductStore } from "../../../../../../lib/product_store.ts";
import { ProductVariant } from "../../../../../../lib/product_store.ts";
import { z } from "zod";
import Stripe from "npm:stripe";
import "$std/dotenv/load.ts";
import { log } from "../../../../../../lib/logger.ts";
import { sortImagesInPlace } from "../../../../../../lib/util.ts";

// Zod schema for ProductVariant
const ProductVariantSchema = z.object({
  variant_id: z.string(),
  printful_product_id: z.string(),
  product_template_id: z.string(),
  price: z.number(),
  color: z.object({
    name: z.string(),
    hex: z.string(),
  }).optional(),
  name: z.string().optional(),
  size: z.string(),
  images: z.array(z.string()),
  stripe_product_id: z.string().optional(),
});

export const handler: Handlers = {
  /**
   * Delete a product variant: deactivate all prices, delete Stripe product, then remove from DB
   */
  async DELETE(_req, ctx) {
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

    // Setup Stripe
    const stripeApiKey = Deno.env.get("STRIPE_API_KEY");
    if (!stripeApiKey) {
      throw new Error("Missing STRIPE_API_KEY variable");
    }
    const stripe = new Stripe(stripeApiKey);

    // Get the variant from DB
    const productStore = await ProductStore.make();
    const variant = await productStore.getVariant(productId, variantId);
    if (!variant) {
      return new Response(
        JSON.stringify({ error: "Variant not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // 1. Deactivate all prices for this Stripe product
    if (variant.stripe_product_id) {
      try {
        const prices = await stripe.prices.list({
          product: variant.stripe_product_id,
          limit: 100,
        });
        for (const price of prices.data) {
          if (price.active) {
            await stripe.prices.update(price.id, { active: false });
          }
        }
      } catch (err) {
        log.error("Failed to deactivate Stripe prices:", { err });
        // Continue even if we can't deactivate prices
      }

      // 2. Archive the Stripe product instead of deleting it
      // This works even with default prices that can't be deleted
      try {
        await stripe.products.update(variant.stripe_product_id, {
          active: false,
        });
      } catch (err) {
        log.error("Failed to archive Stripe product:", { err });
        // Continue even if we can't archive the product
      }
    }

    // 3. Delete the variant from DB
    try {
      // Use the public deleteVariant method
      await productStore.deleteVariant(
        productId,
        variantId,
        variant.stripe_product_id,
      );
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "Failed to delete variant from DB",
          details: String(err),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  },
  /**
   * Update a product variant in the local product store
   */
  async PUT(req, ctx) {
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

      // Parse and validate the request body
      let data;
      try {
        data = ProductVariantSchema.parse(await req.json());
      } catch (err) {
        if (err instanceof z.ZodError) {
          return new Response(
            JSON.stringify({
              error: "Invalid ProductVariant",
              details: err.issues,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        return new Response(
          JSON.stringify({
            error: "Invalid ProductVariant",
            details: String(err),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Get the product store
      const productStore = await ProductStore.make();

      // Check if product exists
      const product = await productStore.getProduct(productId);
      if (!product) {
        return new Response(JSON.stringify({ error: "Product not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check if variant exists
      const existingVariant = await productStore.getVariant(
        productId,
        variantId,
      );
      let isNewVariant = false;

      // Prepare the variant data
      let variantData: ProductVariant;

      if (!existingVariant) {
        // If variant doesn't exist, create a new one
        isNewVariant = true;

        // Validate required fields for new variants
        if (!data.size && !(data.color || data.name)) {
          return new Response(
            JSON.stringify({
              error:
                "size and either color or name is required for new variants",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        // Create a new variant with default values
        variantData = {
          variant_id: variantId,
          printful_product_id: productId,
          product_template_id: product.product_template_id,
          price: data.price || 0,
          color: data.color,
          name: data.name,
          size: data.size,
          images: data.images || [],
          stripe_product_id: data.stripe_product_id,
        };
      } else {
        // Update existing variant
        variantData = {
          ...existingVariant,
          ...data,
          // Ensure these fields are always set correctly
          variant_id: variantId,
          printful_product_id: productId,
          product_template_id: product.product_template_id,
        };
      }

      // Create or update the variant
      sortImagesInPlace(variantData.images);
      if (isNewVariant) {
        await productStore.addVariant(variantData);
      } else {
        await productStore.updateVariant(variantData);
      }

      return new Response(
        JSON.stringify({
          success: true,
          variant: variantData,
          isNewVariant: isNewVariant,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      log.error("Error updating variant:", { error });
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
