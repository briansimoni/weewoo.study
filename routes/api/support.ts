// routes/api/support.ts
import { Handlers } from "$fresh/server.ts";
import { emailService } from "../../lib/email_service.ts";
import { log } from "../../lib/logger.ts";
import { z } from "npm:zod";

// Zod schema for form data validation
const SupportFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required").max(
    5000,
    "Message is too long",
  ),
});

export const handler: Handlers = {
  async POST(req) {
    try {
      // Parse form data
      const formData = await req.formData();
      const rawFormData = {
        name: formData.get("name")?.toString() || "",
        email: formData.get("email")?.toString() || "",
        subject: formData.get("subject")?.toString() || "",
        message: formData.get("message")?.toString() || "",
      };

      // Validate form data with Zod
      const result = SupportFormSchema.safeParse(rawFormData);

      if (!result.success) {
        // Get the first validation error
        const errorMessage = result.error.errors[0]?.message ||
          "Invalid form data";
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/support?error=${encodeURIComponent(errorMessage)}`,
          },
        });
      }

      // Validated data
      const { name, email, subject, message } = result.data;

      // Get admin email from environment variable or use a default
      const adminEmail = Deno.env.get("ADMIN_EMAIL") || "brsimoni@gmail.com";

      // Construct the HTML email body
      const htmlBody = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Support Request from WeeWoo.study</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .field { margin-bottom: 15px; }
              .field-label { font-weight: bold; }
              .message { white-space: pre-wrap; border-left: 3px solid #ddd; padding-left: 15px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New Support Request</h1>
              </div>
              <div class="content">
                <div class="field">
                  <div class="field-label">From:</div>
                  <div>${name} (${email})</div>
                </div>
                <div class="field">
                  <div class="field-label">Subject:</div>
                  <div>${subject}</div>
                </div>
                <div class="field">
                  <div class="field-label">Message:</div>
                  <div class="message">${message.replace(/\n/g, "<br>")}</div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      // Plain text version
      const textBody = `
        New Support Request from WeeWoo.study
        ===============================
        
        From: ${name} (${email})
        Subject: ${subject}
        
        Message:
        ${message}
      `;

      // Send the email
      const emailResult = await emailService.sendEmail({
        to: adminEmail,
        subject: `[WeeWoo Support] ${subject}`,
        htmlBody,
        textBody,
        replyTo: email, // Set reply-to as the sender's email for easy response
      });

      if (emailResult) {
        log.info(`Support message sent from ${email} with subject: ${subject}`);
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/support?success=true",
          },
        });
      } else {
        log.error(`Failed to send support email from ${email}`);
        return new Response(null, {
          status: 302,
          headers: {
            Location:
              "/support?error=Failed to send your message. Please try again later.",
          },
        });
      }
    } catch (error) {
      log.error("Error in support form submission:", error);
      return new Response(null, {
        status: 302,
        headers: {
          Location:
            "/support?error=An unexpected error occurred. Please try again.",
        },
      });
    }
  },
};
