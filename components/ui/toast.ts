import { signal } from "@preact/signals";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  /** An optional link shown under the message, e.g. "Go to cart". */
  action?: { label: string; href: string };
}

export interface ToastOptions {
  tone?: ToastTone;
  action?: Toast["action"];
  /** Milliseconds before it disappears; 0 keeps it until dismissed. */
  duration?: number;
}

/**
 * Toasts on screen, rendered by the Toaster island in the layout. Islands share
 * this module in the browser, so any island can call `showToast`.
 */
export const toasts = signal<Toast[]>([]);

let nextId = 1;

/** Errors stay longer: they're usually what someone needs to read. */
const DEFAULT_DURATION: Record<ToastTone, number> = {
  info: 4000,
  success: 4000,
  warning: 6000,
  error: 8000,
};

/** Show a toast instead of a blocking browser `alert()`. Returns its ID. */
export function showToast(message: string, options: ToastOptions = {}) {
  const { tone = "info", action } = options;
  const toast: Toast = { id: nextId++, message, tone, action };
  toasts.value = [...toasts.value, toast];
  const duration = options.duration ?? DEFAULT_DURATION[tone];
  if (duration > 0) setTimeout(() => dismissToast(toast.id), duration);
  return toast.id;
}

export function dismissToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}
