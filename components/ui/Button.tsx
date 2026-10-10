import type { ComponentChildren, JSX } from "preact";

// Full class names only: Tailwind finds classes by scanning source text, so
// it would miss names built at runtime like `btn-${variant}`.
const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  accent: "btn-accent",
  success: "btn-success",
  warning: "btn-warning",
  error: "btn-error",
  outline: "btn-outline",
  ghost: "btn-ghost",
  neutral: "",
} as const;

const SIZES = { xs: "btn-xs", sm: "btn-sm", md: "", lg: "btn-lg" } as const;

const SHAPES = {
  default: "",
  circle: "btn-circle",
  square: "btn-square",
  wide: "btn-wide",
  block: "btn-block",
} as const;

export interface ButtonStyle {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  shape?: keyof typeof SHAPES;
  /** Extra classes, e.g. margins. */
  class?: string;
  /** Alias of `class`, for React-style callers. */
  className?: string;
}

export function buttonClass(
  {
    variant = "primary",
    size = "md",
    shape = "default",
    class: extra,
    className,
  }: ButtonStyle,
): string {
  return [
    "btn",
    VARIANTS[variant],
    SIZES[size],
    SHAPES[shape],
    extra,
    className,
  ]
    .filter(Boolean).join(" ");
}

type ButtonProps =
  & ButtonStyle
  & Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "size" | "class">
  & {
    /** Shows a spinner and disables the button. */
    loading?: boolean;
    children?: ComponentChildren;
  };

export function Button(
  {
    variant,
    size,
    shape,
    class: extra,
    className,
    loading,
    disabled,
    type = "button",
    children,
    ...rest
  }: ButtonProps,
) {
  return (
    <button
      {...rest}
      type={type}
      class={buttonClass({ variant, size, shape, class: extra, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span class="loading loading-spinner loading-sm"></span>}
      {children}
    </button>
  );
}

type LinkButtonProps =
  & ButtonStyle
  & Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, "size" | "class">
  & { href: string; children?: ComponentChildren };

/** A link styled as a button. */
export function LinkButton(
  { variant, size, shape, class: extra, className, children, ...rest }:
    LinkButtonProps,
) {
  return (
    <a
      {...rest}
      class={buttonClass({ variant, size, shape, class: extra, className })}
    >
      {children}
    </a>
  );
}
