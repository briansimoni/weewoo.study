import { useEffect, useState } from "preact/hooks";
import { User } from "../lib/user_store.ts";
import { SessionData } from "../routes/_middleware.ts";
import { Streak } from "../lib/streak_store.ts";
import { CATEGORIES } from "../lib/categories.ts";
import dayjs from "npm:dayjs";
import BasicLine from "../components/charts/BasicLine.tsx";
import { Attempt } from "../lib/attempt_store.ts";

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
  const [timerColor, setTimerColor] = useState<string | undefined>();

  useEffect(() => {
    let interval: number | undefined;
    function updateTimer() {
      const hours = dayjs(streak?.expires_on).diff(dayjs(), "hours");
      const minutes = dayjs(streak?.expires_on).diff(dayjs(), "minutes") % 60;
      const seconds = dayjs(streak?.expires_on).diff(dayjs(), "seconds") % 60;
      setStreakTimer({ hours, minutes, seconds });
      if (hours > 24) {
        setTimerColor("green");
      }
      if (hours <= 24 && hours > 1) {
        setTimerColor("orange");
      }
      if (hours <= 1) {
        setTimerColor("red");
      }
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

  let accuracy = user.stats.questions_correct / user.stats.questions_answered;
  if (isNaN(accuracy)) {
    accuracy = 0;
  }
  accuracy = Math.round(accuracy * 100);
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
      <div class="card card-bordered w-full max-w-3xl shadow-xl rounded-xl p-6 bg-base-100 mb-6">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <div class="flex flex-col items-center">
            {session && (
              <div class="avatar">
                <div class="w-32 rounded-full ring-3 ring-primary ring-offset-base-100 ring-offset-2">
                  <img
                    src={session.picture ?? "placeholder-image-url"}
                    alt="Profile Image"
                  />
                </div>
              </div>
            )}

            {!session && (
              <div class="avatar placeholder">
                <div class="bg-neutral text-neutral-content w-24 rounded-full">
                  <span class="text-3xl">{name[0]}</span>
                </div>
              </div>
            )}

            {!editing
              ? (
                <button
                  type="button"
                  class="btn btn-primary mt-4"
                  onClick={() => setEditing(true)}
                >
                  Edit Display Name
                </button>
              )
              : (
                <div class="flex gap-2 mt-4">
                  <button
                    type="button"
                    class="btn btn-success"
                    onClick={handleSave}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary"
                    onClick={() => {
                      setName(user.display_name);
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
          </div>

          <div class="flex-1">
            {editing
              ? (
                <input
                  class="input input-bordered text-2xl font-bold mb-4 w-full"
                  value={name}
                  onInput={(e) => setName(e.currentTarget.value)}
                />
              )
              : <h2 class="text-2xl font-bold mb-4">{name}</h2>}
            <div class="grid grid-cols-2 gap-4">
              <div class="stat bg-base-200 p-4 rounded-lg">
                <div class="stat-title">Questions Answered</div>
                <div class="stat-value text-primary">
                  {user.stats.questions_answered} 📖
                </div>
              </div>
              <div class="stat bg-base-200 p-4 rounded-lg">
                <div class="stat-title">Correct Answers</div>
                <div class="stat-value text-success">
                  {user.stats.questions_correct} ✅
                </div>
              </div>
              <div class="stat bg-base-200 p-4 rounded-lg">
                <div class="stat-title">Accuracy</div>
                <div class="stat-value text-accent">
                  {accuracy}% 🎯
                </div>
              </div>
              <div class="stat bg-base-200 p-4 rounded-lg">
                <div class="stat-title">Streak</div>
                <div class="stat-value text-secondary">
                  {streakDays}
                  {streakDays > 1 && " Days 🔥"}
                  {streakDays <= 1 && " Day 🔥"}
                </div>
              </div>
              {streak &&
                (
                  <div class="col-span-2 flex flex-col md:flex-row items-center gap-5 text-center">
                    <h2 class="text-2xl font-semibold content-center">
                      Streak Expires In
                    </h2>
                    <div
                      class="flex gap-5"
                      style={{ color: timerColor }}
                    >
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
        </div>
      </div>

      <div class="card card-bordered w-full max-w-3xl shadow-xl rounded-xl p-6 bg-base-100 mb-6">
        <BasicLine attempts={attempts} />
      </div>
      {/* Category Stats Section */}
      {categoriesWithStats.length > 0 && (
        <div class="card card-bordered w-full max-w-3xl shadow-xl rounded-xl p-6 bg-base-100">
          <h3 class="text-xl font-semibold mb-4">Performance by Category</h3>
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
        </div>
      )}

      <div>
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Attempt ID</th>
                <th>Question ID</th>
                <th>Correct</th>
                <th>Response Time (ms)</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => {
                return (
                  <tr key={attempt.attempt_id}>
                    <td>{attempt.attempt_id}</td>
                    <td>{attempt.question_id}</td>
                    <td>
                      <div
                        class={`badge ${
                          attempt.is_correct ? "badge-success" : "badge-error"
                        }`}
                      >
                        {attempt.is_correct ? "Yes" : "No"}
                      </div>
                    </td>
                    <td>{attempt.response_time_ms}</td>
                    <td>{attempt.category}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
