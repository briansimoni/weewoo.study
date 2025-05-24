import dayjs from "dayjs";
import { QuestionStore } from "./question_store.ts";
import { EmailService } from "./email_service.ts";
import { Logger } from "@deno-library/logger";
import { log } from "./logger.ts";

export async function sendReport() {
  const questionStore = await QuestionStore.make();
  const questions = await questionStore.getQuestionReports();
  const questionsReportedThisWeek = questions.filter((report) => {
    const oneWeekAgo = dayjs().subtract(7, "days");
    return dayjs(report.reported_at).isAfter(oneWeekAgo);
  });
  const htmlBody = questionsReportedThisWeek.length > 0
    ? questionsReportedThisWeek.map((report) => report.question_id).join(", ")
    : "No questions reported this week.";
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
