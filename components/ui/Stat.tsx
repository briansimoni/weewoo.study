import type { ComponentChildren } from "preact";

// Full class names only (see Button.tsx).
const TONES = {
  default: "",
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
} as const;

interface StatProps {
  title: ComponentChildren;
  value: ComponentChildren;
  /** Small text under the value. */
  description?: ComponentChildren;
  tone?: keyof typeof TONES;
}

export function Stat(
  { title, value, description, tone = "default" }: StatProps,
) {
  return (
    // min-w-0 lets a stat shrink inside a grid instead of widening the page.
    <div class="stat bg-base-200 rounded-box border-none min-w-0 p-4">
      <div class="stat-title whitespace-normal">{title}</div>
      <div
        class={[
          "stat-value text-2xl sm:text-4xl whitespace-normal",
          TONES[tone],
        ].filter(Boolean).join(" ")}
      >
        {value}
      </div>
      {description && <div class="stat-desc">{description}</div>}
    </div>
  );
}

/** Two stats per row from the smallest screens up. */
export function StatGrid(
  { class: extra, children }: { class?: string; children?: ComponentChildren },
) {
  return (
    <div class={["grid grid-cols-2 gap-3", extra].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
