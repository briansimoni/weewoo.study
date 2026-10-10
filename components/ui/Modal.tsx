import type { ComponentChildren } from "preact";
import { useEffect, useId, useRef } from "preact/hooks";

interface ModalProps {
  open: boolean;
  /** Called when the modal closes itself: Escape, or a click outside. */
  onClose: () => void;
  title?: ComponentChildren;
  /** Buttons along the bottom, right-aligned. */
  actions?: ComponentChildren;
  /** Extra classes on the box, e.g. `max-w-3xl`. */
  class?: string;
  /** Alias of `class`, for React-style callers. */
  className?: string;
  children?: ComponentChildren;
}

/**
 * A modal dialog. It uses `<dialog>.showModal()`, so the browser handles
 * focus, Escape and the backdrop, rather than toggling `modal-open` by hand.
 */
export function Modal(
  { open, onClose, title, actions, class: extra, className, children }:
    ModalProps,
) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      class="modal"
      onClose={onClose}
      aria-labelledby={title ? titleId : undefined}
    >
      <div class={["modal-box", extra, className].filter(Boolean).join(" ")}>
        {title && <h3 id={titleId} class="font-bold text-lg">{title}</h3>}
        {children}
        {actions && <div class="modal-action">{actions}</div>}
      </div>
      {/* A click outside the box submits this form, which closes the dialog. */}
      <form method="dialog" class="modal-backdrop">
        <button type="submit">Close</button>
      </form>
    </dialog>
  );
}
