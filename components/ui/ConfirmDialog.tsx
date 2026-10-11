import type { ComponentChildren } from "preact";
import { Button } from "./Button.tsx";
import { Modal } from "./Modal.tsx";

interface ConfirmDialogProps {
  open: boolean;
  title: ComponentChildren;
  /** The confirm button's label, e.g. "Delete". */
  confirmLabel: string;
  /** "error" for destructive actions. */
  tone?: "primary" | "error" | "warning";
  /** Shows a spinner on the confirm button while the action runs. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ComponentChildren;
}

/** A modal that asks before doing something, instead of `confirm()`. */
export function ConfirmDialog(
  {
    open,
    title,
    confirmLabel,
    tone = "primary",
    loading,
    onConfirm,
    onCancel,
    children,
  }: ConfirmDialogProps,
) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      actions={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children && <div class="py-4">{children}</div>}
    </Modal>
  );
}
