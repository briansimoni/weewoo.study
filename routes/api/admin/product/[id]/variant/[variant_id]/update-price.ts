import { Handlers } from "$fresh/server.ts";
import { ProductStore } from "../../../../../../../lib/product_store.ts";
import Stripe from "npm:stripe";
import "$std/dotenv/load.ts";
import { z } from "npm:zod";
import { dollarsToCents } from "../../../../../../../lib/util.ts";

export const handler: Handlers = {
  /**
   * Update the Stripe price for a variant that already has a stripe_product_id
   */
  async POST(req, ctx) {
    try {
      // Validate URL parameters
      const paramsSchema = z.object({
        id: z.string().nonempty("Product ID is required"),
        variant_id: z.string().nonempty("Variant ID is required"),
      });

      // Validate request body
      const bodySchema = z.object({
        price: z.string()
          .nonempty("Price is required")
          .or(z.number().positive("Price must be a positive number"))
          .transform((val) => typeof val === "string" ? Number(val) : val)
          .refine((val) => !isNaN(val), "Price must be a valid number"),
      });

      let productId: string;
      let variantId: string;
      let newPrice: number;

      try {
        // Validate parameters
        const params = paramsSchema.parse(ctx.params);
        productId = params.id;
        variantId = params.variant_id;

        // Parse and validate request body
        const requestData = await req.json();
        const body = bodySchema.parse(requestData);
        newPrice = body.price;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return new Response(
            JSON.stringify({
              error: "Validation error",
              details: error.errors.map((e) => e.message),
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        throw error;
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
        unit_amount: dollarsToCents(newPrice),
        currency: "usd",
        billing_scheme: "per_unit",
      });

      // Update the default price on the product
      await stripe.products.update(variant.stripe_product_id, {
        default_price: price.id,
      });

      await productStore.updateVariant(variant);

      // TODO: sometime in the future I would like to also update the price in Printful
      // the printful API is stupid and variants have both an id and a variant_id. Pointless...
      // However, the update API is expecting you to provide the id and not the variant_id
      // I am not saving the id, only the variant_id so there's a backfilling problem to solve first
      // const printful = new PrintfulApiClient();
      // await printful.updateProductVariant({
      //   id: parseInt(variant.variant_id),
      //   retail_price: newPrice.toFixed(2),
      // });

      return new Response(
        JSON.stringify({
          success: true,
          variant,
          message: "Price updated successfully",
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
