/**
 * Create or update the Stripe webhook endpoint for one environment
 * (idempotent). Uses STRIPE_API_KEY, whose mode must match the environment:
 *
 *   deno run -A scripts/setup_stripe_webhooks.ts test [--secret-out <file>]
 *   deno run -A scripts/setup_stripe_webhooks.ts prod [--secret-out <file>]
 *
 * Stripe only reveals an endpoint's signing secret when it is created. A new
 * endpoint's secret is written to --secret-out (never printed); store it as
 * STRIPE_SIGNING_SECRET on the matching Deno Deploy app. To rotate a lost
 * secret, pass --recreate (deletes and recreates the endpoint).
 */
import "@std/dotenv/load";
import Stripe from "stripe";
import { stripeKeyMode } from "../lib/stripe_webhook.ts";

const ENVIRONMENTS = {
  test: { url: "https://test.weewoo.study/api/stripe_webhook", mode: "test" },
  prod: { url: "https://weewoo.study/api/stripe_webhook", mode: "live" },
} as const;

/** Events routes/api/stripe_webhook.ts acts on. */
const EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
];

const secretOutIndex = Deno.args.indexOf("--secret-out");
const args = {
  recreate: Deno.args.includes("--recreate"),
  "secret-out": secretOutIndex >= 0 ? Deno.args[secretOutIndex + 1] : undefined,
};
const name = Deno.args[0] ?? "";
if (!(name in ENVIRONMENTS)) {
  console.error(
    "Usage: setup_stripe_webhooks.ts <test|prod> [--secret-out <file>] [--recreate]",
  );
  Deno.exit(2);
}
const env = ENVIRONMENTS[name as keyof typeof ENVIRONMENTS];

const apiKey = Deno.env.get("STRIPE_API_KEY")?.trim();
const keyMode = stripeKeyMode(apiKey);
if (!apiKey || keyMode !== env.mode) {
  console.error(
    `STRIPE_API_KEY must be a ${env.mode} key for "${name}" (got ${keyMode}).`,
  );
  Deno.exit(1);
}
const stripe = new Stripe(apiKey);

const endpoints: Stripe.WebhookEndpoint[] = [];
for await (const endpoint of stripe.webhookEndpoints.list({ limit: 100 })) {
  endpoints.push(endpoint);
}
console.log(`Existing ${env.mode}-mode endpoints:`);
for (const e of endpoints) {
  console.log(
    `- ${e.id} ${e.status} ${e.url} [${e.enabled_events.join(", ")}]`,
  );
}

let existing = endpoints.find((e) => e.url === env.url);
if (existing && args.recreate) {
  await stripe.webhookEndpoints.del(existing.id);
  console.log(`Deleted ${existing.id} (--recreate).`);
  existing = undefined;
}

if (existing) {
  const updated = await stripe.webhookEndpoints.update(existing.id, {
    enabled_events: EVENTS,
    disabled: false,
  });
  console.log(
    `Up to date: ${updated.id} ${updated.url} [${
      updated.enabled_events.join(", ")
    }]`,
  );
  console.log(
    "Its signing secret is unchanged (Stripe only reveals it on creation).",
  );
} else {
  const created = await stripe.webhookEndpoints.create({
    url: env.url,
    enabled_events: EVENTS,
    description: `weewoo.study ${name} (scripts/setup_stripe_webhooks.ts)`,
  });
  console.log(`Created ${created.id} ${created.url}`);
  if (args["secret-out"]) {
    await Deno.writeTextFile(args["secret-out"], created.secret ?? "");
    console.log(
      `Signing secret written to ${args["secret-out"]}; set it as ` +
        "STRIPE_SIGNING_SECRET on the Deploy app, then delete the file.",
    );
  } else {
    console.log(
      `Signing secret (set as STRIPE_SIGNING_SECRET): ${created.secret}`,
    );
  }
}
