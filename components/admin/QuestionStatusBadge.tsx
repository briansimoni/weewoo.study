import type { QuestionStatus } from "../../lib/question_store.ts";
import { Badge, type BadgeTone } from "../ui/Badge.tsx";

export const STATUS_LABELS: Record<QuestionStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  retired: "Retired",
};

const TONES: Record<QuestionStatus, BadgeTone> = {
  draft: "ghost",
  in_review: "warning",
  published: "success",
  retired: "outline",
};

/** A question's status. Only published questions are served in practice. */
export function QuestionStatusBadge(
  { status, size }: { status: QuestionStatus; size?: "sm" | "md" },
) {
  return (
    <Badge tone={TONES[status]} size={size}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
