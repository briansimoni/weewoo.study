import dayjs from "dayjs";
import { QuestionStore } from "./question_store.ts";
import { EmailService } from "./email_service.ts";
import { log } from "./logger.ts";

export async function sendReport() {
  const questionStore = await QuestionStore.make();
  const questions = await questionStore.getQuestionReports();
  const questionsReportedThisWeek = questions.filter((report) => {
    const oneWeekAgo = dayjs().subtract(7, "days");
    return dayjs(report.reported_at).isAfter(oneWeekAgo);
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
