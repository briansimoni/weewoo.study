import { assertEquals, assertThrows } from "@std/assert";
import type Stripe from "stripe";
import { ProductStore } from "./product_store.ts";
import {
  assertStripeKeyMatchesStage,
  fulfillmentMode,
  handleStripeWebhook,
  type PrintfulOrder,
  type StripeCheckoutApi,
  type StripeEventRecord,
  stripeKeyMode,
  type StripeWebhookDeps,
} from "./stripe_webhook.ts";

const SIGNING_SECRET = "whsec_test_secret";
const SESSION_ID = "cs_test_123";

Deno.test("stripeKeyMode reads the key prefix", () => {
  assertEquals(stripeKeyMode("sk_live_abc"), "live");
  assertEquals(stripeKeyMode("rk_live_abc"), "live");
  assertEquals(stripeKeyMode(" sk_test_abc "), "test");
  assertEquals(stripeKeyMode("rk_test_abc"), "test");
  assertEquals(stripeKeyMode("pk_live_abc"), "unknown");
  assertEquals(stripeKeyMode(""), "unknown");
  assertEquals(stripeKeyMode(undefined), "unknown");
});

Deno.test("assertStripeKeyMatchesStage refuses mismatched modes", () => {
  for (const stage of ["DEV", "TEST", undefined]) {
    assertThrows(() => assertStripeKeyMatchesStage(stage, "sk_live_x"));
    assertStripeKeyMatchesStage(stage, "sk_test_x");
  }
  assertThrows(() => assertStripeKeyMatchesStage("PROD", "sk_test_x"));
  assertThrows(() => assertStripeKeyMatchesStage("PROD", "rk_test_x"));
  assertStripeKeyMatchesStage("PROD", "sk_live_x");
  // No key: the shop can't check out, but the app may start.
  assertStripeKeyMatchesStage("PROD", undefined);
  assertStripeKeyMatchesStage("DEV", undefined);
});

Deno.test("fulfillmentMode is live only in PROD", () => {
  assertEquals(fulfillmentMode("PROD"), "live");
  assertEquals(fulfillmentMode("PROD", true), "live");
  assertEquals(fulfillmentMode("TEST"), "dry_run");
  assertEquals(fulfillmentMode("DEV"), "dry_run");
  assertEquals(fulfillmentMode(undefined), "dry_run");
  assertEquals(fulfillmentMode("TEST", true), "printful_draft");
});

interface Calls {
  stripe: string[];
  printful: unknown[];
  emails: string[];
  confirmations: string[];
  logs: Array<{ message: string; meta?: object }>;
}

const session = {
  id: SESSION_ID,
  object: "checkout.session",
  customer_details: { email: "buyer@example.com" },
  collected_information: {
    shipping_details: {
      name: "Pat Medic",
      address: {
        line1: "1 Main St",
        line2: null,
        city: "Albany",
        state: "NY",
        postal_code: "12207",
        country: "US",
      },
    },
  },
};

const lineItem = (id: string, product: string, quantity: number) => ({
  id,
  object: "item",
  quantity,
  price: { id: `price_${product}`, object: "price", product },
});

/** Stand-in for the Stripe client's checkout calls. */
function fakeStripe(
  calls: Calls,
  options: { failApi?: boolean } = {},
): StripeCheckoutApi {
  const call = (name: string, id: string) => {
    calls.stripe.push(`${name} ${id}`);
    if (options.failApi) throw new Error("Stripe API error");
    if (id !== SESSION_ID) throw new Error(`unexpected session ${id}`);
  };
  return {
    checkout: {
      sessions: {
        retrieve(id) {
          try {
            call("retrieve", id);
          } catch (error) {
            return Promise.reject(error);
          }
          return Promise.resolve(
            session as unknown as Stripe.Checkout.Session,
          );
        },
        async *listLineItems(id) {
          call("listLineItems", id);
          yield lineItem("li_1", "prod_shirt", 2) as Stripe.LineItem;
          yield lineItem("li_2", "prod_unknown", 1) as Stripe.LineItem;
        },
      },
    },
  };
}

/**
 * Stand-in for `Stripe.webhooks.constructEventAsync`. Real signature checking
 * is Stripe's code; here a request is "signed" with `signed:<secret>`.
 */
const fakeVerifyEvent: StripeWebhookDeps["verifyEvent"] = (
  body,
  signature,
  secret,
) =>
  signature === `signed:${secret}`
    ? Promise.resolve(JSON.parse(body) as Stripe.Event)
    : Promise.reject(new Error("No signatures found matching the payload"));

async function withDeps(
  overrides: Partial<StripeWebhookDeps> & { failApi?: boolean },
  fn: (deps: StripeWebhookDeps, calls: Calls) => Promise<void>,
) {
  const kv = await Deno.openKv(":memory:");
  const calls: Calls = {
    stripe: [],
    printful: [],
    emails: [],
    confirmations: [],
    logs: [],
  };
  const record = (message: string, meta?: object) => {
    calls.logs.push({ message, meta });
  };
  try {
    const store = await ProductStore.make(kv);
    await store.addVariant({
      variant_id: "101",
      printful_product_id: "9",
      product_template_id: "77",
      price: 25,
      size: "M",
      color: { name: "Red", hex: "#f00" },
      images: [],
      stripe_product_id: "prod_shirt",
    });
    const deps: StripeWebhookDeps = {
      log: { info: record, warn: record, error: record },
      signingSecret: SIGNING_SECRET,
      verifyEvent: fakeVerifyEvent,
      stripe: fakeStripe(calls, { failApi: overrides.failApi }),
      printfulSecret: "printful_secret",
      stage: "PROD",
      kv,
      adminEmail: "admin@example.com",
      email: {
        sendEmail: (o) => {
          calls.emails.push(String(o.to));
          return Promise.resolve(true);
        },
        sendOrderConfirmation: (o) => {
          calls.confirmations.push(`${o.to} ${o.orderReference}`);
          return Promise.resolve(true);
        },
      },
      fetch: (_input, init) => {
        calls.printful.push(JSON.parse(String(init?.body)));
        return Promise.resolve(
          Response.json({ code: 200, result: { id: 555 } }),
        );
      },
      ...overrides,
    };
    await fn(deps, calls);
  } finally {
    kv.close();
  }
}

function signedRequest(
  event: { id: string; type: string; data?: unknown },
  secret = SIGNING_SECRET,
) {
  const payload = JSON.stringify({
    object: "event",
    data: { object: { id: SESSION_ID, object: "checkout.session" } },
    ...event,
  });
  return Promise.resolve(
    new Request("http://localhost/api/stripe_webhook", {
      method: "POST",
      headers: { "stripe-signature": `signed:${secret}` },
      body: payload,
    }),
  );
}

const completed = { id: "evt_1", type: "checkout.session.completed" };

Deno.test("webhook rejects a bad signature", async () => {
  await withDeps({}, async (deps, calls) => {
    const res = await handleStripeWebhook(
      await signedRequest(completed, "whsec_wrong"),
      deps,
    );
    assertEquals(res.status, 400);
    assertEquals(calls.stripe, []);
    assertEquals(calls.printful, []);
  });
});

Deno.test("webhook without a signing secret returns 500, not a throw", async () => {
  await withDeps({ signingSecret: undefined }, async (deps) => {
    const res = await handleStripeWebhook(await signedRequest(completed), deps);
    assertEquals(res.status, 500);
  });
});

Deno.test("unrelated events succeed even without Stripe or Printful config", async () => {
  await withDeps(
    { stripe: undefined, printfulSecret: undefined },
    async (deps, calls) => {
      const res = await handleStripeWebhook(
        await signedRequest({ id: "evt_2", type: "payment_intent.succeeded" }),
        deps,
      );
      assertEquals(res.status, 200);
      assertEquals(calls.stripe, []);
      assertEquals((await deps.kv.get(["stripe_events", "evt_2"])).value, null);
    },
  );
});

Deno.test("PROD submits one Printful order, emails, and records the event", async () => {
  await withDeps({}, async (deps, calls) => {
    const res = await handleStripeWebhook(await signedRequest(completed), deps);
    assertEquals(res.status, 200);
    assertEquals(calls.printful, [{
      recipient: {
        name: "Pat Medic",
        address1: "1 Main St",
        address2: null,
        city: "Albany",
        state_code: "NY",
        zip: "12207",
        email: "buyer@example.com",
        country_code: "US",
      },
      // The unknown Stripe product is skipped; the known one is ordered.
      items: [{
        variant_id: 101,
        quantity: 2,
        product_template_id: 77,
        retail_price: "25",
      }],
    }]);
    assertEquals(calls.emails, ["admin@example.com"]);
    assertEquals(calls.confirmations, ["buyer@example.com 555"]);
    const record = await deps.kv.get<StripeEventRecord>([
      "stripe_events",
      "evt_1",
    ]);
    assertEquals(record.value?.status, "done");
    assertEquals(record.value?.mode, "live");
  });
});

Deno.test("a redelivered event is not fulfilled twice", async () => {
  await withDeps({}, async (deps, calls) => {
    assertEquals(
      (await handleStripeWebhook(await signedRequest(completed), deps)).status,
      200,
    );
    const again = await handleStripeWebhook(
      await signedRequest(completed),
      deps,
    );
    assertEquals(again.status, 200);
    assertEquals(await again.text(), "duplicate");
    assertEquals(calls.printful.length, 1);
    assertEquals(calls.confirmations.length, 1);
  });
});

Deno.test("an event still being processed asks Stripe to retry", async () => {
  await withDeps({}, async (deps, calls) => {
    await deps.kv.set(
      ["stripe_events", "evt_1"],
      {
        type: completed.type,
        status: "processing",
        mode: "live",
        updated_at: new Date().toISOString(),
      } satisfies StripeEventRecord,
    );
    const res = await handleStripeWebhook(await signedRequest(completed), deps);
    assertEquals(res.status, 409);
    assertEquals(calls.printful, []);
  });
});

for (const stage of ["TEST", "DEV", undefined]) {
  Deno.test(`STAGE=${stage} is a dry run: no Printful order, no emails`, async () => {
    // Printful isn't needed for a dry run.
    await withDeps(
      { stage, printfulSecret: undefined },
      async (deps, calls) => {
        const res = await handleStripeWebhook(
          await signedRequest(completed),
          deps,
        );
        assertEquals(res.status, 200);
        assertEquals(calls.stripe.length, 2); // session + line items
        assertEquals(calls.printful, []);
        assertEquals(calls.emails, []);
        assertEquals(calls.confirmations, []);
        const dryRun = calls.logs.find((l) => l.message.startsWith("Dry run"));
        assertEquals(
          (dryRun?.meta as { order: PrintfulOrder }).order.items[0].variant_id,
          101,
        );
        const record = await deps.kv.get<StripeEventRecord>([
          "stripe_events",
          "evt_1",
        ]);
        assertEquals(record.value?.mode, "dry_run");
      },
    );
  });
}

Deno.test("PRINTFUL_DRAFT_ORDERS outside PROD submits the draft but sends no emails", async () => {
  await withDeps(
    { stage: "TEST", printfulDraftOrders: true },
    async (deps, calls) => {
      const res = await handleStripeWebhook(
        await signedRequest(completed),
        deps,
      );
      assertEquals(res.status, 200);
      assertEquals(calls.printful.length, 1);
      assertEquals(calls.emails, []);
      assertEquals(calls.confirmations, []);
    },
  );
});

Deno.test("a Printful failure returns 500 and releases the event for a retry", async () => {
  let fail = true;
  await withDeps({}, async (deps, calls) => {
    deps.fetch = (_input, init) => {
      calls.printful.push(JSON.parse(String(init?.body)));
      return Promise.resolve(
        fail
          ? Response.json({ error: "down" }, { status: 503 })
          : Response.json({ code: 200, result: { id: 556 } }),
      );
    };
    const res = await handleStripeWebhook(await signedRequest(completed), deps);
    assertEquals(res.status, 500);
    assertEquals(calls.emails, []);
    assertEquals((await deps.kv.get(["stripe_events", "evt_1"])).value, null);

    fail = false;
    const retry = await handleStripeWebhook(
      await signedRequest(completed),
      deps,
    );
    assertEquals(retry.status, 200);
    assertEquals(calls.printful.length, 2);
    assertEquals(calls.confirmations, ["buyer@example.com 556"]);
  });
});

Deno.test("a Stripe API failure returns 500 and releases the event", async () => {
  await withDeps({ failApi: true }, async (deps, calls) => {
    const res = await handleStripeWebhook(await signedRequest(completed), deps);
    assertEquals(res.status, 500);
    assertEquals(calls.printful, []);
    assertEquals((await deps.kv.get(["stripe_events", "evt_1"])).value, null);
  });
});

Deno.test("checkout without Printful config in PROD returns 500", async () => {
  await withDeps({ printfulSecret: undefined }, async (deps, calls) => {
    const res = await handleStripeWebhook(await signedRequest(completed), deps);
    assertEquals(res.status, 500);
    assertEquals(calls.printful, []);
  });
});
