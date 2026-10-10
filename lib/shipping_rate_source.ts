import { PrintfulApiClient } from "./client/printful.ts";
import { type ShippingRateSource, shippingRateSourceFor } from "./shipping.ts";

/** Printful's shipping rates, or the stub outside PROD without PRINTFUL_SECRET. */
export function shippingRateSource(): ShippingRateSource {
  const printful: ShippingRateSource | undefined =
    Deno.env.get("PRINTFUL_SECRET")?.trim()
      ? async (request) =>
        (await new PrintfulApiClient().getShippingRates(request)).result
      : undefined;
  return shippingRateSourceFor(Deno.env.get("STAGE"), printful);
}
