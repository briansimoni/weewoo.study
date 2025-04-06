import { Handlers } from "$fresh/server.ts";
import Stripe from "npm:stripe";
import { z } from "zod";
import { ProductStore, ProductVariant } from "../../lib/product_store.ts";

// Initialize Stripe with your secret key
const stripeAPIKey = Deno.env.get("STRIPE_API_KEY") || "";
const stripe = new Stripe(stripeAPIKey);

// Define Zod schema for request validation
const ProductVariantSchema = z.object({
  variant_id: z.string(),
  printful_product_id: z.string(),
  product_template_id: z.string(),
  price: z.number().positive(),
  color: z.object({
    name: z.string(),
    hex: z.string(),
  }),
  size: z.string(),
  images: z.array(z.string()),
  stripe_product_id: z.string(),
  payment_page: z.string(),
});

const CartItemSchema = z.object({
  variant: ProductVariantSchema,
  quantity: z.number().int().positive(),
});

const CheckoutRequestSchema = z.object({
  cartItems: z.array(CartItemSchema).min(1, {
    message: "Cart cannot be empty",
  }),
});

export const handler: Handlers = {
  async POST(req) {
    try {
      // Parse and validate the request body
      const body = await req.json();
      const result = CheckoutRequestSchema.safeParse(body);

      if (!result.success) {
        return new Response(
          JSON.stringify({
            error: "Invalid request body",
            details: result.error.format(),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const { cartItems } = result.data;

      // Initialize the product store to get verified product data
      const productStore = await ProductStore.make();

      // Verify each variant
      const verifiedLineItems = [];

      for (const item of cartItems) {
        try {
          let verifiedVariant: ProductVariant | null = null;

          if (item.variant.stripe_product_id) {
            // Use the secondary index for direct lookup
            verifiedVariant = await productStore.getVariantByStripeProductId(
              item.variant.stripe_product_id,
            );
          } else {
            // Fallback to the original lookup method
            const variants = await productStore.listProductVariants(
              item.variant.printful_product_id,
            );
            verifiedVariant = variants.find((v) =>
              v.variant_id === item.variant.variant_id
            ) || null;
          }

          if (!verifiedVariant) {
            return new Response(
              JSON.stringify({
                error: "Invalid product variant",
                details: `Variant with ID ${item.variant.variant_id} not found`,
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // Retrieve the Stripe product to get its default price
          const stripeProduct = await stripe.products.retrieve(
            item.variant.stripe_product_id!,
          );

          // Check if default_price exists
          if (!stripeProduct.default_price) {
            throw new Error(
              `Product ${item.variant.printful_product_id} has no default price`,
            );
          }

          // Convert default_price to string if it's not already
          // This handles the type issue with default_price potentially being a Price object or string
          const priceId = typeof stripeProduct.default_price === "string"
            ? stripeProduct.default_price
            : stripeProduct.default_price.id;

          // Use the default price from Stripe
          verifiedLineItems.push({
            price: priceId,
            quantity: item.quantity,
          });
        } catch (error) {
          console.error("Error verifying product variant:", error);
          return new Response(
            JSON.stringify({
              error: "Error verifying product variant",
              details: error instanceof Error ? error.message : "Unknown error",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      // Create a Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: verifiedLineItems,
        mode: "payment",
        shipping_address_collection: {
          allowed_countries: ["US"],
        },
        // Also collect billing address for tax calculations
        billing_address_collection: "required",
        success_url: `${
          req.headers.get("origin") || ""
        }/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("origin") || ""}/cart`,
      });

      // Return the session ID to the client
      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Checkout error:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "An unknown error occurred";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
