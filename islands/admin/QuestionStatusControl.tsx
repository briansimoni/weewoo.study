import { useState } from "preact/hooks";
import {
  QUESTION_STATUSES,
  type QuestionStatus,
  type Scope,
} from "../../lib/question_store.ts";
import { STATUS_LABELS } from "../../components/admin/QuestionStatusBadge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.tsx";
import { showToast } from "../../components/ui/toast.ts";

/**
 * Changes a question's status. Only published questions are served, so taking
 * one out of practice asks first.
 */
export default function QuestionStatusControl(
  { questionId, scope, status }: {
    questionId: string;
    scope: Scope;
    status: QuestionStatus;
  },
) {
  const [next, setNext] = useState<QuestionStatus>(status);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const leavesPractice = status === "published" && next !== "published";

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/questions/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, scope, status: next }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }
      globalThis.location.reload();
    } catch (error) {
      setSaving(false);
      setConfirming(false);
      showToast(
        `Couldn't change the status: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { tone: "error" },
      );
    }
  }

  return (
    <div class="flex flex-wrap items-center gap-2">
      <select
        class="select select-sm w-auto"
        aria-label="Status"
        value={next}
        onChange={(e) =>
          setNext((e.target as HTMLSelectElement).value as QuestionStatus)}
      >
        {QUESTION_STATUSES.map((value) => (
          <option key={value} value={value}>{STATUS_LABELS[value]}</option>
        ))}
      </select>
      <Button
        size="sm"
        variant="outline"
        disabled={next === status}
        loading={saving && !confirming}
        onClick={() => leavesPractice ? setConfirming(true) : save()}
      >
        Change status
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Take this question out of practice?"
        confirmLabel={`Mark ${STATUS_LABELS[next].toLowerCase()}`}
        tone="warning"
        loading={saving}
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      >
        Only published questions are served. It stays in the bank, and you can
        publish it again any time.
      </ConfirmDialog>
    </div>
  );
}
