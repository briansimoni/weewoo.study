import { Handlers, PageProps } from "$fresh/server.ts";
import {
  Edit,
  FileText,
  Info,
  LayoutDashboard,
  PanelRight,
} from "lucide-preact";
import { Question, QuestionStore } from "../../lib/question_store.ts";

interface Data {
  questions: Question[];
  scope: string;
  error?: string;
}

const allowedScopes = ["emt", "advanced", "medic"] as const;
type Scope = (typeof allowedScopes)[number];

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    try {
      const url = new URL(req.url);

      // Get scope from query param, defaulting to "emt"
      const scope = (url.searchParams.get("scope") as Scope) || "emt";
      if (!allowedScopes.includes(scope)) {
        throw new Error("Invalid scope");
      }

      const store = await QuestionStore.make();

      let questions: Question[] = [];

      // Get optional category filter
      const category = url.searchParams.get("category");
      if (category) {
        questions = await store.listQuestions(category);
      } else {
        questions = await store.listQuestions();
      }

      // Sort questions by creation date (newest first)
      questions.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      return ctx.render({ questions, scope });
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      return ctx.render({ questions: [], scope: "emt", error: errorMessage });
    }
  },
};

export default function QuestionsPage({ data }: PageProps<Data>) {
  const { questions, scope, error } = data;

  // Get unique categories for filter dropdown
  const categories = [...new Set(questions.map((q) => q.category))].sort();

  return (
    <div class="bg-base-100 min-h-screen">
      <header class="bg-primary text-primary-content shadow-md py-4">
        <div class="container mx-auto px-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              <h1 class="text-xl font-bold">Question Library</h1>
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

      <div class="container mx-auto p-4 max-w-6xl">
        <div class="flex flex-col items-center mb-8 mt-4">
          <h1 class="text-3xl font-bold mb-2">Question Library</h1>
          <p class="text-base-content/70">
            View and manage all questions in the database
          </p>
        </div>

        {error && (
          <div class="alert alert-error mb-6">
            <Info className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <div class="mb-6 flex flex-wrap gap-4 justify-between items-center">
          <div class="flex flex-wrap gap-3">
            <div class="join">
              <a
                href={`/admin/questions?scope=emt`}
                class={`btn join-item ${scope === "emt" ? "btn-primary" : ""}`}
              >
                EMT
              </a>
              <a
                href={`/admin/questions?scope=advanced`}
                class={`btn join-item ${
                  scope === "advanced" ? "btn-primary" : ""
                }`}
              >
                Advanced
              </a>
              <a
                href={`/admin/questions?scope=medic`}
                class={`btn join-item ${
                  scope === "medic" ? "btn-primary" : ""
                }`}
              >
                Medic
              </a>
            </div>

            {categories.length > 0 && (
              <div class="dropdown dropdown-bottom">
                <div tabIndex={0} role="button" class="btn">
                  Filter by Category
                  <PanelRight className="w-4 h-4" />
                </div>
                <ul
                  tabIndex={0}
                  class="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-52 max-h-96 overflow-y-auto"
                >
                  <li>
                    <a href={`/admin/questions?scope=${scope}`}>
                      All Categories
                    </a>
                  </li>
                  {categories.map((cat) => (
                    <li>
                      <a
                        href={`/admin/questions?scope=${scope}&category=${
                          encodeURIComponent(
                            cat,
                          )
                        }`}
                      >
                        {cat}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <span class="badge badge-lg">{questions.length} Questions</span>
          </div>
        </div>

        {questions.length === 0
          ? (
            <div class="text-center p-12">
              <p class="text-xl text-base-content/60">No questions found</p>
            </div>
          )
          : (
            <div class="overflow-x-auto">
              <table class="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Question</th>
                    <th>Category</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((question) => (
                    <tr key={question.id}>
                      <td class="font-mono text-sm">
                        {question.id.substring(0, 8)}...
                      </td>
                      <td class="max-w-md">
                        <div class="font-medium">{question.question}</div>
                        <div class="text-sm text-base-content/70">
                          {question.choices.map((choice, i) => (
                            <span
                              class={`mr-2 ${
                                i === question.correct_answer
                                  ? "font-bold text-success"
                                  : ""
                              }`}
                            >
                              {String.fromCharCode(65 + i)}: {choice}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span class="badge badge-ghost">
                          {question.category}
                        </span>
                      </td>
                      <td class="text-sm">
                        {new Date(question.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div class="flex gap-2">
                          <a
                            href={`/admin/questions/${question.id}`}
                            class="btn btn-square btn-ghost btn-xs"
                            title="View Details"
                          >
                            <Info className="w-4 h-4" />
                          </a>
                          <button
                            class="btn btn-square btn-ghost btn-xs"
                            title="Edit Question"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
