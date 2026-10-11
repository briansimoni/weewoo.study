import type { Scope } from "../../lib/question_store.ts";

export const SCOPE_LABELS: Record<Scope, string> = {
  emt: "EMT",
  advanced: "Advanced",
  medic: "Medic",
};

/** A labelled row of links where one option is current, e.g. a filter. */
export function SegmentedLinks<T extends string>(
  { label, options, current, href }: {
    label: string;
    options: Record<T, string>;
    current: T;
    href: (value: T) => string;
  },
) {
  return (
    <nav aria-label={label} class="flex items-center gap-2">
      <span class="font-mono text-xs uppercase tracking-wider text-base-content/60">
        {label}
      </span>
      <div class="join">
        {(Object.entries(options) as [T, string][]).map(([value, text]) => (
          <a
            key={value}
            href={href(value)}
            aria-current={value === current ? "page" : undefined}
            class={`btn join-item btn-sm ${
              value === current
                ? "btn-primary"
                : "border-base-300 bg-base-100 font-normal"
            }`}
          >
            {text}
          </a>
        ))}
      </div>
    </nav>
  );
}

/** Links that switch a page between the three question banks. */
export function ScopeTabs(
  { path, current }: {
    /** The page to link to; `?scope=` is added. */
    path: string;
    current: Scope;
  },
) {
  return (
    <SegmentedLinks
      label="Question bank"
      options={SCOPE_LABELS}
      current={current}
      href={(scope) => `${path}?scope=${scope}`}
    />
  );
}
