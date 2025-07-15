import { Handlers, PageProps } from "$fresh/server.ts";
import { User, UserStore } from "../../lib/user_store.ts";
import { AlertTriangle, ArrowLeft, RotateCcw, Users } from "lucide-preact";

interface UserManagementData {
  users: User[];
  leaderboard: Array<
    { user_id: string; display_name: string; questions_correct: number }
  >;
}

export const handler: Handlers<UserManagementData> = {
  async GET(_req, ctx) {
    const userStore = await UserStore.make();

    try {
      const [users, leaderboard] = await Promise.all([
        userStore.listUsers(),
        userStore.listLeaderbaord(),
      ]);

      return ctx.render({ users, leaderboard });
    } catch (error) {
      console.error("Error loading user data:", error);
      return ctx.render({ users: [], leaderboard: [] });
    }
  },

  async POST(req, _ctx) {
    const formData = await req.formData();
    const action = formData.get("action")?.toString();
    const userId = formData.get("userId")?.toString();

    if (!action || !userId) {
      return new Response("Missing required fields", { status: 400 });
    }

    const userStore = await UserStore.make();

    try {
      if (action === "reset_stats") {
        await userStore.updateUser({
          user_id: userId,
          stats: {
            questions_answered: 0,
            questions_correct: 0,
          },
        });

        return new Response("", {
          status: 303,
          headers: { Location: "/admin/users" },
        });
      }

      return new Response("Invalid action", { status: 400 });
    } catch (error) {
      console.error("Error updating user:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

export default function UserManagement(
  { data }: PageProps<UserManagementData>,
) {
  const { users, leaderboard } = data;

  // Create a map for quick leaderboard position lookup
  const leaderboardPositions = new Map();
  leaderboard.forEach((entry, index) => {
    leaderboardPositions.set(entry.user_id, index + 1);
  });

  return (
    <div class="bg-base-100 min-h-screen">
      <header class="bg-primary text-primary-content shadow-md py-4">
        <div class="container mx-auto px-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <Users className="w-6 h-6" />
              <h1 class="text-xl font-bold">User Management</h1>
            </div>
            <a href="/admin" class="btn btn-ghost btn-sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Admin
            </a>
          </div>
        </div>
      </header>

      <div class="container mx-auto p-4 max-w-7xl">
        <div class="flex flex-col items-center mb-8 mt-4">
          <h1 class="text-3xl font-bold mb-2">User Management</h1>
          <p class="text-base-content/70">
            View and manage user accounts and statistics
          </p>
        </div>

        {/* Statistics Summary */}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div class="stat bg-base-200 rounded-lg">
            <div class="stat-title">Total Users</div>
            <div class="stat-value text-primary">{users.length}</div>
          </div>
          <div class="stat bg-base-200 rounded-lg">
            <div class="stat-title">Active Users</div>
            <div class="stat-value text-secondary">
              {users.filter((u) => u.stats.questions_answered > 0).length}
            </div>
          </div>
          <div class="stat bg-base-200 rounded-lg">
            <div class="stat-title">Total Questions Answered</div>
            <div class="stat-value text-accent">
              {users.reduce((sum, u) => sum + u.stats.questions_answered, 0)}
            </div>
          </div>
        </div>

        {/* User Table */}
        <div class="card bg-base-200 shadow-lg">
          <div class="card-body">
            <h2 class="card-title mb-4">All Users</h2>

            <div class="overflow-x-auto">
              <table class="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Display Name</th>
                    <th>User ID</th>
                    <th>Questions Answered</th>
                    <th>Questions Correct</th>
                    <th>Accuracy</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .sort((a, b) =>
                      b.stats.questions_correct - a.stats.questions_correct
                    )
                    .map((user) => {
                      const accuracy = user.stats.questions_answered > 0
                        ? Math.round(
                          (user.stats.questions_correct /
                            user.stats.questions_answered) * 100,
                        )
                        : 0;
                      const rank = leaderboardPositions.get(user.user_id) ||
                        "-";

                      return (
                        <tr key={user.user_id}>
                          <td>
                            <div class="badge badge-outline">
                              {rank}
                            </div>
                          </td>
                          <td class="font-medium">{user.display_name}</td>
                          <td class="font-mono text-sm text-base-content/70">
                            {user.user_id}
                          </td>
                          <td>{user.stats.questions_answered}</td>
                          <td>{user.stats.questions_correct}</td>
                          <td>
                            <div class="flex items-center gap-2">
                              <span>{accuracy}%</span>
                              <progress
                                class="progress progress-primary w-16 h-2"
                                value={accuracy}
                                max="100"
                              >
                              </progress>
                            </div>
                          </td>
                          <td class="text-sm text-base-content/70">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            <div class="flex gap-2">
                              <form method="POST" class="inline">
                                <input
                                  type="hidden"
                                  name="action"
                                  value="reset_stats"
                                />
                                <input
                                  type="hidden"
                                  name="userId"
                                  value={user.user_id}
                                />
                                <button
                                  type="submit"
                                  class="btn btn-warning btn-xs"
                                  disabled={user.stats.questions_answered === 0}
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  Reset Stats
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div class="text-center py-8">
                <AlertTriangle className="w-12 h-12 mx-auto text-base-content/50 mb-4" />
                <p class="text-base-content/70">No users found</p>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard Preview */}
        <div class="card bg-base-200 shadow-lg mt-8">
          <div class="card-body">
            <h2 class="card-title mb-4">Current Leaderboard (Top 10)</h2>

            <div class="overflow-x-auto">
              <table class="table w-full">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Display Name</th>
                    <th>Questions Correct</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.slice(0, 10).map((entry, index) => (
                    <tr key={entry.user_id}>
                      <td>
                        <div
                          class={`badge ${
                            index === 0
                              ? "badge-warning"
                              : index === 1
                              ? "badge-info"
                              : index === 2
                              ? "badge-accent"
                              : "badge-outline"
                          }`}
                        >
                          #{index + 1}
                        </div>
                      </td>
                      <td class="font-medium">{entry.display_name}</td>
                      <td>{entry.questions_correct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {leaderboard.length === 0 && (
              <div class="text-center py-8">
                <p class="text-base-content/70">No leaderboard entries yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
