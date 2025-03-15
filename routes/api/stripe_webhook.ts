import { AppHandlers } from "../_middleware.ts";
import Stripe from "npm:stripe";

const stripeSigningKey = Deno.env.get("STRIPE_SIGNING_SECRET");

export const handler: AppHandlers = {
  POST: async (req) => {
    if (!stripeSigningKey) {
      throw new Error("STRIPE_SIGNING_SECRET is not set");
    }
    const stripeClient = new Stripe("not-applicable");
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
    if (event.type === "payment_intent.succeeded") {
      console.log("Payment succeeded.");
    }
    return new Response("Hello World!");
  },
};
