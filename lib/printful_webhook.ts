import type {
  PrintfulOrder,
  PrintfulResponse,
  PrintfulShipment,
} from "./client/printful.ts";
import type { EmailService } from "./email_service.ts";
import type { WebhookLogger } from "./stripe_webhook.ts";

export interface PrintfulWebhookDeps {
  log: WebhookLogger;
  stage?: string;
  /** PrintfulApiClient.getOrder: the trusted copy of the order. */
  getOrder: (orderId: number) => Promise<PrintfulResponse<PrintfulOrder>>;
  email: Pick<EmailService, "sendOrderShippedNotification">;
}

interface PackageShippedPayload {
  type: "package_shipped";
  data?: {
    order?: { id?: unknown };
    shipment?: {
      id?: unknown;
      tracking_number?: unknown;
      estimated_delivery_date?: unknown;
    };
  };
}

function text(body: string, status = 200) {
  return new Response(body, { status });
}

/**
 * Printful v1 webhooks are unsigned, so the payload is only a hint: the order
 * and shipment are re-read from Printful, and the email goes to the
 * recipient and tracking link Printful has, never to values from the request.
 * Only STAGE=PROD sends the email.
 */
export async function handlePrintfulWebhook(
  req: Request,
  deps: PrintfulWebhookDeps,
): Promise<Response> {
  const { log } = deps;
  let payload: { type?: unknown };
  try {
    payload = await req.json();
  } catch {
    return text("invalid body", 400);
  }
  log.info("Received Printful webhook", { type: payload?.type });
  if (payload?.type !== "package_shipped") return text("ignored");

  const { data } = payload as PackageShippedPayload;
  const orderId = Number(data?.order?.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return text("missing order id", 400);
  }

  let order: PrintfulOrder;
  try {
    const response = await deps.getOrder(orderId);
    if (response.code !== 200) {
      log.warn("Printful webhook for an unknown order", {
        orderId,
        code: response.code,
      });
      return text("unknown order", 400);
    }
    order = response.result;
  } catch (error) {
    log.error("Error fetching order from Printful", {
      orderId,
      error: error instanceof Error ? error.message : error,
    });
    return text("error verifying order", 500);
  }

  const shipment = pickShipment(order.shipments ?? [], data?.shipment);
  const to = order.recipient?.email;
  if (!shipment || !to) {
    log.warn("No verified shipment or recipient email; not emailing", {
      orderId,
      hasShipment: Boolean(shipment),
    });
    return text("ok");
  }

  const notification = {
    to,
    orderReference: String(order.id),
    trackingNumber: String(shipment.tracking_number || "Not available"),
    trackingUrl: shipment.tracking_url || null,
    carrier: shipment.carrier || "Shipping carrier",
    estimatedDelivery: isoDate(data?.shipment?.estimated_delivery_date),
  };

  if (deps.stage !== "PROD") {
    log.info("Dry run: would send shipping notification", { notification });
    return text("ok");
  }

  try {
    await deps.email.sendOrderShippedNotification(notification);
    log.info(`Sent shipping notification for order ${order.id}`);
  } catch (error) {
    // The order shipped either way; don't make Printful retry over an email.
    log.error("Error sending shipping notification email", {
      error: error instanceof Error ? error.message : error,
    });
  }
  return text("ok");
}

/** The verified shipment the payload refers to, else the latest one. */
function pickShipment(
  shipments: PrintfulShipment[],
  hint: { id?: unknown; tracking_number?: unknown } | undefined,
): PrintfulShipment | undefined {
  const match = shipments.find((s) =>
    (hint?.id !== undefined && String(s.id) === String(hint.id)) ||
    (hint?.tracking_number !== undefined &&
      String(s.tracking_number) === String(hint.tracking_number))
  );
  return match ?? shipments.at(-1);
}

/** Only a plain YYYY-MM-DD date from the unsigned payload reaches the email. */
function isoDate(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null;
}
