import type { ComponentChildren } from "preact";

const TONES = {
  /** On the page background: the default content surface. */
  raised: "bg-base-100 shadow-xl",
  /** A quieter panel inside a raised card or page section. */
  muted: "bg-base-200",
} as const;

interface CardProps {
  tone?: keyof typeof TONES;
  title?: ComponentChildren;
  /** Buttons or links under the body, right-aligned. */
  actions?: ComponentChildren;
  /** Extra classes on the card, e.g. width or margins. */
  class?: string;
  /** Alias of `class`, for React-style callers. */
  className?: string;
  /** Extra classes on the body, e.g. `items-center text-center`. */
  bodyClass?: string;
  children?: ComponentChildren;
}

export function Card(
  {
    tone = "raised",
    title,
    actions,
    class: extra,
    className,
    bodyClass,
    children,
  }: CardProps,
) {
  return (
    <div
      class={["card", TONES[tone], extra, className].filter(Boolean).join(" ")}
    >
      <div class={["card-body", bodyClass].filter(Boolean).join(" ")}>
        {title && <h2 class="card-title">{title}</h2>}
        {children}
        {actions && <div class="card-actions justify-end">{actions}</div>}
      </div>
    </div>
  );
}
