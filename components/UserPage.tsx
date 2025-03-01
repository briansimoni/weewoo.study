import { Streak } from "../lib/streak_store.ts";
import { User } from "../lib/user_store.ts";

interface Props {
  user: User;
  streak?: Streak;
}

// The page that you see when you inspect a user other than yourself
export default function (props: Props) {
  const { user, streak } = props;
  let accuracy = user.stats.questions_correct / user.stats.questions_answered;
  if (isNaN(accuracy)) {
    accuracy = 0;
  }
  accuracy = Math.round(accuracy * 100);
  return (
    <div class="bg-gray-100 min-h-screen flex items-center justify-center">
      <div class="card w-full max-w-3xl bg-white shadow-xl rounded-xl p-6">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <div class="flex flex-col items-center">
            <div className="avatar placeholder">
              <div className="bg-neutral text-neutral-content w-24 rounded-full">
                <span className="text-3xl">{user.display_name[0]}</span>
              </div>
            </div>
          </div>

          <div class="flex-1">
            <h2 class="text-2xl font-bold mb-4">{user.display_name}</h2>
            <div class="grid grid-cols-2 gap-4">
              <div class="stat bg-blue-100 p-4 rounded-lg">
                <div class="stat-title text-gray-600">Questions Answered</div>
                <div class="stat-value text-blue-700">
                  {props.user.stats.questions_answered} 📖
                </div>
              </div>
              <div class="stat bg-green-100 p-4 rounded-lg">
                <div class="stat-title text-gray-600">Correct Answers</div>
                <div class="stat-value text-green-700">
                  {props.user.stats.questions_correct} ✅
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
                  {streak?.days ?? 0} Days 🔥
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
