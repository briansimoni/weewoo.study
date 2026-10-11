import { CheckCircle, ThumbsDown, ThumbsUp } from "lucide-preact";
import { useState } from "preact/hooks";
import type { QuestionReport, Scope } from "../../lib/question_store.ts";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { showToast } from "../../components/ui/toast.ts";

interface Props {
  report: QuestionReport;
  scope: Scope;
  /** The reported question, shown with a link on the reports page. */
  question?: { text: string; correctAnswer?: string };
}

/** One user report on a question, with a Resolve button while it's open. */
export default function ReportCard({ report, scope, question }: Props) {
  const [resolvedAt, setResolvedAt] = useState(report.resolved_at);
  const [resolving, setResolving] = useState(false);
  const positive = report.thumbs === "up";

  async function resolveReport() {
    setResolving(true);
    try {
      const response = await fetch("/api/admin/questions/report/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: report.question_id,
          reportId: report.report_id,
          scope,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setResolvedAt(new Date().toISOString());
    } catch (error) {
      console.error("Failed to resolve report:", error);
      showToast("Couldn't resolve the report. Try again.", { tone: "error" });
    } finally {
      setResolving(false);
    }
  }

  return (
    <article
      class={`rounded-box border border-base-300 bg-base-100 p-4 ${
        resolvedAt ? "opacity-70" : ""
      }`}
      data-testid="report-card"
    >
      <div class="flex flex-wrap items-center gap-2">
        {positive
          ? <ThumbsUp class="size-4 text-success" aria-hidden="true" />
          : <ThumbsDown class="size-4 text-error" aria-hidden="true" />}
        <span class="font-medium">
          {positive ? "Positive" : "Negative"} report
        </span>
        {resolvedAt && <Badge tone="success" size="sm">Resolved</Badge>}
        <span class="ml-auto text-xs text-base-content/60">
          {new Date(report.reported_at).toLocaleString()}
        </span>
      </div>

      {question && (
        <div class="mt-3">
          <a
            href={`/admin/questions/${report.question_id}?scope=${scope}`}
            class="link link-hover font-medium"
          >
            {question.text}
          </a>
          {question.correctAnswer && (
            <p class="mt-1 text-sm text-success">✓ {question.correctAnswer}</p>
          )}
        </div>
      )}

      <blockquote class="mt-3 whitespace-pre-wrap rounded-field bg-base-200 p-3">
        {report.reason}
      </blockquote>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span class="font-mono text-xs text-base-content/60">
          {report.user_id ?? "Anonymous"}
        </span>
        {resolvedAt
          ? (
            <span class="inline-flex items-center gap-1 text-sm text-success">
              <CheckCircle class="size-4" aria-hidden="true" />
              Resolved {new Date(resolvedAt).toLocaleDateString()}
            </span>
          )
          : (
            <Button
              size="sm"
              variant="outline"
              loading={resolving}
              onClick={resolveReport}
            >
              Resolve
            </Button>
          )}
      </div>
    </article>
  );
}
