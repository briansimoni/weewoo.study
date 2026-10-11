// Full class names only (see components/ui/Button.tsx).
const TONES = {
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
} as const;

export interface Readout {
  label: string;
  value: string;
  description: string;
  tone: keyof typeof TONES;
}

/**
 * Numbers styled as a patient monitor. The screen stays Night Shift in both
 * themes, like a real monitor.
 */
export function VitalsMonitor(
  { title, status, readouts }: {
    title: string;
    /** Next to the green status light, e.g. "Stable". */
    status: string;
    readouts: Readout[];
  },
) {
  return (
    <section
      data-theme="nightshift"
      aria-label={title}
      class="rounded-box border border-base-300 overflow-hidden text-base-content"
    >
      <div class="bg-black/25">
        <div class="flex items-center justify-between gap-3 border-b border-base-300 px-5 py-3 font-mono text-xs">
          <h2 class="font-mono font-semibold uppercase tracking-widest text-base-content/60">
            {title}
          </h2>
          <span class="inline-flex items-center gap-2 text-success">
            <span class="size-2 rounded-full bg-success" aria-hidden="true">
            </span>
            {status}
          </span>
        </div>
        <dl class="grid sm:grid-cols-3">
          {readouts.map(({ label, value, description, tone }) => (
            <div
              key={label}
              class="flex flex-col gap-1 border-base-300/60 px-6 py-5 not-last:border-b sm:not-last:border-b-0 sm:not-last:border-r"
            >
              <dt
                class={`font-mono text-xs font-semibold uppercase tracking-wider ${
                  TONES[tone]
                }`}
              >
                {label}
              </dt>
              <dd
                class={`font-mono text-5xl font-semibold leading-tight ${
                  TONES[tone]
                }`}
              >
                {value}
              </dd>
              <dd class="text-sm text-base-content/60">{description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
