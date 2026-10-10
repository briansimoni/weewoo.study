import { z } from "zod";
import { Handlers } from "fresh/compat";
import { ProductStore } from "../../lib/product_store.ts";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  quoteShipping,
  type ShippingItem,
} from "../../lib/shipping.ts";
import { shippingRateSource } from "../../lib/shipping_rate_source.ts";
import { log } from "../../lib/logger.ts";

const QuoteRequestSchema = z.object({
  items: z.array(z.object({
    stripe_product_id: z.string(),
    quantity: z.number().int().positive(),
  })).min(1),
});

/**
 * The cart's shipping line. Prices come from the catalog in KV; checkout
 * re-quotes with Stripe's prices, which are what the customer pays.
 */
export const handler: Handlers = {
  async POST(ctx) {
    const parsed = QuoteRequestSchema.safeParse(
      await ctx.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const productStore = await ProductStore.make();
    const items: ShippingItem[] = [];
    let subtotalCents = 0;
    for (const item of parsed.data.items) {
      const variant = await productStore.getVariantByStripeProductId(
        item.stripe_product_id,
      );
      if (!variant) {
        return Response.json({ error: "Unknown product" }, { status: 400 });
      }
      items.push({ variant_id: variant.variant_id, quantity: item.quantity });
      subtotalCents += Math.round(variant.price * 100) * item.quantity;
    }

    try {
      const quote = await quoteShipping(
        items,
        subtotalCents,
        shippingRateSource(),
      );
      return Response.json({
        shippingCents: quote.amountCents,
        free: quote.free,
        freeThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS,
      });
    } catch (error) {
      log.error("Shipping quote failed", { error: String(error) });
      return Response.json({ error: "Couldn't quote shipping" }, {
        status: 502,
      });
    }
  },
};
