import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import { CountBadge } from "../components/ui/Badge.tsx";

export const streakDays = signal(0);

export function setDisplayedStreak(newStreak: number) {
  streakDays.value = newStreak;
}

export default function StreakDisplay(props: { initialStreak?: number }) {
  if (props.initialStreak !== undefined && streakDays.value === 0) {
    streakDays.value = props.initialStreak;
  }
  useEffect(() => {
    if (props.initialStreak !== undefined) {
      streakDays.value = props.initialStreak;
    }
  }, [props.initialStreak]);

  return (
    <a
      href="/profile"
      class="btn btn-ghost btn-circle indicator"
      aria-label={`Streak: ${streakDays.value} days`}
      data-testid="streak-indicator"
    >
      <CountBadge count={streakDays.value} data-testid="streak-days" />
      <span class="text-lg" aria-hidden="true">🔥</span>
    </a>
  );
}
