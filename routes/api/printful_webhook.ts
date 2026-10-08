import { AppHandlers } from "../_middleware.ts";
import { log } from "../../lib/logger.ts";
import { emailService } from "../../lib/email_service.ts";
import { PrintfulApiClient } from "../../lib/client/printful.ts";
import { handlePrintfulWebhook } from "../../lib/printful_webhook.ts";

export const handler: AppHandlers = {
  POST: (ctx) =>
    handlePrintfulWebhook(ctx.req, {
      log,
      stage: Deno.env.get("STAGE"),
      // Constructed per call: it throws when PRINTFUL_SECRET is unset.
      getOrder: (orderId) => new PrintfulApiClient().getOrder(orderId),
      email: emailService,
    }),
};
