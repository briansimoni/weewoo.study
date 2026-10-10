// React-typed API contract for the components in ../entry.ts, shipped as the
// package's .d.ts (the app's own sources are typed against Preact). Keep in
// step with components/ui/*.tsx: a prop added there belongs here too.
import type * as React from "react";

type Tone =
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "warning"
  | "error";

/** Extra classes. Both spellings work and are merged. */
interface ClassProps {
  /** Extra classes, e.g. margins (Preact spelling). */
  class?: string;
  /** Alias of `class`. */
  className?: string;
}

export interface ButtonStyle extends ClassProps {
  /** DaisyUI button style. Default "primary" (hi-vis lime fill). */
  variant?:
    | "primary"
    | "secondary"
    | "accent"
    | "success"
    | "warning"
    | "error"
    | "outline"
    | "ghost"
    | "neutral";
  /** Default "md". */
  size?: "xs" | "sm" | "md" | "lg";
  /** "circle"/"square" for icon-only buttons; "wide"/"block" for width. */
  shape?: "default" | "circle" | "square" | "wide" | "block";
}

export interface ButtonProps
  extends
    ButtonStyle,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  // Native attributes, declared explicitly: the converter drops inherited
  // HTML attributes from the contract it ships.
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** Default "button" (not the browser's "submit"). */
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  /** Required for icon-only buttons (shape "circle"/"square"). */
  "aria-label"?: string;
  title?: string;
  name?: string;
  value?: string;
  children?: React.ReactNode;
}

/** A button. Defaults to type="button" and the primary (lime) style. */
export declare function Button(props: ButtonProps): React.JSX.Element;

export interface LinkButtonProps
  extends
    ButtonStyle,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className"> {
  href: string;
  // Native attributes, declared explicitly (see ButtonProps).
  target?: string;
  rel?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  "aria-label"?: string;
  "aria-current"?: "page" | "step" | "location" | "date" | "time" | "true";
  children?: React.ReactNode;
}

/** A link styled as a button. */
export declare function LinkButton(props: LinkButtonProps): React.JSX.Element;

/** The class string a Button would get, for styling other elements alike. */
export declare function buttonClass(style: ButtonStyle): string;

export interface CardProps extends ClassProps {
  /** "raised" (default): the content surface. "muted": an inset panel. */
  tone?: "raised" | "muted";
  title?: React.ReactNode;
  /** Buttons or links under the body, right-aligned. */
  actions?: React.ReactNode;
  /** Extra classes on the body, e.g. "items-center text-center". */
  bodyClass?: string;
  children?: React.ReactNode;
}

/** A card: the standard content surface, one step above the page. */
export declare function Card(props: CardProps): React.JSX.Element;

export interface StatProps {
  title: React.ReactNode;
  value: React.ReactNode;
  /** Small text under the value. */
  description?: React.ReactNode;
  tone?: "default" | Tone;
}

/** A labelled number, e.g. "Accuracy 87%". Use inside a StatGrid. */
export declare function Stat(props: StatProps): React.JSX.Element;

export interface StatGridProps extends ClassProps {
  children?: React.ReactNode;
}

/** Two stats per row from the smallest screens up. */
export declare function StatGrid(props: StatGridProps): React.JSX.Element;

export interface AvatarProps {
  name: string;
  /** Image URL; without one, the avatar shows the name's first letter. */
  src?: string;
  /** Default "lg". */
  size?: "sm" | "md" | "lg";
  /** A primary-colored ring, for the signed-in user's own avatar. */
  ring?: boolean;
}

/** A round user avatar: photo, or initial on a neutral circle. */
export declare function Avatar(props: AvatarProps): React.JSX.Element;

export interface AlertProps extends ClassProps {
  /** Default "info". Errors get role="alert", others role="status". */
  tone?: "info" | "success" | "warning" | "error";
  children?: React.ReactNode;
}

/** An inline message with a tone icon, e.g. a form's success or error. */
export declare function Alert(props: AlertProps): React.JSX.Element;

export interface BadgeProps extends ClassProps {
  tone?:
    | "neutral"
    | "primary"
    | "secondary"
    | "accent"
    | "info"
    | "success"
    | "warning"
    | "error"
    | "outline"
    | "ghost";
  size?: "xs" | "sm" | "md" | "lg";
  "data-testid"?: string;
  children?: React.ReactNode;
}

/** A small label, e.g. a status or category. */
export declare function Badge(props: BadgeProps): React.JSX.Element;

export interface CountBadgeProps {
  count: number;
  /** Counts above this show as "<max>+". Default 99. */
  max?: number;
  "data-testid"?: string;
}

/**
 * A count pinned to the top-right corner of an icon button. The parent needs
 * the DaisyUI `indicator` class (e.g. `<a class="btn btn-ghost btn-circle
 * indicator">`).
 */
export declare function CountBadge(props: CountBadgeProps): React.JSX.Element;

export interface ProgressBarProps extends ClassProps {
  /** Omit for an indeterminate (busy) bar. */
  value?: number;
  /** Default 100. */
  max?: number;
  /** Default "primary". */
  tone?: "neutral" | Tone;
  /** What's progressing, for screen readers, e.g. "Daily goal". */
  label: string;
}

/** A progress bar, e.g. lesson progress or a daily goal. */
export declare function ProgressBar(props: ProgressBarProps): React.JSX.Element;

export interface ModalProps extends ClassProps {
  open: boolean;
  /** Called when the modal closes itself: Escape, or a click outside. */
  onClose: () => void;
  title?: React.ReactNode;
  /** Buttons along the bottom, right-aligned. */
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

/** A modal dialog on the native <dialog> (focus, Escape and backdrop). */
export declare function Modal(props: ModalProps): React.JSX.Element;
