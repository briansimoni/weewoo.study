import { PageProps } from "$fresh/server.ts";
import { Handlers } from "$fresh/server.ts";
import {
  Edit,
  FileText,
  Info,
  LayoutDashboard,
  ThumbsDown,
  ThumbsUp,
} from "../../icons/index.ts";
import { QuestionReport, QuestionStore } from "../../lib/question_store.ts";
import { Question } from "../../lib/question_store.ts";

interface PageData {
  reports: (QuestionReport & { question?: Question })[];
}

export const handler: Handlers = {
  async GET(_req, ctx) {
    const store = await QuestionStore.make();
    const reports = await store.getQuestionReports();

    // Fetch the question details for each report
    const reportsWithQuestions = await Promise.all(
      reports.map(async (report: QuestionReport) => {
        try {
          const question = await store.getQuestionById(report.question_id);
          return { ...report, question };
        } catch (error) {
          console.error(
            `Error fetching question ${report.question_id}:`,
            error,
          );
          return report;
        }
      }),
    );

    return ctx.render({ reports: reportsWithQuestions });
  },
};

export default function QuestionReports({ data }: PageProps<PageData>) {
  const { reports } = data;

  return (
    <div class="bg-base-100 min-h-screen">
      <header class="bg-primary text-primary-content shadow-md py-4">
        <div class="container mx-auto px-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <ThumbsUp className="w-6 h-6" />
              <h1 class="text-xl font-bold">Question Reports</h1>
            </div>
            <div class="flex gap-4">
              <a href="/admin" class="btn btn-ghost btn-sm">
                <LayoutDashboard className="w-4 h-4 mr-1" />
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      <div class="container mx-auto p-4 max-w-5xl">
        <div class="flex flex-col items-center mb-8 mt-4">
          <h1 class="text-3xl font-bold mb-2">Question Feedback Reports</h1>
          <p class="text-base-content/70">
            View feedback submitted by users for questions
          </p>
        </div>

        <div class="stats shadow mb-6 w-full">
          <div class="stat">
            <div class="stat-figure text-primary">
              <ThumbsUp className="w-7 h-7" />
            </div>
            <div class="stat-title">Positive Feedback</div>
            <div class="stat-value text-primary">
              {reports.filter((r) => r.thumbs === "up").length}
            </div>
          </div>

          <div class="stat">
            <div class="stat-figure text-error">
              <ThumbsDown className="w-7 h-7" />
            </div>
            <div class="stat-title">Issues Reported</div>
            <div class="stat-value text-error">
              {reports.filter((r) => r.thumbs === "down").length}
            </div>
          </div>

          <div class="stat">
            <div class="stat-figure text-secondary">
              <FileText className="w-7 h-7" />
            </div>
            <div class="stat-title">Total Reports</div>
            <div class="stat-value">{reports.length}</div>
          </div>
        </div>

        <div class="flex justify-end mb-4">
          <div class="join">
            <button class="btn join-item" type="button">All</button>
            <button class="btn join-item btn-primary" type="button">
              <ThumbsUp className="w-4 h-4 mr-1" />
              Positive
            </button>
            <button class="btn join-item" type="button">
              <ThumbsDown className="w-4 h-4 mr-1" />
              Negative
            </button>
          </div>
        </div>

        {reports.length === 0
          ? (
            <div class="bg-base-200 p-8 rounded-lg text-center">
              <Info className="w-16 h-16 mx-auto mb-4 text-base-content/60" />
              <h3 class="text-xl font-bold mb-2">No Reports Yet</h3>
              <p class="text-base-content/70">
                Users haven't submitted any feedback for questions yet.
              </p>
            </div>
          )
          : (
            <div class="grid gap-6">
              {reports.map((report) => (
                <div
                  key={`${report.question_id}-${report.reported_at}`}
                  class="card bg-base-200 shadow-lg"
                >
                  <div class="card-body">
                    <div class="flex items-center gap-2 mb-4">
                      <div
                        class={`flex justify-center ${
                          report.thumbs === "up" ? "text-success" : "text-error"
                        }`}
                      >
                        <div class="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center">
                          {report.thumbs === "up"
                            ? <ThumbsUp className="w-6 h-6" />
                            : <ThumbsDown className="w-6 h-6" />}
                        </div>
                      </div>
                      <div>
                        <h3 class="card-title">
                          {report.question?.question ||
                            `Question #${report.question_id}`}
                        </h3>
                        <div class="text-sm text-base-content/60">
                          Reported:{" "}
                          {new Date(report.reported_at).toLocaleString()}
                          {report.user_id && (
                            <span class="ml-2">
                              by User:{" "}
                              <span class="font-mono text-secondary">
                                {report.user_id}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div class="divider my-2">Feedback</div>

                    <div class="bg-base-300 p-4 rounded-lg my-2">
                      <p class="whitespace-pre-wrap">{report.reason}</p>
                    </div>

                    {report.question && (
                      <>
                        <div class="divider my-2">Question Details</div>
                        <div class="bg-base-300 p-4 rounded-lg my-2">
                          <div class="mb-2">
                            <span class="font-bold">Question:</span>{" "}
                            {report.question.question}
                          </div>
                          <div class="mb-2">
                            <span class="font-bold">Correct Answer:</span>{" "}
                            {report.question.correct_answer}
                          </div>
                          <div class="mb-2">
                            <span class="font-bold">Explanation:</span>{" "}
                            {report.question.explanation}
                          </div>
                        </div>

                        <div class="card-actions justify-end mt-2">
                          <a
                            href={`/admin/question-generator?edit=${report.question_id}`}
                            class="btn btn-primary btn-sm"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit Question
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
