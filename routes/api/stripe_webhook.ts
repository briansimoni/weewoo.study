import Stripe from "stripe";
import { AppHandlers } from "../_middleware.ts";
import { emailService } from "../../lib/email_service.ts";
import { getKv } from "../../lib/kv.ts";
import { log } from "../../lib/logger.ts";
import { handleStripeWebhook } from "../../lib/stripe_webhook.ts";

const stripeAPIKey = Deno.env.get("STRIPE_API_KEY")?.trim();

export const handler: AppHandlers = {
  POST: async (ctx) =>
    handleStripeWebhook(ctx.req, {
      log,
      signingSecret: Deno.env.get("STRIPE_SIGNING_SECRET")?.trim(),
      stripe: stripeAPIKey ? new Stripe(stripeAPIKey) : undefined,
      printfulSecret: Deno.env.get("PRINTFUL_SECRET")?.trim(),
      stage: Deno.env.get("STAGE"),
      printfulDraftOrders: Deno.env.get("PRINTFUL_DRAFT_ORDERS") === "true",
      kv: await getKv(),
      email: emailService,
      adminEmail: Deno.env.get("ADMIN_EMAIL"),
    }),
};
