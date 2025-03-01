import { useEffect } from "preact/hooks";
import { signal } from "preact/signals";

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
  return <span className="text-lg">🔥 {streakDays.value}</span>;
}
