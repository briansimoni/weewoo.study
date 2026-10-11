import { page, type PageProps } from "fresh";
import { Handlers } from "fresh/compat";
import {
  parseScope,
  type Question,
  type QuestionReport,
  QuestionStore,
  type Scope,
} from "../../lib/question_store.ts";
import { AdminPage } from "../../components/admin/AdminPage.tsx";
import {
  ScopeTabs,
  SegmentedLinks,
} from "../../components/admin/ScopeTabs.tsx";
import { LinkButton } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { Stat, StatGrid } from "../../components/ui/Stat.tsx";
import ReportCard from "../../islands/admin/ReportCard.tsx";

const STATUSES = { open: "Open", resolved: "Resolved", all: "All" } as const;
const KINDS = { all: "All", down: "Negative", up: "Positive" } as const;
type Status = keyof typeof STATUSES;
type Kind = keyof typeof KINDS;

interface Data {
  reports: (QuestionReport & { question?: Question })[];
  counts: {
    open: number;
    negative: number;
    positive: number;
    resolved: number;
  };
  scope: Scope;
  status: Status;
  kind: Kind;
}

function oneOf<T extends string>(
  options: Record<T, string>,
  value: string | null,
  fallback: T,
): T {
  return value !== null && value in options ? value as T : fallback;
}

export const handler: Handlers<Data> = {
  async GET(ctx) {
    const params = new URL(ctx.req.url).searchParams;
    const scope = parseScope(params.get("scope")) ?? "emt";
    const status = oneOf<Status>(STATUSES, params.get("status"), "open");
    const kind = oneOf<Kind>(KINDS, params.get("kind"), "all");

    const store = await QuestionStore.make(undefined, scope);
    const all = await store.getQuestionReports();
    const open = all.filter((r) => !r.resolved_at);
    const counts = {
      open: open.length,
      negative: open.filter((r) => r.thumbs === "down").length,
      positive: open.filter((r) => r.thumbs === "up").length,
      resolved: all.length - open.length,
    };

    const shown = all.filter((r) =>
      (status === "all" || (status === "open") === !r.resolved_at) &&
      (kind === "all" || r.thumbs === kind)
    );
    // One lookup per question, not per report.
    const questions = new Map<string, Question | undefined>();
    for (const id of new Set(shown.map((r) => r.question_id))) {
      questions.set(id, await store.getQuestionById(id).catch(() => undefined));
    }
    const reports = shown.map((r) => ({
      ...r,
      question: questions.get(r.question_id),
    }));

    return page({ reports, counts, scope, status, kind });
  },
};

export default function QuestionReports({ data }: PageProps<Data>) {
  const { reports, counts, scope, status, kind } = data;
  const href = (next: { status?: Status; kind?: Kind }) =>
    `/admin/question-reports?scope=${scope}&status=${
      next.status ?? status
    }&kind=${next.kind ?? kind}`;

  return (
    <AdminPage
      title="Question reports"
      section="reports"
      description="Thumbs up and down from practice, with the reason the user gave."
      actions={
        <LinkButton
          href="/admin/questions/question-reports-stats"
          variant="outline"
        >
          Reporters
        </LinkButton>
      }
    >
      <Card class="mb-6">
        <StatGrid class="sm:grid-cols-4">
          <Stat title="Open" value={counts.open} />
          <Stat title="Open, negative" value={counts.negative} tone="error" />
          <Stat title="Open, positive" value={counts.positive} tone="success" />
          <Stat title="Resolved" value={counts.resolved} />
        </StatGrid>
      </Card>

      <div class="mb-4 flex flex-wrap items-center gap-3">
        <ScopeTabs path="/admin/question-reports" current={scope} />
        <SegmentedLinks
          label="Status"
          options={STATUSES}
          current={status}
          href={(s) => href({ status: s })}
        />
        <SegmentedLinks
          label="Type"
          options={KINDS}
          current={kind}
          href={(k) => href({ kind: k })}
        />
      </div>

      {reports.length === 0
        ? (
          <div class="rounded-box bg-base-100 p-10 text-center text-base-content/70">
            {status === "open" && kind === "all"
              ? "No open reports. Clean call."
              : "No reports match these filters."}
          </div>
        )
        : (
          <div class="grid gap-3 lg:grid-cols-2">
            {reports.map((report) => (
              <ReportCard
                key={report.report_id}
                report={report}
                scope={scope}
                question={{
                  text: report.question?.question ??
                    `Missing question ${report.question_id}`,
                  correctAnswer: report.question
                    ?.choices[report.question.correct_answer],
                }}
              />
            ))}
          </div>
        )}
    </AdminPage>
  );
}
