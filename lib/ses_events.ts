/**
 * Turns an SES delivery notification into the alert email the admin gets.
 *
 * SES publishes delivery, bounce and complaint events to the `weewoo-ops` SNS
 * topic, which feeds the `weewoo_ops_listener` SQS queue. The `ses-events`
 * Lambda (lambda/main.ts) receives each queue message and mails the admin.
 *
 * Kept free of imports that read the environment, so it can be unit tested.
 */
export interface SesNotification {
  notificationType: "Delivery" | "Bounce" | "Complaint";
  mail: {
    timestamp: string;
    source: string;
    sourceArn: string;
    sourceIp: string;
    callerIdentity: string;
    sendingAccountId: string;
    messageId: string;
    destination: string[];
  };
  delivery?: {
    timestamp: string;
    processingTimeMillis: number;
    recipients: string[];
    smtpResponse: string;
    remoteMtaIp: string;
    reportingMTA: string;
  };
  bounce?: {
    bounceType: string;
    bounceSubType: string;
    bouncedRecipients: {
      emailAddress: string;
      action: string;
      status: string;
      diagnosticCode: string;
    }[];
    timestamp: string;
    feedbackId: string;
    remoteMtaIp: string;
    reportingMTA: string;
  };
  complaint?: {
    complainedRecipients: {
      emailAddress: string;
    }[];
    timestamp: string;
    feedbackId: string;
    complaintFeedbackType: string;
    userAgent: string;
  };
}

export interface SesEventAlert {
  to: string;
  subject: string;
  htmlBody: string;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * The alert for one SQS message body (an SNS envelope whose `Message` is the
 * SES notification as JSON). Returns null when no alert is due: the event is
 * about mail sent to the admin (alerting on those would loop). Throws on a
 * body that isn't an SES notification, so the message is retried and ends up
 * in the dead-letter queue.
 */
export function sesEventAlert(
  body: string,
  adminEmail: string,
): SesEventAlert | null {
  const envelope = JSON.parse(body) as { Message?: string };
  if (typeof envelope.Message !== "string") {
    throw new Error("SQS message is not an SNS envelope");
  }
  const notification = JSON.parse(envelope.Message) as SesNotification;
  const recipient = notification.mail?.destination?.[0];
  if (!recipient || !notification.notificationType) {
    throw new Error("SNS message is not an SES notification");
  }
  if (recipient === adminEmail) return null;

  return {
    to: adminEmail,
    subject: `Email status for ${recipient} - ${notification.notificationType}`,
    htmlBody: `<p>Email to ${
      escapeHtml(recipient)
    } resulted in a ${notification.notificationType} event.</p><p>Message: <pre>${
      escapeHtml(JSON.stringify(notification, null, 2))
    }</pre></p>`,
  };
}
