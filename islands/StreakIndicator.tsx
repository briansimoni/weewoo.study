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

  return (
    <div className="btn btn-ghost btn-circle relative">
      <span className="text-lg">🔥</span>
      <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
        {streakDays.value > 99 ? "99+" : streakDays.value}
      </div>
    </div>
  );
}
