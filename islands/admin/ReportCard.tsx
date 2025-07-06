import { ThumbsDown, ThumbsUp } from "lucide-preact";
import { QuestionReport } from "../../lib/question_store.ts";
import { useState } from "preact/hooks";

interface Props {
  report: QuestionReport;
}

export default function ReportCard({ report }: Props) {
  const [resolved, setResolved] = useState(false);

  async function resolveReport() {
    const response = await fetch("/api/admin/questions/report/resolve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionId: report.question_id,
        reportId: report.report_id,
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to resolve report");
    }
    setResolved(true);
  }

  if (resolved) {
    // animate the card to slide up and fade out
    return (
      <div class="bg-base-100 p-4 rounded-lg border">
        <div class="flex items-center gap-2 mb-2">
          <ThumbsUp className="w-4 h-4 text-success" />
          <span class="font-medium">Resolved</span>
        </div>
      </div>
    );
  }

  return (
    <div class="bg-base-100 p-4 rounded-lg border">
      <div class="flex items-center gap-2 mb-2">
        {report.thumbs === "up"
          ? <ThumbsUp className="w-4 h-4 text-success" />
          : <ThumbsDown className="w-4 h-4 text-error" />}
        <span class="font-medium">
          {report.thumbs === "up" ? "Positive" : "Negative"} Report
        </span>
        <div class="flex-1 text-right text-xs text-base-content/60">
          {new Date(report.reported_at).toLocaleString()}
        </div>
      </div>
      <p class="text-sm">{report.reason}</p>
      <div class="flex justify-between items-center mt-2">
        {report.user_id && (
          <div class="text-xs text-base-content/60">
            Reported by: {report.user_id}
          </div>
        )}
        {!report.resolved_at && (
          <button
            onClick={resolveReport}
            class="btn btn-xs btn-outline btn-accent"
            type="button"
          >
            Resolve
          </button>
        )}
        {report.resolved_at && (
          <span class="text-xs text-success">Resolved</span>
        )}
      </div>
    </div>
  );
}
