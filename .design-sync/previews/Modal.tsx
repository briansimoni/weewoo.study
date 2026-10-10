import { Button, Modal } from "weewoo-ui";

export function FeedbackDialog() {
  return (
    <Modal
      open
      onClose={() => {}}
      title="What issues did you find with this question?"
      actions={
        <>
          <Button variant="outline">Cancel</Button>
          <Button>Submit</Button>
        </>
      }
    >
      <textarea
        class="textarea textarea-bordered w-full h-32 my-4"
        aria-label="Feedback"
        defaultValue="The explanation doesn't match the correct answer."
      />
    </Modal>
  );
}
