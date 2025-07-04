import dayjs from "dayjs";

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
import { QuestionStore } from "./question_store.ts";
import { EmailService } from "./email_service.ts";
import { log } from "./logger.ts";
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";

// Initialize SQS client
const sqsClient = new SQSClient({
  region: Deno.env.get("AWS_REGION") || "us-east-1",
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
  },
});

const QUEUE_URL = Deno.env.get("WEEWOO_OPS_QUEUE_URL");

if (!QUEUE_URL) {
  log.warn(
    "WEEWOO_OPS_QUEUE_URL environment variable is not set. SQS polling will not work.",
  );
}

export async function sendReport() {
  log.info("starting weekly question report cron: ");
  const questionStore = await QuestionStore.make();
  const questions = await questionStore.getQuestionReports();
  log.info("total reported questions: ", {
    count: questions.length,
  });
  const questionsReportedThisWeek = questions.filter((report) => {
    const oneWeekAgo = dayjs().subtract(7, "days");
    return dayjs(report.reported_at).isAfter(oneWeekAgo);
  });
  log.info("questions reported this week", {
    questionsReportedThisWeek,
  });
  // Create a nicely formatted HTML email
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .report-date { color: #7f8c8d; font-size: 14px; margin-bottom: 20px; }
        .report-item { background-color: #f9f9f9; padding: 12px; margin-bottom: 10px; border-left: 4px solid #3498db; }
        .no-reports { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #2ecc71; }
        .footer { margin-top: 30px; font-size: 12px; color: #7f8c8d; border-top: 1px solid #eee; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Weekly Question Reports</h1>
        <div class="report-date">Report for week ending ${
    dayjs().format("MMMM D, YYYY")
  }</div>
        
        ${
    questionsReportedThisWeek.length > 0
      ? `<div>
              <p>The following ${questionsReportedThisWeek.length} question${
        questionsReportedThisWeek.length === 1 ? "" : "s"
      } ${
        questionsReportedThisWeek.length === 1 ? "has" : "have"
      } been reported in the past week:</p>
              ${
        questionsReportedThisWeek.map((report) => `
                <div class="report-item">
                  <strong>Question ID:</strong> ${report.question_id}<br>
                  <strong>Reported:</strong> ${
          dayjs(report.reported_at).format("MMMM D, YYYY [at] h:mm A")
        }<br>
                  ${
          report.reason ? `<strong>Reason:</strong> ${report.reason}` : ""
        }
                </div>
              `).join("")
      }
            </div>`
      : `<div class="no-reports">No questions have been reported in the past week.</div>`
  }
        
        <div class="footer">
          <p>This is an automated report from the weewoo.study platform. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const emailService = new EmailService();
  const to = Deno.env.get("ADMIN_EMAIL");
  if (!to) {
    log.warn(
      "ADMIN_EMAIL environment variable is not set. Question report email will not be sent.",
    );
    return;
  }
  await emailService.sendEmail({
    to,
    subject: "Question Reports",
    htmlBody: htmlBody,
  });
}

export async function pollWeeWooOpsSQSMessages(): Promise<void> {
  if (!QUEUE_URL) {
    log.error("SQS Queue URL is not configured");
    return;
  }

  // Receive messages from the queue
  const receiveCommand = new ReceiveMessageCommand({
    QueueUrl: QUEUE_URL,
    MaxNumberOfMessages: 10, // Process up to 10 messages at a time
    WaitTimeSeconds: 5, // Use long polling
    VisibilityTimeout: 30, // Hide message for 30 seconds while processing
  });

  const response = await sqsClient.send(receiveCommand);
  const messages = response.Messages || [];

  if (messages.length === 0) {
    log.info("No messages in the queue");
    return;
  }

  log.info(`Processing ${messages.length} messages from SQS queue`);

  // Process each message
  for (const message of messages) {
    try {
      log.info("logging the message", {
        message: JSON.stringify(message),
      });

      const body = JSON.parse(message.Body || "{}");
      const sesNotification = JSON.parse(
        body.Message || "{}",
      ) as SesNotification;

      const adminEmail = Deno.env.get("ADMIN_EMAIL");

      if (sesNotification.mail.destination[0] !== adminEmail) {
        const emailService = new EmailService();
        await emailService.sendEmail({
          to: adminEmail || "",
          subject: `Email status for ${
            sesNotification.mail.destination[0]
          } - ${sesNotification.notificationType}`,
          htmlBody: `<p>Email to ${
            sesNotification.mail.destination[0]
          } resulted in a ${sesNotification.notificationType} event.</p><p>Message: <pre>${
            JSON.stringify(sesNotification, null, 2)
          }</pre></p>`,
        });
      }

      // Delete the message from the queue after successful processing
      if (message.ReceiptHandle) {
        const deleteCommand = new DeleteMessageCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle,
        });

        await sqsClient.send(deleteCommand);
      } else {
        log.warn("Message has no receipt handle, cannot delete", {
          messageId: message.MessageId,
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      log.error("Error processing message:", {
        error: errorMessage,
        messageId: message.MessageId,
      });
      // Don't delete the message so it can be processed again
    }
  }
}
