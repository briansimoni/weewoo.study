/**
 * Resend a TEST-mode Stripe event to one webhook endpoint, like
 * `stripe events resend --webhook-endpoint`, without the Stripe CLI:
 *
 *   deno run -A scripts/resend_stripe_event.ts <evt_… | cs_test_…> [--endpoint we_…]
 *
 * A checkout session ID resends its checkout.session.completed event. The
 * endpoint defaults to test.weewoo.study's. Uses STRIPE_API_KEY (test mode
 * only). Handy for exercising test.weewoo.study's webhook without another
 * purchase; the handler skips events it has already processed.
 */
import "@std/dotenv/load";
import Stripe from "stripe";
import { stripeKeyMode } from "../lib/stripe_webhook.ts";

const DEFAULT_ENDPOINT_URL = "https://test.weewoo.study/api/stripe_webhook";

const target = Deno.args[0] ?? "";
const endpointIndex = Deno.args.indexOf("--endpoint");
let endpointId = endpointIndex >= 0 ? Deno.args[endpointIndex + 1] : undefined;
if (!/^(evt_|cs_test_)/.test(target)) {
  console.error(
    "Usage: resend_stripe_event.ts <evt_… | cs_test_…> [--endpoint we_…]",
  );
  Deno.exit(2);
}

const apiKey = Deno.env.get("STRIPE_API_KEY")?.trim();
if (stripeKeyMode(apiKey) !== "test") {
  console.error("STRIPE_API_KEY must be a test-mode key.");
  Deno.exit(1);
}
const stripe = new Stripe(apiKey!);

let eventId = target;
if (target.startsWith("cs_")) {
  const events = stripe.events.list({
    type: "checkout.session.completed",
    limit: 100,
  });
  for await (const event of events) {
    if ((event.data.object as { id?: string }).id === target) {
      eventId = event.id;
      break;
    }
  }
  if (eventId === target) {
    console.error(`No checkout.session.completed event for ${target}.`);
    Deno.exit(1);
  }
}

if (!endpointId) {
  for await (const endpoint of stripe.webhookEndpoints.list({ limit: 100 })) {
    if (endpoint.url === DEFAULT_ENDPOINT_URL) endpointId = endpoint.id;
  }
  if (!endpointId) {
    console.error(`No endpoint for ${DEFAULT_ENDPOINT_URL}; pass --endpoint.`);
    Deno.exit(1);
  }
}

// Not in the SDK's typed API; it's the call the Stripe CLI makes.
await stripe.rawRequest("POST", `/v1/events/${eventId}/retry`, {
  webhook_endpoint: endpointId,
});
console.log(`Resent ${eventId} to ${endpointId}.`);
