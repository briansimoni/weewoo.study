import { page, type PageProps } from "fresh";
import { Handlers } from "fresh/compat";
import {
  parseScope,
  type Question,
  type QuestionReport,
  QuestionStore,
  type Scope,
} from "../../../lib/question_store.ts";
import { AdminPage } from "../../../components/admin/AdminPage.tsx";
import { SCOPE_LABELS } from "../../../components/admin/ScopeTabs.tsx";
import { Badge } from "../../../components/ui/Badge.tsx";
import { Card } from "../../../components/ui/Card.tsx";
import QuestionEditor from "../../../islands/QuestionEditor.tsx";
import DeleteQuestionButton from "../../../islands/DeleteQuestionButton.tsx";
import ReportCard from "../../../islands/admin/ReportCard.tsx";

interface Data {
  question: Question | null;
  reports: QuestionReport[];
  scope: Scope;
}

export const handler: Handlers<Data> = {
  async GET(ctx) {
    const scope = parseScope(new URL(ctx.req.url).searchParams.get("scope")) ??
      "emt";
    const store = await QuestionStore.make(undefined, scope);
    const question = await store.getQuestionById(ctx.params.id).catch(() =>
      null
    );
    // Open reports first, newest first within each group.
    const reports = question
      ? (await store.getQuestionReports(question.id)).sort((a, b) =>
        Number(!!a.resolved_at) - Number(!!b.resolved_at)
      )
      : [];
    return page({ question, reports, scope }, {
      status: question ? 200 : 404,
    });
  },
};

export default function QuestionDetailsPage({ data }: PageProps<Data>) {
  const { question, reports, scope } = data;
  const back = { href: `/admin/questions?scope=${scope}`, label: "Questions" };

  if (!question) {
    return (
      <AdminPage
        title="Question not found"
        section="questions"
        back={back}
        width="narrow"
        description={`No ${
          SCOPE_LABELS[scope]
        } question has this ID. It may have been edited (which changes the ID) or deleted.`}
      />
    );
  }

  const open = reports.filter((r) => !r.resolved_at).length;

  return (
    <AdminPage
      title="Question"
      section="questions"
      back={back}
      width="narrow"
      actions={
        <>
          <QuestionEditor question={question} scope={scope} />
          <DeleteQuestionButton questionId={question.id} scope={scope} />
        </>
      }
    >
      <div class="flex flex-col gap-6">
        <Card bodyClass="gap-5">
          <div class="flex flex-wrap items-center gap-2">
            <Badge tone="primary">{SCOPE_LABELS[scope]}</Badge>
            <Badge tone="ghost">{question.category}</Badge>
            <span class="text-sm text-base-content/60">
              Created {new Date(question.created_at).toLocaleString()}
              {question.updated_at !== question.created_at &&
                ` · updated ${new Date(question.updated_at).toLocaleString()}`}
            </span>
          </div>

          <p class="text-lg font-medium">{question.question}</p>

          <ol class="flex flex-col gap-2" aria-label="Answer choices">
            {question.choices.map((choice, index) => {
              const correct = index === question.correct_answer;
              return (
                <li
                  key={index}
                  class={`flex items-start gap-3 rounded-field border p-3 ${
                    correct ? "border-success bg-success/10" : "border-base-300"
                  }`}
                >
                  <span
                    class={`badge shrink-0 font-mono ${
                      correct ? "badge-success" : "badge-outline"
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span class="flex-1">{choice}</span>
                  {correct && (
                    <span class="text-sm font-medium text-success">
                      Correct
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          <div>
            <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-base-content/60">
              Explanation
            </h2>
            <p>{question.explanation}</p>
          </div>

          <details class="text-sm">
            <summary class="cursor-pointer text-base-content/70">
              ID and raw JSON
            </summary>
            <p class="mt-2 font-mono break-all">{question.id}</p>
            <pre class="mt-2 overflow-x-auto rounded-field bg-base-200 p-3 text-xs">
              {JSON.stringify(question, null, 2)}
            </pre>
          </details>
        </Card>

        <section aria-labelledby="reports-heading">
          <h2 id="reports-heading" class="mb-3 text-xl font-bold">
            Reports{" "}
            <span class="text-base font-normal text-base-content/60">
              {reports.length === 0
                ? "none yet"
                : `${open} open of ${reports.length}`}
            </span>
          </h2>
          <div class="flex flex-col gap-3">
            {reports.map((report) => (
              <ReportCard
                key={report.report_id}
                report={report}
                scope={scope}
              />
            ))}
          </div>
        </section>
      </div>
    </AdminPage>
  );
}
