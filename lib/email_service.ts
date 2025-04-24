// email_service.ts - A service for sending emails using Amazon SES
import {
  SendEmailCommand,
  SendEmailCommandInput,
  SESClient,
} from "npm:@aws-sdk/client-ses";
import { log } from "./logger.ts";

// Environment variable names
const AWS_REGION = Deno.env.get("AWS_REGION") || "us-east-1";
const SES_FROM_EMAIL = Deno.env.get("SES_FROM_EMAIL");
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");

// Interface for email options
export interface EmailOptions {
  to: string | string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  replyTo?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
}

/**
 * Email Service for sending emails via Amazon SES
 */
export class EmailService {
  private client: SESClient;
  private fromEmail: string;

  constructor(options?: { region?: string; fromEmail?: string }) {
    // Initialize SES client with credentials
    this.client = new SESClient({
      region: options?.region || AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID || "",
        secretAccessKey: AWS_SECRET_ACCESS_KEY || "",
      },
    });

    // Set the from email address
    this.fromEmail = options?.fromEmail || SES_FROM_EMAIL || "";

    if (!this.fromEmail) {
      log.warn(
        "SES_FROM_EMAIL environment variable is not set. Emails will not be sent.",
      );
    }
  }

  /**
   * Send an email using Amazon SES
   * @param options Email options including recipients, subject, and body
   * @returns Promise that resolves when the email is sent
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // If fromEmail is not set or we're in a non-production environment without forcing
      if (!this.fromEmail) {
        log.warn("Cannot send email: From email address is not configured");
        log.info("Email would have been sent with:", options);
        return false;
      }

      log.info("Sending email with details:", {
        from: this.fromEmail,
        ...options,
      });

      // Format recipients as arrays
      const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
      const ccAddresses = options.cc
        ? (Array.isArray(options.cc) ? options.cc : [options.cc])
        : undefined;
      const bccAddresses = options.bcc
        ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc])
        : undefined;
      const replyToAddresses = options.replyTo
        ? (Array.isArray(options.replyTo) ? options.replyTo : [options.replyTo])
        : undefined;

      // Create the email parameters
      const params: SendEmailCommandInput = {
        Source: this.fromEmail,
        Destination: {
          ToAddresses: toAddresses,
          CcAddresses: ccAddresses,
          BccAddresses: bccAddresses,
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: options.htmlBody,
              Charset: "UTF-8",
            },
            ...(options.textBody && {
              Text: {
                Data: options.textBody,
                Charset: "UTF-8",
              },
            }),
          },
        },
        ...(replyToAddresses && { ReplyToAddresses: replyToAddresses }),
      };

      // Send the email
      const command = new SendEmailCommand(params);
      const response = await this.client.send(command);

      log.info(`Email sent successfully. MessageId: ${response.MessageId}`);
      return true;
    } catch (error) {
      log.error("Failed to send email:", error);
      return false;
    }
  }

  /**
   * Send an order confirmation email
   * @param options Order confirmation email options
   * @returns Promise that resolves when the email is sent
   */
  sendOrderConfirmation({
    to,
    orderReference,
    items,
    totalAmount,
    shippingAddress,
  }: {
    to: string;
    orderReference: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    totalAmount: number;
    shippingAddress: {
      name: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  }): Promise<boolean> {
    // Format items for the email
    const itemsList = items
      .map(
        (item) =>
          `<tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">$${
            item.price.toFixed(2)
          }</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">$${
            (item.price * item.quantity).toFixed(2)
          }</td>
          </tr>`,
      )
      .join("");

    // Format shipping address
    const formattedAddress = `
      ${shippingAddress.name}<br>
      ${shippingAddress.line1}<br>
      ${shippingAddress.line2 ? `${shippingAddress.line2}<br>` : ""}
      ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}<br>
      ${shippingAddress.country}
    `;

    // Create HTML email body
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Order Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: #f8f9fa; text-align: left; padding: 10px; }
            .total { font-weight: bold; text-align: right; padding: 10px; }
            .address { margin-top: 20px; padding: 10px; background-color: #f8f9fa; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmation</h1>
              <p>Thank you for your order!</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Your order has been received and is being processed. Here are your order details:</p>
              
              <p><strong>Order Reference:</strong> ${orderReference}</p>
              
              <h2>Order Summary</h2>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" class="total">Total:</td>
                    <td style="padding: 10px; font-weight: bold;">$${
      totalAmount.toFixed(2)
    }</td>
                  </tr>
                </tfoot>
              </table>
              
              <div class="address">
                <h2>Shipping Address</h2>
                <p>${formattedAddress}</p>
              </div>
              
              <p>We'll send you another email when your order ships.</p>
              <p>If you have any questions, please contact our customer service.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} weewoo.study</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Create plain text version
    const textBody = `
      ORDER CONFIRMATION
      
      Thank you for your order!
      
      Order Reference: ${orderReference}
      
      ORDER SUMMARY:
      ${
      items.map((item) =>
        `${item.name} x${item.quantity} - $${
          (item.price * item.quantity).toFixed(2)
        }`
      ).join("\n")
    }
      
      Total: $${totalAmount.toFixed(2)}
      
      SHIPPING ADDRESS:
      ${shippingAddress.name}
      ${shippingAddress.line1}
      ${shippingAddress.line2 ? `${shippingAddress.line2}\n` : ""}
      ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}
      ${shippingAddress.country}
      
      We'll send you another email when your order ships.
      
      If you have any questions, please contact our customer service.
    `;

    return this.sendEmail({
      to,
      subject: "Your Order Confirmation",
      htmlBody,
      textBody,
    });
  }

  /**
   * Send an order shipped notification email
   * @param options Order shipping notification email options
   * @returns Promise that resolves when the email is sent
   */
  sendOrderShippedNotification({
    to,
    orderReference,
    trackingNumber,
    trackingUrl,
    carrier,
    estimatedDelivery,
  }: {
    to: string;
    orderReference: string;
    trackingNumber: string;
    trackingUrl: string | null;
    carrier: string;
    estimatedDelivery: string | null;
  }): Promise<boolean> {
    // Create HTML email body
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your Order Has Shipped</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; }
            .tracking-info { margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #5cb85c; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Order Has Shipped!</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Great news! Your order (Reference: ${orderReference}) has been shipped and is on its way to you.</p>
              
              <div class="tracking-info">
                <h2>Tracking Information</h2>
                <p><strong>Carrier:</strong> ${carrier}</p>
                <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
                ${trackingUrl ? `<p><strong>Track Your Package:</strong> <a href="${trackingUrl}">${trackingUrl}</a></p>` : ''}
                ${estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>` : ''}
              </div>
              
              <p>If you have any questions about your order, please don't hesitate to contact our customer service team.</p>
              <p>Thank you for your business!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} weewoo.study</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Create plain text version
    const textBody = `
      YOUR ORDER HAS SHIPPED
      
      Hello,
      
      Great news! Your order (Reference: ${orderReference}) has been shipped and is on its way to you.
      
      TRACKING INFORMATION:
      Carrier: ${carrier}
      Tracking Number: ${trackingNumber}
      ${trackingUrl ? `Track Your Package: ${trackingUrl}` : ''}
      ${estimatedDelivery ? `Estimated Delivery: ${estimatedDelivery}` : ''}
      
      If you have any questions about your order, please don't hesitate to contact our customer service team.
      
      Thank you for your business!
    `;

    return this.sendEmail({
      to,
      subject: "Your Order Has Shipped",
      htmlBody,
      textBody,
    });
  }
}

// Create and export a default instance
export const emailService = new EmailService();
