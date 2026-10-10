import type { ComponentChildren } from "preact";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-preact";
import type { ToastTone } from "./toast.ts";

// Full class names only (see Button.tsx).
export const ALERT_TONES: Record<ToastTone, string> = {
  info: "alert-info",
  success: "alert-success",
  warning: "alert-warning",
  error: "alert-error",
};

const ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

/** An inline message, e.g. a form's success or error. */
export function Alert(
  { tone = "info", class: extra, children }: {
    tone?: ToastTone;
    class?: string;
    children?: ComponentChildren;
  },
) {
  const Icon = ICONS[tone];
  return (
    <div
      // Errors interrupt screen readers; other tones wait their turn.
      role={tone === "error" ? "alert" : "status"}
      class={["alert", ALERT_TONES[tone], extra].filter(Boolean).join(" ")}
    >
      <Icon class="shrink-0 h-6 w-6" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
