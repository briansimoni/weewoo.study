// Full class names only (see Button.tsx).
const TONES = {
  neutral: "",
  primary: "progress-primary",
  secondary: "progress-secondary",
  accent: "progress-accent",
  success: "progress-success",
  warning: "progress-warning",
  error: "progress-error",
} as const;

interface ProgressBarProps {
  /** Omit for an indeterminate (busy) bar. */
  value?: number;
  max?: number;
  tone?: keyof typeof TONES;
  /** What's progressing, for screen readers, e.g. "Daily goal". */
  label: string;
  class?: string;
  /** Alias of `class`, for React-style callers. */
  className?: string;
}

export function ProgressBar(
  { value, max = 100, tone = "primary", label, class: extra, className }:
    ProgressBarProps,
) {
  return (
    <progress
      class={[
        "progress",
        TONES[tone],
        extra ?? className ?? "w-full",
        extra && className,
      ].filter(Boolean).join(" ")}
      value={value}
      max={max}
      aria-label={label}
    >
      {value === undefined ? undefined : `${Math.round((value / max) * 100)}%`}
    </progress>
  );
}
