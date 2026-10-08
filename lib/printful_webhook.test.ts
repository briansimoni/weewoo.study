import { assertEquals } from "@std/assert";
import type { PrintfulOrder, PrintfulResponse } from "./client/printful.ts";
import {
  handlePrintfulWebhook,
  type PrintfulWebhookDeps,
} from "./printful_webhook.ts";

const ORDER_ID = 4242;

const verifiedOrder = {
  id: ORDER_ID,
  recipient: { email: "buyer@example.com" },
  shipments: [
    {
      id: 1,
      carrier: "USPS",
      tracking_number: 111,
      tracking_url: "https://tools.usps.com/111",
    },
    {
      id: 2,
      carrier: "UPS",
      tracking_number: 222,
      tracking_url: "https://ups.com/222",
    },
  ],
} as unknown as PrintfulOrder;

interface Sent {
  to: string;
  trackingNumber: string;
  trackingUrl: string | null;
  carrier: string;
  estimatedDelivery: string | null;
}

function makeDeps(
  overrides: Partial<PrintfulWebhookDeps> = {},
): { deps: PrintfulWebhookDeps; sent: Sent[]; lookups: number[] } {
  const sent: Sent[] = [];
  const lookups: number[] = [];
  const noop = () => {};
  const deps: PrintfulWebhookDeps = {
    log: { info: noop, warn: noop, error: noop },
    stage: "PROD",
    getOrder: (id) => {
      lookups.push(id);
      const response = id === ORDER_ID
        ? { code: 200, result: verifiedOrder, extra: [] }
        : { code: 404, result: "Not found", extra: [] };
      return Promise.resolve(
        response as unknown as PrintfulResponse<PrintfulOrder>,
      );
    },
    email: {
      sendOrderShippedNotification: (o) => {
        sent.push(o);
        return Promise.resolve(true);
      },
    },
    ...overrides,
  };
  return { deps, sent, lookups };
}

function post(body: unknown) {
  return new Request("http://localhost/api/printful_webhook", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** A forged payload: real order ID, attacker's email and tracking link. */
const forged = {
  type: "package_shipped",
  data: {
    order: {
      id: ORDER_ID,
      recipient: { email: "victim@example.com" },
    },
    shipment: {
      id: 2,
      tracking_number: "222",
      tracking_url: "https://evil.example/phish",
      carrier: "<b>Totally UPS</b>",
      estimated_delivery_date: "<script>x</script>",
    },
  },
};

Deno.test("printful webhook emails Printful's recipient and tracking, not the payload's", async () => {
  const { deps, sent, lookups } = makeDeps();
  const res = await handlePrintfulWebhook(post(forged), deps);
  assertEquals(res.status, 200);
  assertEquals(lookups, [ORDER_ID]);
  assertEquals(sent, [{
    to: "buyer@example.com",
    orderReference: String(ORDER_ID),
    trackingNumber: "222",
    trackingUrl: "https://ups.com/222",
    carrier: "UPS",
    estimatedDelivery: null,
  } as Sent]);
});

Deno.test("printful webhook passes through a well-formed delivery date", async () => {
  const { deps, sent } = makeDeps();
  await handlePrintfulWebhook(
    post({
      type: "package_shipped",
      data: {
        order: { id: ORDER_ID },
        shipment: { id: 1, estimated_delivery_date: "2026-10-12" },
      },
    }),
    deps,
  );
  assertEquals(sent[0].trackingNumber, "111");
  assertEquals(sent[0].estimatedDelivery, "2026-10-12");
});

Deno.test("printful webhook falls back to the latest verified shipment", async () => {
  const { deps, sent } = makeDeps();
  await handlePrintfulWebhook(
    post({ type: "package_shipped", data: { order: { id: ORDER_ID } } }),
    deps,
  );
  assertEquals(sent[0].trackingNumber, "222");
});

Deno.test("printful webhook does not email for an unknown order", async () => {
  const { deps, sent } = makeDeps();
  const res = await handlePrintfulWebhook(
    post({ ...forged, data: { ...forged.data, order: { id: 999 } } }),
    deps,
  );
  assertEquals(res.status, 400);
  assertEquals(sent, []);
});

Deno.test("printful webhook does not email an order with no shipments", async () => {
  const { deps, sent } = makeDeps({
    getOrder: () =>
      Promise.resolve(
        {
          code: 200,
          result: { ...verifiedOrder, shipments: [] },
          extra: [],
        } as unknown as PrintfulResponse<PrintfulOrder>,
      ),
  });
  const res = await handlePrintfulWebhook(post(forged), deps);
  assertEquals(res.status, 200);
  assertEquals(sent, []);
});

for (const stage of ["TEST", "DEV", undefined]) {
  Deno.test(`printful webhook sends no email when STAGE=${stage}`, async () => {
    const { deps, sent, lookups } = makeDeps({ stage });
    const res = await handlePrintfulWebhook(post(forged), deps);
    assertEquals(res.status, 200);
    assertEquals(lookups, [ORDER_ID]);
    assertEquals(sent, []);
  });
}

Deno.test("printful webhook rejects bad input and ignores other events", async () => {
  const { deps, sent, lookups } = makeDeps();
  assertEquals(
    (await handlePrintfulWebhook(post("not json"), deps)).status,
    400,
  );
  assertEquals(
    (await handlePrintfulWebhook(
      post({ type: "package_shipped", data: { order: { id: "x" } } }),
      deps,
    )).status,
    400,
  );
  const other = await handlePrintfulWebhook(
    post({ type: "order_updated", data: {} }),
    deps,
  );
  assertEquals(other.status, 200);
  assertEquals(lookups, []);
  assertEquals(sent, []);
});

Deno.test("printful webhook returns 500 when Printful can't be reached", async () => {
  const { deps, sent } = makeDeps({
    getOrder: () => Promise.reject(new Error("network down")),
  });
  const res = await handlePrintfulWebhook(post(forged), deps);
  assertEquals(res.status, 500);
  assertEquals(sent, []);
});
