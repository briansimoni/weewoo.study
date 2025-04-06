import { ProductStore, ProductVariant } from "../../lib/product_store.ts";
import { AppHandlers } from "../_middleware.ts";
import Stripe from "npm:stripe";

const stripeSigningKey = Deno.env.get("STRIPE_SIGNING_SECRET");
const stripeAPIKey = Deno.env.get("STRIPE_API_KEY");
const printfulSecret = Deno.env.get("PRINTFUL_SECRET");

export const handler: AppHandlers = {
  POST: async (req) => {
    if (!stripeSigningKey) {
      throw new Error("STRIPE_SIGNING_SECRET is not set");
    }
    if (!stripeAPIKey) {
      throw new Error("STRIPE_API_KEY is not set");
    }
    if (!printfulSecret) {
      throw new Error("PRINTFUL_SECRET is not set");
    }
    const stripeClient = new Stripe(stripeAPIKey);
    if (req.body === null) {
      throw new Error("Request body is null");
    }
    const body = await req.text();
    const event = await stripeClient.webhooks.constructEventAsync(
      body,
      req.headers.get("stripe-signature") ?? "",
      stripeSigningKey,
    );
    console.log(event);
    if (event.type === "checkout.session.completed") {
      const session = await stripeClient.checkout.sessions.retrieve(
        event.data.object.id,
      );

      const lineItems = [];
      let lineItemsPage = await stripeClient.checkout.sessions.listLineItems(
        session.id,
      );
      lineItems.push(...lineItemsPage.data);
      while (lineItemsPage.has_more && lineItems[lineItems.length - 1].id) {
        lineItemsPage = await stripeClient.checkout.sessions.listLineItems(
          session.id,
          { starting_after: lineItemsPage.data.pop()?.id },
        );
        lineItems.push(...lineItemsPage.data);
      }

      // Initialize product store once for all items
      const productStore = await ProductStore.make();

      console.log(
        `Processing ${lineItems.length} items from checkout session ${session.id}`,
      );

      // Collect all items for a single order
      const orderItems: Array<{ variant: ProductVariant; quantity: number }> =
        [];

      for (const item of lineItems) {
        console.log(`Processing line item: ${JSON.stringify(item)}`);

        // Find the variant using the stripe_product_id
        let foundVariant: ProductVariant | null = null;

        // Use the new secondary index to efficiently look up the variant by stripe_product_id
        if (item.price?.product) {
          // Convert the product ID to string to handle Stripe's typing
          const stripeProductId = typeof item.price.product === "string"
            ? item.price.product
            : item.price.product.id || item.price.product.toString();

          foundVariant = await productStore.getVariantByStripeProductId(
            stripeProductId,
          );
        }

        if (!foundVariant) {
          console.error(
            `Could not find matching variant for item: ${JSON.stringify(item)}`,
          );
          continue; // Skip this item but continue processing others
        }

        // Add this item to our order items collection
        orderItems.push({
          variant: foundVariant,
          quantity: item.quantity || 1,
        });
      }

      // If we found any valid items, submit a single order to Printful
      if (orderItems.length > 0) {
        await submitOrder(
          orderItems,
          session.collected_information?.shipping_details!,
          session.customer_details?.email || undefined,
        );
      } else {
        console.error("No valid items found in checkout session");
      }
    }
    // all good! tell stripe that we successfully processed the webhook
    return new Response();
  },
};

async function submitOrder(
  orderItems: Array<{ variant: ProductVariant; quantity: number }>,
  shippingDetails: Stripe.Checkout.Session.CollectedInformation.ShippingDetails,
  customerEmail?: string,
) {
  // Map the order items to the format expected by Printful
  const printfulItems = orderItems.map((item) => ({
    "variant_id": item.variant.variant_id,
    "quantity": item.quantity,
    "product_template_id": item.variant.product_template_id,
  }));

  console.log(
    `Submitting order to Printful with ${printfulItems.length} items`,
  );

  const response = await fetch("https://api.printful.com/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Authorization": `Bearer ${printfulSecret}`,
    },
    body: JSON.stringify({
      "recipient": {
        "name": shippingDetails.name,
        "address1": shippingDetails.address?.line1,
        "city": shippingDetails.address?.line2,
        "state_code": shippingDetails.address?.state,
        "zip": shippingDetails.address?.postal_code,
        "email": customerEmail,
        "country_code": shippingDetails.address?.country,
      },
      "items": printfulItems,
    }),
  });

  const result = await response.json();
  console.log("Printful order response:", JSON.stringify(result));

  if (!response.ok) {
    console.error("Error submitting order to Printful:", result);
    throw new Error(`Printful order failed: ${JSON.stringify(result)}`);
  }

  return result;
}
