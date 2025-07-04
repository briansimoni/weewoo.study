import { Handlers, PageProps } from "$fresh/server.ts";
import {
  Question,
  QuestionReport,
  QuestionStore,
} from "../../../lib/question_store.ts";
import QuestionEditor from "../../../islands/QuestionEditor.tsx";
import DeleteQuestionButton from "../../../islands/DeleteQuestionButton.tsx";
import {
  Edit,
  FileText,
  Info,
  LayoutDashboard,
  LogOut,
  ThumbsDown,
  ThumbsUp,
} from "lucide-preact";

interface Data {
  question: Question | null;
  reports: QuestionReport[];
  error?: string;
}

export const handler: Handlers = {
  async GET(_req, ctx) {
    try {
      const questionId = ctx.params.id;
      const store = await QuestionStore.make();

      const question = await store.getQuestionById(questionId);

      // Get all reports and filter for this specific question
      const allReports = await store.getQuestionReports();
      const questionReports = allReports.filter((report) =>
        report.question_id === questionId
      );

      return ctx.render({ question, reports: questionReports });
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      return ctx.render({ question: null, reports: [], error: errorMessage });
    }
  },
};

export default function QuestionDetailsPage({ data }: PageProps<Data>) {
  const { question, reports, error } = data;

  return (
    <div class="bg-base-100 min-h-screen">
      <header class="bg-primary text-primary-content shadow-md py-4">
        <div class="container mx-auto px-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              <h1 class="text-xl font-bold">Question Details</h1>
            </div>
            <div class="flex gap-4">
              <a href="/admin" class="btn btn-ghost btn-sm">
                <LayoutDashboard className="w-4 h-4 mr-1" />
                Dashboard
              </a>
              <a href="/admin/questions" class="btn btn-ghost btn-sm">
                <LogOut className="w-4 h-4 mr-1" />
                Back to Questions
              </a>
            </div>
          </div>
        </div>
      </header>

      <div class="container mx-auto p-4 max-w-3xl">
        <div class="flex flex-col items-center mb-8 mt-4">
          <h1 class="text-3xl font-bold mb-2">Question Details</h1>
          <p class="text-base-content/70">
            View all details for this question
          </p>
        </div>

        {error && (
          <div class="alert alert-error mb-6">
            <Info className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {question
          ? (
            <div class="card bg-base-200 shadow-lg">
              <div class="card-body">
                <div class="grid grid-cols-1 gap-6">
                  {/* Question ID */}
                  <div>
                    <h2 class="text-sm font-medium text-base-content/70">
                      Question ID
                    </h2>
                    <p class="font-mono text-sm">{question.id}</p>
                  </div>

                  {/* Metadata Row */}
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h2 class="text-sm font-medium text-base-content/70">
                        Category
                      </h2>
                      <p class="font-medium">
                        <span class="badge badge-ghost">
                          {question.category}
                        </span>
                      </p>
                    </div>
                    <div>
                      <h2 class="text-sm font-medium text-base-content/70">
                        Scope
                      </h2>
                      <p class="font-medium">
                        <span class="badge badge-primary">
                          {question.scope}
                        </span>
                      </p>
                    </div>
                    <div>
                      <h2 class="text-sm font-medium text-base-content/70">
                        Created
                      </h2>
                      <p class="text-sm">
                        {new Date(question.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Raw JSON View */}
                  <div>
                    <details class="collapse collapse-arrow bg-base-100">
                      <summary class="collapse-title font-medium">
                        <div class="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Raw JSON Data
                        </div>
                      </summary>
                      <div class="collapse-content">
                        <pre class="bg-base-300 p-4 rounded-lg overflow-x-auto text-xs">
                          {JSON.stringify(question, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>

                  <div class="divider"></div>

                  {/* Question Text */}
                  <div>
                    <h2 class="text-lg font-bold mb-2">Question</h2>
                    <div class="bg-base-100 p-4 rounded-lg">
                      <p class="text-lg">{question.question}</p>
                    </div>
                  </div>

                  {/* Answer Choices */}
                  <div>
                    <h2 class="text-lg font-bold mb-2">Answer Choices</h2>
                    <div class="space-y-2">
                      {question.choices.map((choice, index) => (
                        <div
                          key={index}
                          class={`p-3 rounded-lg flex items-start gap-3 ${
                            index === question.correct_answer
                              ? "bg-success/20 border border-success"
                              : "bg-base-100"
                          }`}
                        >
                          <div
                            class={`badge badge-lg ${
                              index === question.correct_answer
                                ? "badge-success"
                                : "badge-outline"
                            }`}
                          >
                            {String.fromCharCode(65 + index)}
                          </div>
                          <div class="flex-1">
                            <p
                              class={index === question.correct_answer
                                ? "font-medium"
                                : ""}
                            >
                              {choice}
                            </p>
                            {index === question.correct_answer && (
                              <div class="flex items-center gap-1 text-success mt-1">
                                <ThumbsUp className="w-4 h-4" />
                                <span class="text-sm font-medium">
                                  Correct Answer
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <h2 class="text-lg font-bold mb-2">Explanation</h2>
                    <div class="bg-base-100 p-4 rounded-lg">
                      <p>{question.explanation}</p>
                    </div>
                  </div>

                  {/* Question Reports */}
                  {reports.length === 0 && (
                    <div>
                      <h2 class="text-lg font-bold mb-2">User Reports (0)</h2>
                      <div class="space-y-4">
                        <p>No reports found for this question.</p>
                      </div>
                    </div>
                  )}
                  {reports.length > 0 && (
                    <div>
                      <h2 class="text-lg font-bold mb-2">
                        User Reports ({reports.length})
                      </h2>
                      <div class="space-y-4">
                        {reports.map((report, index) => (
                          <div
                            key={index}
                            class="bg-base-100 p-4 rounded-lg border"
                          >
                            <div class="flex items-center gap-2 mb-2">
                              {report.thumbs === "up"
                                ? <ThumbsUp className="w-4 h-4 text-success" />
                                : <ThumbsDown className="w-4 h-4 text-error" />}
                              <span class="font-medium">
                                {report.thumbs === "up"
                                  ? "Positive"
                                  : "Negative"} Report
                              </span>
                              <div class="flex-1 text-right text-xs text-base-content/60">
                                {new Date(report.reported_at).toLocaleString()}
                              </div>
                            </div>
                            <p class="text-sm">{report.reason}</p>
                            {report.user_id && (
                              <div class="text-xs mt-2 text-base-content/60">
                                Reported by: {report.user_id}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div class="flex justify-end gap-2 mt-4">
                    <a
                      href="/admin/questions"
                      class="btn btn-ghost"
                    >
                      Back to List
                    </a>
                    <button
                      type="button"
                      class="btn btn-primary"
                      id="openEditModalBtn"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Question
                    </button>
                    {question && (
                      <DeleteQuestionButton questionId={question.id} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
          : (
            <div class="text-center p-12">
              <p class="text-xl text-base-content/60">Question not found</p>
              <a href="/admin/questions" class="btn btn-primary mt-4">
                Back to Questions
              </a>
            </div>
          )}
      </div>

      {/* Question Editor island */}
      {question && <QuestionEditor question={question} />}
    </div>
  );
}
