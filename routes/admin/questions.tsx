import { page, type PageProps } from "fresh";
import { Handlers } from "fresh/compat";
import {
  parseScope,
  Question,
  QuestionStore,
  type Scope,
} from "../../lib/question_store.ts";
import { AdminPage } from "../../components/admin/AdminPage.tsx";
import { ScopeTabs } from "../../components/admin/ScopeTabs.tsx";
import { Alert } from "../../components/ui/Alert.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button, LinkButton } from "../../components/ui/Button.tsx";
import { filterQuestions } from "../../lib/question_filter.ts";

interface Data {
  questions: Question[];
  /** Every category in this bank, for the filter. */
  categories: string[];
  /** Questions in the bank before filtering. */
  total: number;
  scope: Scope;
  category: string;
  search: string;
  deleted: boolean;
}

export const handler: Handlers<Data> = {
  async GET(ctx) {
    const params = new URL(ctx.req.url).searchParams;
    const scope = parseScope(params.get("scope")) ?? "emt";
    const category = params.get("category") ?? "";
    const search = (params.get("q") ?? "").trim();

    const store = await QuestionStore.make(undefined, scope);
    const all = await store.listQuestions();
    const questions = filterQuestions(all, { category, search })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const categories = [...new Set(all.map((q) => q.category))].sort();

    return page({
      questions,
      categories,
      total: all.length,
      scope,
      category,
      search,
      deleted: params.has("deleted"),
    });
  },
};

export default function QuestionsPage({ data }: PageProps<Data>) {
  const { questions, categories, total, scope, category, search, deleted } =
    data;
  const filtered = Boolean(category || search);

  return (
    <AdminPage
      title="Questions"
      section="questions"
      description="Every question in the bank. Open one to edit it, delete it or resolve its reports."
      actions={
        <LinkButton href="/admin/question-generator" variant="outline">
          Generate questions
        </LinkButton>
      }
    >
      {deleted && <Alert tone="success" class="mb-4">Question deleted.</Alert>}

      <div class="mb-4 flex flex-wrap items-center gap-3">
        <ScopeTabs path="/admin/questions" current={scope} />
        <form
          method="get"
          class="flex flex-1 flex-wrap items-center gap-2"
          role="search"
        >
          <input type="hidden" name="scope" value={scope} />
          <select
            name="category"
            class="select select-sm w-auto"
            aria-label="Category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c} selected={c === category}>{c}</option>
            ))}
          </select>
          <input
            type="search"
            name="q"
            value={search}
            placeholder="Search text, choices or ID"
            aria-label="Search questions"
            class="input input-sm min-w-48 flex-1"
          />
          <Button type="submit" size="sm">Filter</Button>
          {filtered && (
            <a href={`/admin/questions?scope=${scope}`} class="link text-sm">
              Clear
            </a>
          )}
        </form>
      </div>

      <p class="mb-2 text-sm text-base-content/70" data-testid="question-count">
        {filtered
          ? `${questions.length} of ${total} questions`
          : `${total} questions`}
      </p>

      {questions.length === 0
        ? (
          <div class="rounded-box bg-base-100 p-10 text-center text-base-content/70">
            {total === 0
              ? "This bank has no questions yet."
              : "No questions match these filters."}
          </div>
        )
        : (
          <div class="overflow-x-auto rounded-box bg-base-100">
            <table class="table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Category</th>
                  <th class="whitespace-nowrap">Created</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id} class="hover:bg-base-200/60">
                    <td class="min-w-72">
                      <a
                        href={`/admin/questions/${q.id}?scope=${scope}`}
                        class="link link-hover font-medium"
                      >
                        {q.question}
                      </a>
                      <p class="mt-1 text-sm text-success">
                        ✓ {q.choices[q.correct_answer]}
                      </p>
                    </td>
                    <td>
                      <Badge tone="ghost" class="h-auto py-1">
                        {q.category}
                      </Badge>
                    </td>
                    <td class="whitespace-nowrap text-sm text-base-content/70">
                      {new Date(q.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </AdminPage>
  );
}
