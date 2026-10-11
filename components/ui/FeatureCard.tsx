import type { ComponentChildren } from "preact";
import { Card } from "./Card.tsx";

// Full class names only (see Button.tsx).
const TONES = {
  primary: "bg-primary/15 text-primary",
  secondary: "bg-secondary/15 text-secondary",
  accent: "bg-accent/15 text-accent",
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
} as const;

interface FeatureCardProps {
  /** An icon, e.g. `<Gift class="size-5" />`; it's decorative. */
  icon: ComponentChildren;
  title: ComponentChildren;
  /** The color of the icon tile. */
  tone?: keyof typeof TONES;
  /** Extra classes on the card. */
  class?: string;
  /** Alias of `class`, for React-style callers. */
  className?: string;
  children?: ComponentChildren;
}

/** A selling point: an icon tile, a title and a sentence or two. */
export function FeatureCard(
  { icon, title, tone = "primary", class: extra, className, children }:
    FeatureCardProps,
) {
  return (
    <Card class={extra} className={className} bodyClass="gap-3">
      <span
        class={`inline-flex size-11 items-center justify-center rounded-field ${
          TONES[tone]
        }`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <h3 class="card-title text-xl">{title}</h3>
      <div class="text-base-content/70">{children}</div>
    </Card>
  );
}
