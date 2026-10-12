import { useRef, useState } from "preact/hooks";
import { RotateCcw } from "lucide-preact";
import { Button } from "../../components/ui/Button.tsx";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.tsx";

/**
 * The users page's Reset Stats button. It asks first, then submits the same
 * form POST as before (routes/admin/users.tsx).
 */
export default function ResetStatsButton(
  { userId, displayName, answered }: {
    userId: string;
    displayName: string;
    /** Questions answered; nothing to reset at 0. */
    answered: number;
  },
) {
  const form = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // The dialog stays outside the form: Modal has its own <form method="dialog">,
  // and a nested form would make a backdrop click submit the reset.
  return (
    <>
      <form ref={form} method="POST" class="inline">
        <input type="hidden" name="action" value="reset_stats" />
        <input type="hidden" name="userId" value={userId} />
        <Button
          variant="warning"
          size="xs"
          disabled={answered === 0}
          aria-label={`Reset stats for ${displayName}`}
          onClick={() => setConfirming(true)}
        >
          <RotateCcw class="size-3" />
          Reset Stats
        </Button>
      </form>
      <ConfirmDialog
        open={confirming}
        title={`Reset ${displayName}'s stats?`}
        confirmLabel="Reset stats"
        tone="error"
        loading={submitting}
        onConfirm={() => {
          setSubmitting(true);
          form.current?.submit();
        }}
        onCancel={() => setConfirming(false)}
      >
        Their {answered} answered {answered === 1 ? "question" : "questions"}
        {" "}
        and correct count go back to zero, which also drops them on the
        leaderboard. This can't be undone.
      </ConfirmDialog>
    </>
  );
}
