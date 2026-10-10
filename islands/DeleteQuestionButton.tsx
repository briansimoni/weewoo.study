import { useState } from "preact/hooks";
import { Trash } from "lucide-preact";
import { Button } from "../components/ui/Button.tsx";
import { Modal } from "../components/ui/Modal.tsx";
import { showToast } from "../components/ui/toast.ts";

export default function DeleteQuestionButton(
  { questionId }: { questionId: string },
) {
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        globalThis.location.href = "/admin/questions?deleted=true";
        return;
      }
      const error = await response.json().catch(() => ({}));
      showToast(
        `Failed to delete question: ${error.message || "Unknown error"}`,
        { tone: "error" },
      );
    } catch (error) {
      console.error("Error deleting question:", error);
      showToast("An error occurred while deleting the question", {
        tone: "error",
      });
    }
    setIsDeleting(false);
    setConfirming(false);
  };

  return (
    <>
      <Button variant="error" onClick={() => setConfirming(true)}>
        <Trash className="w-4 h-4" />
        Delete Question
      </Button>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete this question?"
        actions={
          <>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="error" loading={isDeleting} onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p class="py-4">This can't be undone.</p>
      </Modal>
    </>
  );
}
