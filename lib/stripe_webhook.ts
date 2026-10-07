// Types only: importing the Stripe SDK reads env vars (AI-agent detection) at
// load time, which unit tests don't allow. The route injects the real SDK.
import type Stripe from "stripe";
import type { EmailService } from "./email_service.ts";
import { ProductStore, type ProductVariant } from "./product_store.ts";

export type StripeKeyMode = "live" | "test" | "unknown";

/** Which Stripe mode a secret (`sk_`) or restricted (`rk_`) key belongs to. */
export function stripeKeyMode(key: string | undefined): StripeKeyMode {
  const match = /^(?:sk|rk)_(live|test)_/.exec(key?.trim() ?? "");
  return (match?.[1] as "live" | "test" | undefined) ?? "unknown";
}

/**
 * Refuse to run with a Stripe key from the wrong mode: a live key anywhere but
 * STAGE=PROD would take real payments from test traffic, and a test key in PROD
 * would accept fake cards for real orders. No key at all is allowed (the shop
 * just can't check out).
 */
export function assertStripeKeyMatchesStage(
  stage: string | undefined,
  key: string | undefined,
) {
  const mode = stripeKeyMode(key);
  if (mode === "live" && stage !== "PROD") {
    throw new Error(
      `Refusing to start: STRIPE_API_KEY is a live key but STAGE=${stage}.`,
    );
  }
  if (mode === "test" && stage === "PROD") {
    throw new Error(
      "Refusing to start: STRIPE_API_KEY is a test key but STAGE=PROD.",
    );
  }
}

/**
 * What a completed checkout does:
 * - `live` (STAGE=PROD only): submit the Printful order (Printful holds it as
 *   a draft until confirmed in its dashboard) and send the customer and admin
 *   emails.
 * - `printful_draft` (opt-in elsewhere with PRINTFUL_DRAFT_ORDERS=true): submit
 *   the Printful draft order, but send no emails.
 * - `dry_run` (default outside PROD): only log the Printful order payload.
 */
export type FulfillmentMode = "live" | "printful_draft" | "dry_run";

export function fulfillmentMode(
  stage: string | undefined,
  printfulDraftOrders = false,
): FulfillmentMode {
  if (stage === "PROD") return "live";
  return printfulDraftOrders ? "printful_draft" : "dry_run";
}

/** The app's `log` (lib/logger.ts) fits; tests pass a lightweight one. */
export interface WebhookLogger {
  info(message: string, meta?: object): void;
  warn(message: string, meta?: object): void;
  error(message: string, meta?: object): void;
}

/** The part of the Stripe client the webhook uses; `new Stripe(key)` fits. */
export interface StripeCheckoutApi {
  checkout: {
    sessions: {
      retrieve(id: string): Promise<Stripe.Checkout.Session>;
      listLineItems(id: string): AsyncIterable<Stripe.LineItem>;
    };
  };
}

export interface StripeWebhookDeps {
  log: WebhookLogger;
  /** STRIPE_SIGNING_SECRET; every event is verified with it. */
  signingSecret?: string;
  /** `Stripe.webhooks.constructEventAsync`: throws on a bad signature. */
  verifyEvent: (
    body: string,
    signature: string,
    secret: string,
  ) => Promise<Stripe.Event>;
  /** Client for Stripe API calls; undefined when STRIPE_API_KEY is unset. */
  stripe?: StripeCheckoutApi;
  /** PRINTFUL_SECRET; needed unless the mode is `dry_run`. */
  printfulSecret?: string;
  stage?: string;
  printfulDraftOrders?: boolean;
  kv: Deno.Kv;
  email: Pick<EmailService, "sendEmail" | "sendOrderConfirmation">;
  adminEmail?: string;
  /** Used for Printful requests. */
  fetch?: typeof fetch;
}

/** Processed events are remembered this long; Stripe retries for 3 days. */
const PROCESSED_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** A claim from a crashed attempt expires so a later retry can run. */
const PROCESSING_TTL_MS = 10 * 60 * 1000;

export interface StripeEventRecord {
  type: string;
  status: "processing" | "done";
  mode: FulfillmentMode;
  updated_at: string;
}

const eventKey = (eventId: string) => ["stripe_events", eventId];

function text(body: string, status = 200) {
  return new Response(body, { status });
}

export async function handleStripeWebhook(
  req: Request,
  deps: StripeWebhookDeps,
): Promise<Response> {
  const { log } = deps;
  if (!deps.signingSecret) {
    log.error("STRIPE_SIGNING_SECRET is not set; cannot verify webhooks");
    return text("webhook not configured", 500);
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await deps.verifyEvent(
      body,
      req.headers.get("stripe-signature") ?? "",
      deps.signingSecret,
    );
  } catch (error) {
    log.warn("Rejected Stripe webhook with an invalid signature", { error });
    return text("invalid signature", 400);
  }
  log.info("Received Stripe event", { id: event.id, type: event.type });

  if (event.type !== "checkout.session.completed") {
    return text("ignored");
  }

  const mode = fulfillmentMode(deps.stage, deps.printfulDraftOrders);
  const key = eventKey(event.id);
  const record = (status: StripeEventRecord["status"]): StripeEventRecord => ({
    type: event.type,
    status,
    mode,
    updated_at: new Date().toISOString(),
  });

  // Claim the event so retries and concurrent deliveries don't fulfill twice.
  const claim = await deps.kv.atomic()
    .check({ key, versionstamp: null })
    .set(key, record("processing"), { expireIn: PROCESSING_TTL_MS })
    .commit();
  if (!claim.ok) {
    const existing = await deps.kv.get<StripeEventRecord>(key);
    if (existing.value?.status === "processing") {
      // Non-2xx: Stripe retries later, after this attempt has finished.
      return text("already processing", 409);
    }
    log.info("Skipping duplicate Stripe event", { id: event.id });
    return text("duplicate");
  }

  try {
    await fulfillCheckout(event.data.object.id, mode, deps);
  } catch (error) {
    log.error("Failed to process checkout.session.completed", {
      id: event.id,
      // Error objects serialize to {} in the JSON log format.
      error: error instanceof Error ? error.stack ?? error.message : error,
    });
    await deps.kv.delete(key);
    return text("processing failed", 500);
  }

  await deps.kv.set(key, record("done"), { expireIn: PROCESSED_TTL_MS });
  return text("ok");
}

type OrderItem = { variant: ProductVariant; quantity: number };
type ShippingDetails = NonNullable<
  NonNullable<Stripe.Checkout.Session["collected_information"]>[
    "shipping_details"
  ]
>;

async function fulfillCheckout(
  sessionId: string,
  mode: FulfillmentMode,
  deps: StripeWebhookDeps,
) {
  const { log, stripe } = deps;
  if (!stripe) throw new Error("STRIPE_API_KEY is not set");
  if (mode !== "dry_run" && !deps.printfulSecret) {
    throw new Error("PRINTFUL_SECRET is not set");
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const lineItems: Stripe.LineItem[] = [];
  for await (
    const item of stripe.checkout.sessions.listLineItems(session.id)
  ) {
    lineItems.push(item);
  }
  log.info(
    `Processing ${lineItems.length} items from checkout session ${session.id}`,
  );

  const productStore = await ProductStore.make(deps.kv);
  const orderItems: OrderItem[] = [];
  for (const item of lineItems) {
    const product = item.price?.product;
    const stripeProductId = typeof product === "string" ? product : product?.id;
    const variant = stripeProductId
      ? await productStore.getVariantByStripeProductId(stripeProductId)
      : null;
    if (!variant) {
      log.error("Could not find matching variant for item", { item });
      continue; // skip this item but fulfill the rest
    }
    orderItems.push({ variant, quantity: item.quantity || 1 });
  }

  if (orderItems.length === 0) {
    log.error("No valid items found in checkout session", {
      sessionId: session.id,
    });
    return;
  }

  const shippingDetails = session.collected_information?.shipping_details;
  if (!shippingDetails) {
    log.error("Missing shipping details in checkout session", {
      sessionId: session.id,
    });
    return;
  }

  const customerEmail = session.customer_details?.email || undefined;
  const order = buildPrintfulOrder(orderItems, shippingDetails, customerEmail);

  if (mode === "dry_run") {
    log.info("Dry run: would submit Printful order", { order, customerEmail });
    return;
  }

  const result = await submitPrintfulOrder(order, deps);
  if (mode !== "live") {
    log.info("Submitted Printful draft order; no emails outside PROD", {
      orderId: result.result?.id,
    });
    return;
  }

  await deps.email.sendEmail({
    to: deps.adminEmail ?? "",
    subject: "💰 Order Placed 💰",
    htmlBody:
      "<div>an order was placed on printful! yay! Go click confirm</div>",
  }).catch((error) => log.error("error sending admin email", { error }));

  if (customerEmail) {
    await sendOrderConfirmation(
      orderItems,
      shippingDetails,
      customerEmail,
      String(result.result?.id),
      deps,
    );
  } else {
    log.warn("No customer email provided, skipping order confirmation email");
  }
}

export interface PrintfulOrder {
  recipient: {
    name?: string | null;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    state_code?: string | null;
    zip?: string | null;
    email?: string;
    country_code?: string | null;
  };
  items: Array<{
    variant_id: number;
    quantity: number;
    product_template_id: number;
    retail_price: string;
  }>;
}

export function buildPrintfulOrder(
  orderItems: OrderItem[],
  shippingDetails: ShippingDetails,
  customerEmail?: string,
): PrintfulOrder {
  return {
    recipient: {
      name: shippingDetails.name,
      address1: shippingDetails.address?.line1,
      address2: shippingDetails.address?.line2,
      city: shippingDetails.address?.city,
      state_code: shippingDetails.address?.state,
      zip: shippingDetails.address?.postal_code,
      email: customerEmail,
      country_code: shippingDetails.address?.country,
    },
    items: orderItems.map((item) => ({
      variant_id: parseInt(item.variant.variant_id),
      quantity: item.quantity,
      product_template_id: parseInt(item.variant.product_template_id),
      retail_price: String(item.variant.price),
    })),
  };
}

async function submitPrintfulOrder(
  order: PrintfulOrder,
  deps: StripeWebhookDeps,
): Promise<{ result?: { id?: number } }> {
  const { log } = deps;
  log.info(`Submitting order to Printful with ${order.items.length} items`);
  const response = await (deps.fetch ?? fetch)(
    "https://api.printful.com/orders",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Authorization": `Bearer ${deps.printfulSecret}`,
      },
      body: JSON.stringify(order),
    },
  );
  const result = await response.json();
  log.info("Printful order response", { result });
  if (!response.ok) {
    throw new Error(
      `Printful order failed: ${response.status} ${response.statusText}`,
    );
  }
  return result;
}

async function sendOrderConfirmation(
  orderItems: OrderItem[],
  shippingDetails: ShippingDetails,
  customerEmail: string,
  orderReference: string,
  deps: StripeWebhookDeps,
) {
  const { log } = deps;
  try {
    const items = orderItems.map((item) => ({
      name: item.variant.color
        ? `${item.variant.color.name} ${item.variant.size}`
        : item.variant.name || `Variant ${item.variant.size}`,
      quantity: item.quantity,
      price: item.variant.price || 0,
    }));
    const sent = await deps.email.sendOrderConfirmation({
      to: customerEmail,
      orderReference,
      items,
      totalAmount: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      shippingAddress: {
        name: shippingDetails.name || "",
        line1: shippingDetails.address?.line1 || "",
        line2: shippingDetails.address?.line2 || undefined,
        city: shippingDetails.address?.city || "",
        state: shippingDetails.address?.state || "",
        postal_code: shippingDetails.address?.postal_code || "",
        country: shippingDetails.address?.country || "",
      },
    });
    if (sent) {
      log.info(`Order confirmation email sent to ${customerEmail}`);
    } else {
      log.warn(`Failed to send order confirmation email to ${customerEmail}`);
    }
  } catch (error) {
    // The order is placed; a failed email must not fail the webhook.
    log.error("Error sending order confirmation email", { error });
  }
}
