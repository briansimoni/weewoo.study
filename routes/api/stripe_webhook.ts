import { AppHandlers } from "../_middleware.ts";
import Stripe from "npm:stripe";

const stripeSigningKey = Deno.env.get("STRIPE_SIGNING_SECRET");
const stripeAPIKey = Deno.env.get("STRIPE_API_KEY");

export const handler: AppHandlers = {
  POST: async (req) => {
    if (!stripeSigningKey) {
      throw new Error("STRIPE_SIGNING_SECRET is not set");
    }
    if (!stripeAPIKey) {
      throw new Error("STRIPE_API_KEY is not set");
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
    console.log("-------------------------");
    console.log(event);
    if (event.type === "checkout.session.completed") {
      const session = await stripeClient.checkout.sessions.retrieve(
        event.data.object.id,
      );
      // session.collected_information?.shipping_details

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
      lineItems.forEach((item) => {
        console.log(item);
      });
    }
    return new Response("Hello World!");
  },
};
