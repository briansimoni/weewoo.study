import { AppHandlers } from "../_middleware.ts";
import { log } from "../../lib/logger.ts";
import { emailService } from "../../lib/email_service.ts";

// Printful webhook payload interfaces
interface PrintfulWebhookBase {
  type: string;
  created: string; // ISO timestamp
  store_id: number;
  data: unknown;
}

interface PrintfulShipmentData {
  tracking_number: string;
  tracking_url: string;
  carrier: string;
  estimated_delivery_date?: string;
  // Additional shipment details
}

interface PrintfulRecipient {
  name: string;
  email: string;
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
  phone?: string;
}

interface PrintfulOrder {
  id: number;
  external_id?: string;
  status: string;
  shipping_method?: string;
  shipping_costs?: number;
  created: string; // ISO timestamp
  recipient: PrintfulRecipient;
  // Other order fields
}

interface PrintfulPackageShippedWebhook extends PrintfulWebhookBase {
  type: "package_shipped";
  data: {
    order: PrintfulOrder;
    shipment: PrintfulShipmentData;
  };
}

export const handler: AppHandlers = {
  POST: async (req) => {
    // Parse the webhook payload
    if (!req.body) {
      log.error("Request body is null");
      return new Response("Invalid request body", { status: 400 });
    }

    try {
      const payload = await req.json() as PrintfulWebhookBase;
      log.info("Received Printful webhook type:", payload.type);

      // Handle package_shipped event
      if (payload.type === "package_shipped") {
        const typedPayload = payload as PrintfulPackageShippedWebhook;
        const { order, shipment } = typedPayload.data;
        log.info(`Order ${order.id} has been shipped!`);
        
        // Extract relevant shipping information
        const trackingNumber = shipment.tracking_number;
        const trackingUrl = shipment.tracking_url;
        const carrier = shipment.carrier;
        
        // Send notification email to customer if we have their email
        if (order.recipient && order.recipient.email) {
          try {
            await emailService.sendOrderShippedNotification({
              to: order.recipient.email,
              orderReference: order.id.toString(),
              trackingNumber: trackingNumber || "Not available",
              trackingUrl: trackingUrl || null,
              carrier: carrier || "Shipping carrier",
              estimatedDelivery: shipment.estimated_delivery_date || null,
            });
            
            log.info(`Sent shipping notification email to ${order.recipient.email}`);
          } catch (emailError) {
            // Log the error but don't fail the webhook processing
            log.error("Error sending shipping notification email:", emailError);
          }
        }
        
        // You could also update your database to mark the order as shipped
        // For example: await database.updateOrderStatus(order.id, "shipped");
        
        // Here you can add additional business logic for shipped orders:
        // - Update order status in your database
        // - Send notifications through other channels
        // - Update inventory counts
      }

      // Return a success response to Printful
      return new Response("Webhook processed successfully", { status: 200 });
    } catch (error) {
      log.error("Error processing Printful webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  },
};
