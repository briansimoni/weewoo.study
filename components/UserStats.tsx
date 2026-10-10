import type { UserStats as Stats } from "../lib/user_store.ts";
import { Stat, StatGrid } from "./ui/Stat.tsx";

/** The four headline stats on a user's profile, own or public. */
export function UserStats(
  { stats, streakDays }: { stats: Stats; streakDays: number },
) {
  const accuracy = stats.questions_answered
    ? Math.round((stats.questions_correct / stats.questions_answered) * 100)
    : 0;
  return (
    <StatGrid>
      <Stat
        title="Questions Answered"
        value={`${stats.questions_answered} 📖`}
        tone="primary"
      />
      <Stat
        title="Correct Answers"
        value={`${stats.questions_correct} ✅`}
        tone="success"
      />
      <Stat title="Accuracy" value={`${accuracy}% 🎯`} tone="accent" />
      <Stat
        title="Streak"
        value={`${streakDays} ${streakDays === 1 ? "Day" : "Days"} 🔥`}
        tone="secondary"
      />
    </StatGrid>
  );
}
