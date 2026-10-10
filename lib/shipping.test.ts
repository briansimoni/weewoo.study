import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import type { PrintfulShippingRatesRequest } from "./client/printful.ts";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  QUOTE_RECIPIENT,
  quoteShipping,
  shippingCostMismatch,
  type ShippingRateSource,
  shippingRateSourceFor,
  stripeShippingOption,
  stubShippingRates,
} from "./shipping.ts";

function printfulRates(
  rates: Array<{ id: string; rate: string; currency?: string }>,
) {
  const requests: PrintfulShippingRatesRequest[] = [];
  const source: ShippingRateSource = (request) => {
    requests.push(request);
    return Promise.resolve(rates.map((r) => ({
      name: r.id,
      currency: "USD",
      minDeliveryDays: 4,
      maxDeliveryDays: 6,
      ...r,
    })));
  };
  return { source, requests };
}

const items = [{ variant_id: "12634", quantity: 2 }];

Deno.test("quoteShipping charges Printful's STANDARD rate under $50", async () => {
  const { source, requests } = printfulRates([
    { id: "STANDARD_CARBON_OFFSET", rate: "7.40" },
    { id: "STANDARD", rate: "7.15" },
  ]);
  const quote = await quoteShipping(items, 49_99, source);
  assertEquals(quote, {
    amountCents: 715,
    printfulCents: 715,
    free: false,
    minDeliveryDays: 4,
    maxDeliveryDays: 6,
  });
  assertEquals(requests, [{
    recipient: QUOTE_RECIPIENT,
    items,
    currency: "USD",
  }]);
});

Deno.test("quoteShipping is free from $50, still recording Printful's cost", async () => {
  const { source } = printfulRates([{ id: "STANDARD", rate: "8.79" }]);
  const quote = await quoteShipping(
    items,
    FREE_SHIPPING_THRESHOLD_CENTS,
    source,
  );
  assertEquals(quote.amountCents, 0);
  assertEquals(quote.printfulCents, 879);
  assertEquals(quote.free, true);
});

Deno.test("quoteShipping fails without a STANDARD USD rate", async () => {
  await assertRejects(
    () =>
      quoteShipping(
        items,
        0,
        printfulRates([{ id: "EXPRESS", rate: "20.00" }]).source,
      ),
    Error,
    "no STANDARD shipping",
  );
  await assertRejects(
    () =>
      quoteShipping(
        items,
        0,
        printfulRates([{ id: "STANDARD", rate: "5.00", currency: "EUR" }])
          .source,
      ),
    Error,
    "EUR",
  );
});

Deno.test("stripeShippingOption is a fixed USD amount with a delivery estimate", () => {
  assertEquals(
    stripeShippingOption({
      amountCents: 495,
      printfulCents: 495,
      free: false,
      minDeliveryDays: 4,
      maxDeliveryDays: 6,
    }),
    {
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: "Standard shipping",
        fixed_amount: { amount: 495, currency: "usd" },
        delivery_estimate: {
          minimum: { unit: "business_day", value: 4 },
          maximum: { unit: "business_day", value: 6 },
        },
      },
    },
  );
  const free = stripeShippingOption({
    amountCents: 0,
    printfulCents: 879,
    free: true,
  });
  assertEquals(free.shipping_rate_data?.display_name, "Free standard shipping");
  assertEquals(free.shipping_rate_data?.fixed_amount?.amount, 0);
  assertEquals(free.shipping_rate_data?.delivery_estimate, undefined);
});

Deno.test("shippingRateSourceFor uses Printful when configured, a stub only outside PROD", async () => {
  const { source } = printfulRates([]);
  assertEquals(shippingRateSourceFor("PROD", source), source);
  assertEquals(shippingRateSourceFor("DEV", undefined), stubShippingRates);
  assertEquals(shippingRateSourceFor("TEST", undefined), stubShippingRates);
  assertThrows(
    () => shippingRateSourceFor("PROD", undefined),
    Error,
    "PRINTFUL_SECRET",
  );
  const quote = await quoteShipping(
    [{ variant_id: "1", quantity: 1 }, { variant_id: "2", quantity: 2 }],
    0,
    stubShippingRates,
  );
  assertEquals(quote.amountCents, 495 + 2 * 220);
});

Deno.test("shippingCostMismatch flags only a differing Printful charge", () => {
  assertEquals(shippingCostMismatch("495", "4.95"), undefined);
  assertEquals(shippingCostMismatch(undefined, "4.95"), undefined);
  assertEquals(shippingCostMismatch("495", undefined), undefined);
  assertEquals(
    shippingCostMismatch("495", "12.40"),
    "Printful charged 1240 cents for shipping; checkout quoted 495",
  );
});
