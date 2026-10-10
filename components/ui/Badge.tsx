import type { ComponentChildren } from "preact";

// Full class names only (see Button.tsx).
const TONES = {
  neutral: "",
  primary: "badge-primary",
  secondary: "badge-secondary",
  accent: "badge-accent",
  info: "badge-info",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  outline: "badge-outline",
  ghost: "badge-ghost",
} as const;

const SIZES = {
  xs: "badge-xs",
  sm: "badge-sm",
  md: "",
  lg: "badge-lg",
} as const;

export type BadgeTone = keyof typeof TONES;

interface BadgeProps {
  tone?: BadgeTone;
  size?: keyof typeof SIZES;
  class?: string;
  /** Alias of `class`, for React-style callers. */
  className?: string;
  children?: ComponentChildren;
}

export function Badge(
  {
    tone = "neutral",
    size = "md",
    class: extra,
    className,
    children,
    ...rest
  }:
    & BadgeProps
    & { "data-testid"?: string },
) {
  return (
    <span
      {...rest}
      class={["badge", TONES[tone], SIZES[size], extra, className].filter(
        Boolean,
      ).join(
        " ",
      )}
    >
      {children}
    </span>
  );
}

/** A small count pinned to the top-right corner of an icon button. */
export function CountBadge(
  { count, max = 99, ...rest }: {
    count: number;
    max?: number;
    "data-testid"?: string;
  },
) {
  return (
    <Badge
      {...rest}
      tone="primary"
      size="sm"
      class="indicator-item min-w-5 px-1"
    >
      {count > max ? `${max}+` : count}
    </Badge>
  );
}
