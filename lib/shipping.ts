// Types only: importing the Stripe SDK reads env vars at load time, which unit
// tests don't allow (see stripe_webhook.ts).
import type Stripe from "stripe";
import type {
  PrintfulShippingRate,
  PrintfulShippingRatesRequest,
} from "./client/printful.ts";

/** Standard shipping is free when the merchandise subtotal reaches this. */
export const FREE_SHIPPING_THRESHOLD_CENTS = 50_00;

/** The Printful method we sell; orders default to it when `shipping` is unset. */
export const SHIPPING_METHOD = "STANDARD";

/**
 * Printful's US rates depend on the items, not the address: the same carts
 * quoted identically to CA, NY, TX, FL, AK and HI (checked 2026-10-10). So the
 * checkout quotes against one fixed address before the customer enters theirs,
 * and the Stripe webhook warns if Printful's order ever charges a different
 * shipping cost (`shippingCostMismatch`).
 */
export const QUOTE_RECIPIENT = {
  country_code: "US",
  state_code: "CA",
  zip: "94103",
} as const;

export type ShippingItem = { variant_id: string; quantity: number };

/** PrintfulApiClient.getShippingRates, or `stubShippingRates` without Printful. */
export type ShippingRateSource = (
  request: PrintfulShippingRatesRequest,
) => Promise<PrintfulShippingRate[]>;

export interface ShippingQuote {
  /** What the customer pays. */
  amountCents: number;
  /** What Printful charges us. */
  printfulCents: number;
  free: boolean;
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
}

/**
 * The rate source for this environment: Printful when PRINTFUL_SECRET is set,
 * otherwise a stub (CI and secret-less local runs). PROD must use Printful.
 */
export function shippingRateSourceFor(
  stage: string | undefined,
  printful: ShippingRateSource | undefined,
): ShippingRateSource {
  if (printful) return printful;
  if (stage === "PROD") {
    throw new Error("PRINTFUL_SECRET is not set; can't quote shipping");
  }
  return stubShippingRates;
}

/** Roughly Printful's tee pricing: $4.95, plus $2.20 per extra item. */
export const stubShippingRates: ShippingRateSource = (request) => {
  const quantity = request.items.reduce((sum, item) => sum + item.quantity, 0);
  const cents = 495 + 220 * Math.max(0, quantity - 1);
  return Promise.resolve([{
    id: SHIPPING_METHOD,
    name: "Flat Rate (stub, no PRINTFUL_SECRET)",
    rate: (cents / 100).toFixed(2),
    currency: "USD",
    minDeliveryDays: 4,
    maxDeliveryDays: 6,
  }]);
};

export async function quoteShipping(
  items: ShippingItem[],
  subtotalCents: number,
  getRates: ShippingRateSource,
): Promise<ShippingQuote> {
  const rates = await getRates({
    recipient: QUOTE_RECIPIENT,
    items: items.map(({ variant_id, quantity }) => ({ variant_id, quantity })),
    currency: "USD",
  });
  const rate = rates.find((r) => r.id === SHIPPING_METHOD);
  if (!rate) {
    throw new Error(
      `Printful offered no ${SHIPPING_METHOD} shipping (got ${
        rates.map((r) => r.id).join(", ") || "none"
      })`,
    );
  }
  if (rate.currency !== "USD") {
    throw new Error(`Printful quoted shipping in ${rate.currency}, not USD`);
  }
  const printfulCents = toCents(rate.rate);
  const free = subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  return {
    amountCents: free ? 0 : printfulCents,
    printfulCents,
    free,
    minDeliveryDays: rate.minDeliveryDays,
    maxDeliveryDays: rate.maxDeliveryDays,
  };
}

/** The Checkout Session's single shipping option for a quote. */
export function stripeShippingOption(
  quote: ShippingQuote,
): NonNullable<
  Stripe.Checkout.SessionCreateParams["shipping_options"]
>[number] {
  const { minDeliveryDays: min, maxDeliveryDays: max } = quote;
  return {
    shipping_rate_data: {
      type: "fixed_amount",
      display_name: quote.free ? "Free standard shipping" : "Standard shipping",
      fixed_amount: { amount: quote.amountCents, currency: "usd" },
      ...(min && max
        ? {
          delivery_estimate: {
            minimum: { unit: "business_day", value: min },
            maximum: { unit: "business_day", value: max },
          },
        }
        : {}),
    },
  };
}

/** Checkout Session metadata key holding `printfulCents` of the quote. */
export const QUOTED_PRINTFUL_SHIPPING_KEY = "printful_shipping_cents";

/**
 * A warning when Printful's order charges a different shipping cost than the
 * checkout quoted, e.g. if Printful starts pricing US shipping by address.
 */
export function shippingCostMismatch(
  quotedCents: string | undefined,
  printfulShipping: string | undefined,
): string | undefined {
  if (quotedCents === undefined || printfulShipping === undefined) return;
  const charged = toCents(printfulShipping);
  if (Number(quotedCents) === charged) return;
  return `Printful charged ${charged} cents for shipping; checkout quoted ${quotedCents}`;
}

function toCents(amount: string): number {
  const cents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(cents) || cents < 0) {
    throw new Error(`Invalid shipping amount: ${amount}`);
  }
  return cents;
}
