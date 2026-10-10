import { X } from "lucide-preact";
import { ALERT_TONES } from "../components/ui/Alert.tsx";
import { dismissToast, toasts } from "../components/ui/toast.ts";

/** Renders `showToast` messages. Mounted once, in the layout. */
export default function Toaster() {
  if (toasts.value.length === 0) return null;
  return (
    // Above the mobile dock (z-index 1) and below open modals.
    <div class="toast toast-top toast-end z-50" aria-live="polite">
      {toasts.value.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          class={`alert ${ALERT_TONES[toast.tone]} max-w-sm shadow-lg`}
        >
          <div class="flex flex-col gap-1 whitespace-normal">
            <span>{toast.message}</span>
            {toast.action && (
              <a href={toast.action.href} class="text-sm underline">
                {toast.action.label}
              </a>
            )}
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle"
            aria-label="Dismiss"
            onClick={() => dismissToast(toast.id)}
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
