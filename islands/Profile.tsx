import { useEffect, useState } from "preact/hooks";
import type { User } from "../lib/user_store.ts";
import type { SessionData } from "../routes/_middleware.ts";
import type { Streak } from "../lib/streak_store.ts";
import { CATEGORIES } from "../lib/categories.ts";
// Not dayjs: islands can't load it under the dev server (see lib/dates.ts).
import { timeUntil } from "../lib/dates.ts";
import BasicLine from "../components/charts/BasicLine.tsx";
import type { Attempt } from "../lib/attempt_store.ts";
import { UserStats } from "../components/UserStats.tsx";
import { Avatar } from "../components/ui/Avatar.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Card } from "../components/ui/Card.tsx";

interface Props {
  user: User;
  streak?: Streak;
  session?: SessionData;
  attempts: Attempt[];
}

export default function Profile(props: Props) {
  const { user, session, streak, attempts } = props;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.display_name);
  const [streakTimer, setStreakTimer] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [timerTone, setTimerTone] = useState("");

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    function updateTimer() {
      const { hours, minutes, seconds } = timeUntil(
        new Date(streak!.expires_on),
      );
      setStreakTimer({ hours, minutes, seconds });
      setTimerTone(
        hours > 24 ? "text-success" : hours > 1 ? "text-warning" : "text-error",
      );
    }
    if (streak) {
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }

    return () => {
      clearInterval(interval);
    };
  }, [streak]);

  const handleSave = () => {
    async function updateUser() {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          display_name: name,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      setName(data.display_name);
    }
    updateUser();
    setEditing(false);
  };

  const streakDays = streak?.days ?? 0;

  // Calculate category stats for display, including all available categories
  const categoriesWithStats = CATEGORIES.map((category) => {
    // Get existing stats for this category if available
    const existingStats = user.stats.categories?.[category];

    return {
      category,
      stats: existingStats || { questions_answered: 0, questions_correct: 0 },
      accuracy: existingStats
        ? Math.round(
          (existingStats.questions_correct / existingStats.questions_answered) *
            100,
        ) || 0
        : 0,
      hasData: !!existingStats && existingStats.questions_answered > 0,
    };
  });

  // Sort: first categories with data (by number of questions), then alphabetically
  categoriesWithStats.sort((a, b) => {
    // First sort by whether they have data
    if (a.hasData && !b.hasData) return -1;
    if (!a.hasData && b.hasData) return 1;

    // If both have data, sort by questions answered
    if (a.hasData && b.hasData) {
      return b.stats.questions_answered - a.stats.questions_answered;
    }

    // If neither has data, sort alphabetically
    return a.category.localeCompare(b.category);
  });

  return (
    <div class="flex flex-col items-center justify-center">
      <Card class="w-full max-w-3xl mb-6">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <div class="flex flex-col items-center">
            <Avatar name={name} src={session?.picture} ring={!!session} />

            {!editing
              ? (
                <Button class="mt-4" onClick={() => setEditing(true)}>
                  Edit Display Name
                </Button>
              )
              : (
                <div class="flex gap-2 mt-4">
                  <Button variant="success" onClick={handleSave}>
                    Save
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setName(user.display_name);
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
          </div>

          <div class="flex-1 min-w-0 w-full">
            {editing
              ? (
                <input
                  class="input input-bordered text-2xl font-bold mb-4 w-full"
                  value={name}
                  onInput={(e) => setName(e.currentTarget.value)}
                />
              )
              : <h2 class="text-2xl font-bold mb-4">{name}</h2>}
            <UserStats stats={user.stats} streakDays={streakDays} />
            {streak &&
              (
                <div class="mt-4 flex flex-col md:flex-row items-center gap-5 text-center">
                  <h2 class="text-2xl font-semibold content-center">
                    Streak Expires In
                  </h2>
                  <div class={`flex gap-5 ${timerTone}`}>
                    <div>
                      <span class="countdown font-mono text-4xl">
                        <span style={{ "--value": streakTimer.hours }}></span>
                      </span>
                      hours
                    </div>
                    <div>
                      <span class="countdown font-mono text-4xl">
                        <span style={{ "--value": streakTimer.minutes }}>
                        </span>
                      </span>
                      min
                    </div>
                    <div>
                      <span class="countdown font-mono text-4xl">
                        <span style={{ "--value": streakTimer.seconds }}>
                        </span>
                      </span>
                      sec
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </Card>

      <Card class="w-full max-w-3xl mb-6">
        <BasicLine attempts={attempts} />
      </Card>
      {/* Category Stats Section */}
      {categoriesWithStats.length > 0 && (
        <Card class="w-full max-w-3xl" title="Performance by Category">
          <div class="overflow-x-auto">
            <table class="table table-compact w-full">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Questions</th>
                  <th>Correct</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {categoriesWithStats.map((
                  { category, stats, accuracy, hasData },
                ) => (
                  <tr key={category} class={hasData ? "" : "opacity-60"}>
                    <td class="font-medium">{category}</td>
                    <td>{stats.questions_answered}</td>
                    <td>{stats.questions_correct}</td>
                    <td
                      class={!hasData
                        ? "text-base-content"
                        : accuracy >= 70
                        ? "text-success"
                        : accuracy >= 50
                        ? "text-warning"
                        : "text-error"}
                    >
                      {accuracy}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
