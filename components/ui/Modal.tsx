import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

// Shared by every island on the page (islands share modules in the browser),
// so title IDs are unique page-wide. useId() isn't: each island is its own
// Preact root, and two islands' modals got the same ID.
let nextTitleId = 0;

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
  // A plain-text title names the dialog directly. Anything richer (an icon)
  // is referenced by an ID assigned in the browser, where it's unique.
  const label = typeof title === "string" ? title : undefined;
  const [titleId, setTitleId] = useState<string>();
  useEffect(() => {
    if (title && !label) setTitleId(`modal-title-${++nextTitleId}`);
  }, []);

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
      aria-label={label}
      aria-labelledby={label ? undefined : titleId}
    >
      <div class={["modal-box", extra, className].filter(Boolean).join(" ")}>
        {title && (
          <h3 id={label ? undefined : titleId} class="font-bold text-lg">
            {title}
          </h3>
        )}
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
