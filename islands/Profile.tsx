import { useEffect, useState } from "preact/hooks";
import { User } from "../lib/user_store.ts";
import { SessionData } from "../routes/_middleware.ts";
import { Streak } from "../lib/streak_store.ts";
import dayjs from "npm:dayjs";

interface Props {
  user: User;
  streak?: Streak;
  session?: SessionData;
}

export default function Profile(props: Props) {
  const { user, session, streak } = props;
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
      console.log(data);
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

  return (
    <div class="bg-gray-100 min-h-screen flex items-center justify-center">
      <div class="card w-full max-w-3xl bg-white shadow-xl rounded-xl p-6">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <div class="flex flex-col items-center">
            {session && (
              <div class="avatar">
                <div class="w-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
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
              <div class="stat bg-blue-100 p-4 rounded-lg">
                <div class="stat-title text-gray-600">Questions Answered</div>
                <div class="stat-value text-blue-700">
                  {user.stats.questions_answered} 📖
                </div>
              </div>
              <div class="stat bg-green-100 p-4 rounded-lg">
                <div class="stat-title text-gray-600">Correct Answers</div>
                <div class="stat-value text-green-700">
                  {user.stats.questions_correct} ✅
                </div>
              </div>
              <div class="stat bg-yellow-100 p-4 rounded-lg">
                <div class="stat-title text-gray-600">Accuracy</div>
                <div class="stat-value text-yellow-700">
                  {accuracy}% 🎯
                </div>
              </div>
              <div class="stat bg-purple-100 p-4 rounded-lg">
                <div class="stat-title text-gray-600">Streak</div>
                <div class="stat-value text-purple-700">
                  {streakDays}
                  {streakDays > 1 && " Days 🔥"}
                  {streakDays <= 1 && " Day 🔥"}
                </div>
              </div>
              <div class="grid grid-flow-col gap-5 text-center auto-cols-max">
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
                      <span style={{ "--value": streakTimer.minutes }}></span>
                    </span>
                    min
                  </div>
                  <div>
                    <span class="countdown font-mono text-4xl">
                      <span style={{ "--value": streakTimer.seconds }}></span>
                    </span>
                    sec
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
