// Full class names only (see Button.tsx).
const SIZES = {
  sm: { box: "w-10", text: "text-base" },
  md: { box: "w-16", text: "text-xl" },
  lg: { box: "w-24", text: "text-3xl" },
} as const;

interface AvatarProps {
  name: string;
  /** Image URL; without one, the avatar shows the name's first letter. */
  src?: string;
  size?: keyof typeof SIZES;
  /** A primary-colored ring, for the signed-in user's own avatar. */
  ring?: boolean;
}

export function Avatar({ name, src, size = "lg", ring }: AvatarProps) {
  const { box, text } = SIZES[size];
  const ringClass = ring
    ? "ring-2 ring-primary ring-offset-2 ring-offset-base-100"
    : "";
  if (src) {
    return (
      <div class="avatar">
        <div class={`${box} rounded-full ${ringClass}`}>
          <img src={src} alt={name} />
        </div>
      </div>
    );
  }
  return (
    <div class="avatar avatar-placeholder">
      <div
        class={`${box} rounded-full bg-neutral text-neutral-content ${ringClass}`}
      >
        <span class={text} aria-hidden="true">
          {name.trim()[0]?.toUpperCase() ?? "?"}
        </span>
        <span class="sr-only">{name}</span>
      </div>
    </div>
  );
}
